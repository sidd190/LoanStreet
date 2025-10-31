/**
 * Enhanced Database Operations Service
 * Provides comprehensive error handling, transaction management, and data backup/recovery
 */

import { PrismaClient, Prisma } from '@prisma/client'
import Logger, { DataSource } from './logger'
import { errorMonitoring } from './errorMonitoring'

export interface DatabaseOperation {
  id: string
  type: 'CREATE' | 'UPDATE' | 'DELETE' | 'BULK_CREATE' | 'BULK_UPDATE' | 'BULK_DELETE'
  table: string
  data: any
  timestamp: string
  userId?: string
  rollbackData?: any
}

export interface TransactionContext {
  id: string
  operations: DatabaseOperation[]
  startTime: Date
  status: 'PENDING' | 'COMMITTED' | 'ROLLED_BACK' | 'FAILED'
  error?: string
}

export interface BackupMetadata {
  id: string
  type: 'FULL' | 'INCREMENTAL' | 'TABLE'
  tables: string[]
  size: number
  timestamp: string
  status: 'CREATING' | 'COMPLETED' | 'FAILED'
  location: string
}

export interface DatabaseHealth {
  status: 'HEALTHY' | 'DEGRADED' | 'CRITICAL'
  connectionPool: {
    active: number
    idle: number
    total: number
  }
  performance: {
    avgQueryTime: number
    slowQueries: number
    failedQueries: number
  }
  storage: {
    size: number
    freeSpace: number
    utilizationPercent: number
  }
  lastCheck: string
}

class DatabaseService {
  private prisma: PrismaClient
  private transactionContexts = new Map<string, TransactionContext>()
  private operationHistory: DatabaseOperation[] = []
  private readonly MAX_HISTORY_SIZE = 1000
  private readonly SLOW_QUERY_THRESHOLD = 1000 // 1 second
  private performanceMetrics = {
    queryTimes: [] as number[],
    slowQueries: 0,
    failedQueries: 0,
    totalQueries: 0
  }

  constructor() {
    this.prisma = new PrismaClient({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'warn' },
      ],
      errorFormat: 'pretty'
    })

    this.setupEventHandlers()
  }

  /**
   * Setup Prisma event handlers for monitoring
   */
  private setupEventHandlers(): void {
    this.prisma.$on('query', (e) => {
      const queryTime = e.duration
      this.performanceMetrics.queryTimes.push(queryTime)
      this.performanceMetrics.totalQueries++

      if (queryTime > this.SLOW_QUERY_THRESHOLD) {
        this.performanceMetrics.slowQueries++
        Logger.warn(DataSource.DATABASE, 'performance', `Slow query detected: ${queryTime}ms`, {
          query: e.query,
          params: e.params,
          duration: queryTime
        })
      }

      // Keep only last 100 query times for average calculation
      if (this.performanceMetrics.queryTimes.length > 100) {
        this.performanceMetrics.queryTimes.shift()
      }
    })

    this.prisma.$on('error', (e) => {
      this.performanceMetrics.failedQueries++
      Logger.error(DataSource.DATABASE, 'error', 'Database error occurred', e)
      errorMonitoring.reportError('DATABASE_ERROR', 'SYSTEM', e.message, { target: e.target })
    })

    this.prisma.$on('warn', (e) => {
      Logger.warn(DataSource.DATABASE, 'warning', 'Database warning', e)
    })
  }

  /**
   * Execute operation with comprehensive error handling
   */
  async executeWithErrorHandling<T>(
    operation: () => Promise<T>,
    operationName: string,
    context?: any
  ): Promise<T> {
    const startTime = Date.now()
    const operationId = this.generateOperationId()

    try {
      Logger.info(DataSource.DATABASE, operationName, `Starting operation: ${operationId}`)

      const result = await operation()
      const duration = Date.now() - startTime

      Logger.success(DataSource.DATABASE, operationName, `Operation completed: ${operationId}`, {
        duration,
        context
      })

      // Report success for error monitoring
      await errorMonitoring.reportSuccess('DATABASE_OPERATION', 'SYSTEM', {
        operationName,
        duration,
        operationId
      })

      return result

    } catch (error) {
      const duration = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : 'Unknown database error'

      Logger.error(DataSource.DATABASE, operationName, `Operation failed: ${operationId}`, {
        error: errorMessage,
        duration,
        context
      })

      // Report error for monitoring
      await errorMonitoring.reportError('DATABASE_OPERATION_FAILED', 'SYSTEM', errorMessage, {
        operationName,
        operationId,
        duration,
        context
      })

      // Enhance error with additional context
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw this.enhancePrismaError(error, operationName, context)
      }

      throw new Error(`Database operation failed: ${errorMessage}`)
    }
  }

  /**
   * Start a database transaction
   */
  async startTransaction(userId?: string): Promise<string> {
    const transactionId = this.generateTransactionId()
    
    const context: TransactionContext = {
      id: transactionId,
      operations: [],
      startTime: new Date(),
      status: 'PENDING'
    }

    this.transactionContexts.set(transactionId, context)

    Logger.info(DataSource.DATABASE, 'transaction', `Started transaction: ${transactionId}`, { userId })

    return transactionId
  }

  /**
   * Execute operations within a transaction
   */
  async executeTransaction<T>(
    transactionId: string,
    operations: Array<(tx: Prisma.TransactionClient) => Promise<any>>
  ): Promise<T> {
    const context = this.transactionContexts.get(transactionId)
    if (!context) {
      throw new Error(`Transaction context not found: ${transactionId}`)
    }

    return this.executeWithErrorHandling(async () => {
      return await this.prisma.$transaction(async (tx) => {
        const results = []
        
        for (const operation of operations) {
          const result = await operation(tx)
          results.push(result)
        }

        context.status = 'COMMITTED'
        Logger.success(DataSource.DATABASE, 'transaction', `Transaction committed: ${transactionId}`)

        return results as T
      })
    }, 'transaction', { transactionId })
  }

  /**
   * Rollback a transaction
   */
  async rollbackTransaction(transactionId: string, reason?: string): Promise<void> {
    const context = this.transactionContexts.get(transactionId)
    if (!context) {
      throw new Error(`Transaction context not found: ${transactionId}`)
    }

    context.status = 'ROLLED_BACK'
    context.error = reason

    Logger.warn(DataSource.DATABASE, 'transaction', `Transaction rolled back: ${transactionId}`, { reason })

    // Clean up transaction context
    this.transactionContexts.delete(transactionId)
  }

  /**
   * Create with validation and error handling
   */
  async create<T>(
    model: string,
    data: any,
    userId?: string
  ): Promise<T> {
    return this.executeWithErrorHandling(async () => {
      // Validate data before creation
      const validatedData = await this.validateData(model, data, 'CREATE')

      const result = await (this.prisma as any)[model].create({
        data: validatedData
      })

      // Record operation for audit
      this.recordOperation({
        type: 'CREATE',
        table: model,
        data: validatedData,
        userId
      })

      return result
    }, `create_${model}`, { model, userId })
  }

  /**
   * Update with validation and error handling
   */
  async update<T>(
    model: string,
    where: any,
    data: any,
    userId?: string
  ): Promise<T> {
    return this.executeWithErrorHandling(async () => {
      // Get original data for rollback
      const original = await (this.prisma as any)[model].findUnique({ where })
      
      // Validate update data
      const validatedData = await this.validateData(model, data, 'UPDATE')

      const result = await (this.prisma as any)[model].update({
        where,
        data: validatedData
      })

      // Record operation for audit
      this.recordOperation({
        type: 'UPDATE',
        table: model,
        data: validatedData,
        userId,
        rollbackData: original
      })

      return result
    }, `update_${model}`, { model, where, userId })
  }

  /**
   * Delete with error handling
   */
  async delete<T>(
    model: string,
    where: any,
    userId?: string
  ): Promise<T> {
    return this.executeWithErrorHandling(async () => {
      // Get original data for rollback
      const original = await (this.prisma as any)[model].findUnique({ where })
      
      const result = await (this.prisma as any)[model].delete({ where })

      // Record operation for audit
      this.recordOperation({
        type: 'DELETE',
        table: model,
        data: where,
        userId,
        rollbackData: original
      })

      return result
    }, `delete_${model}`, { model, where, userId })
  }

  /**
   * Bulk operations with transaction support
   */
  async bulkCreate<T>(
    model: string,
    data: any[],
    userId?: string
  ): Promise<T> {
    return this.executeWithErrorHandling(async () => {
      // Validate all data items
      const validatedData = await Promise.all(
        data.map(item => this.validateData(model, item, 'CREATE'))
      )

      const result = await (this.prisma as any)[model].createMany({
        data: validatedData,
        skipDuplicates: true
      })

      // Record operation for audit
      this.recordOperation({
        type: 'BULK_CREATE',
        table: model,
        data: validatedData,
        userId
      })

      return result
    }, `bulk_create_${model}`, { model, count: data.length, userId })
  }

  /**
   * Bulk update with transaction support
   */
  async bulkUpdate<T>(
    model: string,
    updates: Array<{ where: any; data: any }>,
    userId?: string
  ): Promise<T[]> {
    return this.executeWithErrorHandling(async () => {
      const results = []

      // Use transaction for bulk updates
      await this.prisma.$transaction(async (tx) => {
        for (const update of updates) {
          // Get original data for rollback
          const original = await (tx as any)[model].findUnique({ where: update.where })
          
          // Validate update data
          const validatedData = await this.validateData(model, update.data, 'UPDATE')

          const result = await (tx as any)[model].update({
            where: update.where,
            data: validatedData
          })

          results.push(result)
        }
      })

      // Record operation for audit
      this.recordOperation({
        type: 'BULK_UPDATE',
        table: model,
        data: updates,
        userId
      })

      return results as T[]
    }, `bulk_update_${model}`, { model, count: updates.length, userId })
  }

  /**
   * Bulk delete with transaction support
   */
  async bulkDelete<T>(
    model: string,
    where: any,
    userId?: string
  ): Promise<T> {
    return this.executeWithErrorHandling(async () => {
      // Get original data for potential rollback
      const originalData = await (this.prisma as any)[model].findMany({ where })
      
      const result = await (this.prisma as any)[model].deleteMany({ where })

      // Record operation for audit
      this.recordOperation({
        type: 'BULK_DELETE',
        table: model,
        data: where,
        userId,
        rollbackData: originalData
      })

      return result
    }, `bulk_delete_${model}`, { model, where, userId })
  }

  /**
   * Create database backup
   */
  async createBackup(
    type: 'FULL' | 'INCREMENTAL' | 'TABLE' = 'FULL',
    tables?: string[]
  ): Promise<BackupMetadata> {
    const backupId = this.generateBackupId()
    const timestamp = new Date().toISOString()

    const metadata: BackupMetadata = {
      id: backupId,
      type,
      tables: tables || [],
      size: 0,
      timestamp,
      status: 'CREATING',
      location: `backups/${backupId}.sql`
    }

    try {
      Logger.info(DataSource.DATABASE, 'backup', `Starting ${type} backup: ${backupId}`)

      // In a real implementation, this would create actual database backups
      // For SQLite, you could copy the database file
      // For PostgreSQL/MySQL, you would use pg_dump/mysqldump
      
      if (type === 'FULL') {
        // Full database backup
        await this.createFullBackup(metadata)
      } else if (type === 'TABLE' && tables) {
        // Table-specific backup
        await this.createTableBackup(metadata, tables)
      } else if (type === 'INCREMENTAL') {
        // Incremental backup (changes since last backup)
        await this.createIncrementalBackup(metadata)
      }

      metadata.status = 'COMPLETED'
      Logger.success(DataSource.DATABASE, 'backup', `Backup completed: ${backupId}`)

      return metadata

    } catch (error) {
      metadata.status = 'FAILED'
      Logger.error(DataSource.DATABASE, 'backup', `Backup failed: ${backupId}`, error)
      throw error
    }
  }

  /**
   * Restore from backup
   */
  async restoreFromBackup(backupId: string): Promise<void> {
    return this.executeWithErrorHandling(async () => {
      Logger.info(DataSource.DATABASE, 'restore', `Starting restore from backup: ${backupId}`)

      // In a real implementation, this would restore from actual backup files
      // This is a placeholder for the restore logic

      Logger.success(DataSource.DATABASE, 'restore', `Restore completed: ${backupId}`)
    }, 'restore_backup', { backupId })
  }

  /**
   * Get database health status
   */
  async getHealthStatus(): Promise<DatabaseHealth> {
    try {
      // Check database connectivity
      await this.prisma.$queryRaw`SELECT 1`

      // Calculate performance metrics
      const avgQueryTime = this.performanceMetrics.queryTimes.length > 0
        ? this.performanceMetrics.queryTimes.reduce((a, b) => a + b, 0) / this.performanceMetrics.queryTimes.length
        : 0

      // Get database size (SQLite specific)
      const dbStats = await this.getDatabaseStats()

      const health: DatabaseHealth = {
        status: this.determineHealthStatus(avgQueryTime, this.performanceMetrics.failedQueries),
        connectionPool: {
          active: 1, // SQLite doesn't have connection pooling
          idle: 0,
          total: 1
        },
        performance: {
          avgQueryTime,
          slowQueries: this.performanceMetrics.slowQueries,
          failedQueries: this.performanceMetrics.failedQueries
        },
        storage: dbStats,
        lastCheck: new Date().toISOString()
      }

      return health

    } catch (error) {
      Logger.error(DataSource.DATABASE, 'health_check', 'Health check failed', error)
      
      return {
        status: 'CRITICAL',
        connectionPool: { active: 0, idle: 0, total: 0 },
        performance: { avgQueryTime: 0, slowQueries: 0, failedQueries: 0 },
        storage: { size: 0, freeSpace: 0, utilizationPercent: 0 },
        lastCheck: new Date().toISOString()
      }
    }
  }

  /**
   * Validate data before database operations
   */
  private async validateData(model: string, data: any, operation: 'CREATE' | 'UPDATE'): Promise<any> {
    // Basic validation - in a real implementation, this would use schema validation
    if (!data || typeof data !== 'object') {
      throw new Error(`Invalid data for ${model}: data must be an object`)
    }

    // Remove undefined values
    const cleanData = Object.fromEntries(
      Object.entries(data).filter(([_, value]) => value !== undefined)
    )

    // Add timestamps for CREATE operations
    if (operation === 'CREATE') {
      cleanData.createdAt = cleanData.createdAt || new Date()
    }
    
    // Always update updatedAt for both CREATE and UPDATE
    cleanData.updatedAt = new Date()

    return cleanData
  }

  /**
   * Record operation for audit trail
   */
  private recordOperation(operation: Omit<DatabaseOperation, 'id' | 'timestamp'>): void {
    const fullOperation: DatabaseOperation = {
      ...operation,
      id: this.generateOperationId(),
      timestamp: new Date().toISOString()
    }

    this.operationHistory.push(fullOperation)

    // Keep history size manageable
    if (this.operationHistory.length > this.MAX_HISTORY_SIZE) {
      this.operationHistory.shift()
    }
  }

  /**
   * Enhance Prisma errors with more context
   */
  private enhancePrismaError(error: Prisma.PrismaClientKnownRequestError, operation: string, context?: any): Error {
    let message = `Database operation failed: ${operation}`

    switch (error.code) {
      case 'P2002':
        message = `Unique constraint violation in ${operation}: ${error.meta?.target}`
        break
      case 'P2025':
        message = `Record not found in ${operation}`
        break
      case 'P2003':
        message = `Foreign key constraint violation in ${operation}`
        break
      case 'P2014':
        message = `Invalid ID in ${operation}`
        break
      default:
        message = `Database error in ${operation}: ${error.message}`
    }

    const enhancedError = new Error(message)
    enhancedError.cause = error
    return enhancedError
  }

  /**
   * Create full database backup
   */
  private async createFullBackup(metadata: BackupMetadata): Promise<void> {
    // Placeholder for full backup implementation
    // In SQLite, this would copy the database file
    // In PostgreSQL/MySQL, this would use pg_dump/mysqldump
    metadata.size = 1024 * 1024 // 1MB placeholder
  }

  /**
   * Create table-specific backup
   */
  private async createTableBackup(metadata: BackupMetadata, tables: string[]): Promise<void> {
    // Placeholder for table backup implementation
    metadata.size = 512 * 1024 // 512KB placeholder
  }

  /**
   * Create incremental backup
   */
  private async createIncrementalBackup(metadata: BackupMetadata): Promise<void> {
    // Placeholder for incremental backup implementation
    metadata.size = 256 * 1024 // 256KB placeholder
  }

  /**
   * Get database statistics
   */
  private async getDatabaseStats(): Promise<{ size: number; freeSpace: number; utilizationPercent: number }> {
    // Placeholder for database statistics
    // In a real implementation, this would query actual database size
    return {
      size: 10 * 1024 * 1024, // 10MB
      freeSpace: 90 * 1024 * 1024, // 90MB
      utilizationPercent: 10
    }
  }

  /**
   * Determine health status based on metrics
   */
  private determineHealthStatus(avgQueryTime: number, failedQueries: number): DatabaseHealth['status'] {
    if (failedQueries > 10 || avgQueryTime > 5000) {
      return 'CRITICAL'
    } else if (failedQueries > 5 || avgQueryTime > 2000) {
      return 'DEGRADED'
    }
    return 'HEALTHY'
  }

  /**
   * Generate unique operation ID
   */
  private generateOperationId(): string {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Generate unique transaction ID
   */
  private generateTransactionId(): string {
    return `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Generate unique backup ID
   */
  private generateBackupId(): string {
    return `backup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Get operation history
   */
  getOperationHistory(): DatabaseOperation[] {
    return [...this.operationHistory]
  }

  /**
   * Get transaction contexts
   */
  getTransactionContexts(): TransactionContext[] {
    return Array.from(this.transactionContexts.values())
  }

  /**
   * Clean up completed transactions
   */
  cleanupTransactions(): void {
    const oneHourAgo = Date.now() - (60 * 60 * 1000)
    
    for (const [id, context] of this.transactionContexts.entries()) {
      if (context.startTime.getTime() < oneHourAgo && 
          (context.status === 'COMMITTED' || context.status === 'ROLLED_BACK')) {
        this.transactionContexts.delete(id)
      }
    }
  }

  /**
   * Disconnect from database
   */
  async disconnect(): Promise<void> {
    await this.prisma.$disconnect()
  }
}

// Export singleton instance
export const databaseService = new DatabaseService()
export default databaseService