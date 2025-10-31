/**
 * Data Synchronization Manager
 * Handles optimistic updates, rollback on failure, and multi-session synchronization
 */

import { webSocketEventService } from './websocket/events'
import Logger, { DataSource } from './logger'

export interface SyncOperation {
  id: string
  type: 'CREATE' | 'UPDATE' | 'DELETE' | 'BULK_UPDATE' | 'BULK_DELETE'
  entity: 'contact' | 'campaign' | 'message' | 'lead' | 'automation'
  entityId: string | string[]
  data: any
  originalData?: any
  timestamp: string
  userId?: string
  sessionId: string
}

export interface SyncState<T> {
  data: T[]
  pendingOperations: Map<string, SyncOperation>
  lastSync: string
  version: number
  conflicts: SyncConflict[]
}

export interface SyncConflict {
  operationId: string
  entityId: string
  localData: any
  remoteData: any
  timestamp: string
  resolved: boolean
}

export interface OptimisticUpdate<T> {
  id: string
  operation: SyncOperation
  rollback: () => void
  commit: () => Promise<void>
}

class DataSyncManager {
  private syncStates = new Map<string, SyncState<any>>()
  private sessionId: string
  private syncInterval: NodeJS.Timeout | null = null
  private readonly SYNC_INTERVAL = 5000 // 5 seconds
  private readonly MAX_RETRY_ATTEMPTS = 3

  constructor() {
    this.sessionId = this.generateSessionId()
    this.setupEventHandlers()
  }

  /**
   * Initialize sync state for an entity type
   */
  initializeSyncState<T>(entityType: string, initialData: T[]): void {
    this.syncStates.set(entityType, {
      data: [...initialData],
      pendingOperations: new Map(),
      lastSync: new Date().toISOString(),
      version: 1,
      conflicts: []
    })

    Logger.info(DataSource.SYNC, entityType, `Initialized sync state with ${initialData.length} items`)
  }

  /**
   * Get current data with pending operations applied
   */
  getData<T>(entityType: string): T[] {
    const state = this.syncStates.get(entityType)
    if (!state) {
      Logger.warn(DataSource.SYNC, entityType, 'Sync state not initialized')
      return []
    }

    return [...state.data]
  }

  /**
   * Perform optimistic update with rollback capability
   */
  async performOptimisticUpdate<T>(
    entityType: string,
    operation: Omit<SyncOperation, 'id' | 'timestamp' | 'sessionId'>,
    apiCall: () => Promise<T>
  ): Promise<OptimisticUpdate<T>> {
    const state = this.syncStates.get(entityType)
    if (!state) {
      throw new Error(`Sync state not initialized for ${entityType}`)
    }

    const operationId = this.generateOperationId()
    const fullOperation: SyncOperation = {
      ...operation,
      id: operationId,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId
    }

    // Store original data for rollback
    const originalData = this.captureOriginalData(state.data, operation)
    fullOperation.originalData = originalData

    // Apply optimistic update
    this.applyOptimisticUpdate(state, fullOperation)
    state.pendingOperations.set(operationId, fullOperation)

    Logger.info(DataSource.SYNC, entityType, `Applied optimistic update: ${operation.type}`)

    // Broadcast optimistic update to other sessions
    this.broadcastOptimisticUpdate(entityType, fullOperation)

    const rollback = () => {
      this.rollbackOperation(entityType, operationId)
    }

    const commit = async () => {
      try {
        const result = await apiCall()
        await this.commitOperation(entityType, operationId, result)
        return result
      } catch (error) {
        this.rollbackOperation(entityType, operationId)
        throw error
      }
    }

    return {
      id: operationId,
      operation: fullOperation,
      rollback,
      commit
    }
  }

  /**
   * Apply optimistic update to local state
   */
  private applyOptimisticUpdate(state: SyncState<any>, operation: SyncOperation): void {
    switch (operation.type) {
      case 'CREATE':
        state.data.push(operation.data)
        break

      case 'UPDATE':
        const updateIndex = state.data.findIndex((item: any) => item.id === operation.entityId)
        if (updateIndex !== -1) {
          state.data[updateIndex] = { ...state.data[updateIndex], ...operation.data }
        }
        break

      case 'DELETE':
        state.data = state.data.filter((item: any) => item.id !== operation.entityId)
        break

      case 'BULK_UPDATE':
        const ids = Array.isArray(operation.entityId) ? operation.entityId : [operation.entityId]
        state.data = state.data.map((item: any) =>
          ids.includes(item.id) ? { ...item, ...operation.data } : item
        )
        break

      case 'BULK_DELETE':
        const deleteIds = Array.isArray(operation.entityId) ? operation.entityId : [operation.entityId]
        state.data = state.data.filter((item: any) => !deleteIds.includes(item.id))
        break
    }

    state.version++
  }

  /**
   * Rollback a pending operation
   */
  private rollbackOperation(entityType: string, operationId: string): void {
    const state = this.syncStates.get(entityType)
    if (!state) return

    const operation = state.pendingOperations.get(operationId)
    if (!operation) return

    // Restore original data
    if (operation.originalData) {
      state.data = operation.originalData
    }

    state.pendingOperations.delete(operationId)
    state.version++

    Logger.warn(DataSource.SYNC, entityType, `Rolled back operation: ${operationId}`)

    // Broadcast rollback to other sessions
    this.broadcastRollback(entityType, operationId)
  }

  /**
   * Commit a successful operation
   */
  private async commitOperation(entityType: string, operationId: string, result: any): Promise<void> {
    const state = this.syncStates.get(entityType)
    if (!state) return

    const operation = state.pendingOperations.get(operationId)
    if (!operation) return

    // Update with server response if different from optimistic update
    if (result && operation.type === 'CREATE') {
      const index = state.data.findIndex((item: any) => 
        item.id === operation.data.id || item.tempId === operation.data.tempId
      )
      if (index !== -1) {
        state.data[index] = result
      }
    }

    state.pendingOperations.delete(operationId)
    state.lastSync = new Date().toISOString()

    Logger.success(DataSource.SYNC, entityType, `Committed operation: ${operationId}`)

    // Broadcast successful commit to other sessions
    this.broadcastCommit(entityType, operationId, result)
  }

  /**
   * Capture original data for rollback
   */
  private captureOriginalData(data: any[], operation: SyncOperation): any[] {
    return JSON.parse(JSON.stringify(data))
  }

  /**
   * Handle incoming sync events from other sessions
   */
  async handleRemoteSync(entityType: string, remoteOperation: SyncOperation): Promise<void> {
    const state = this.syncStates.get(entityType)
    if (!state) return

    // Skip if this is our own operation
    if (remoteOperation.sessionId === this.sessionId) return

    // Check for conflicts with pending operations
    const conflict = this.detectConflict(state, remoteOperation)
    if (conflict) {
      state.conflicts.push(conflict)
      Logger.warn(DataSource.SYNC, entityType, `Conflict detected for operation: ${remoteOperation.id}`)
      return
    }

    // Apply remote operation
    this.applyOptimisticUpdate(state, remoteOperation)
    
    Logger.info(DataSource.SYNC, entityType, `Applied remote sync: ${remoteOperation.type}`)
  }

  /**
   * Detect conflicts between local and remote operations
   */
  private detectConflict(state: SyncState<any>, remoteOperation: SyncOperation): SyncConflict | null {
    // Check if we have a pending operation on the same entity
    for (const [operationId, localOperation] of state.pendingOperations) {
      if (this.operationsConflict(localOperation, remoteOperation)) {
        return {
          operationId,
          entityId: Array.isArray(remoteOperation.entityId) 
            ? remoteOperation.entityId[0] 
            : remoteOperation.entityId,
          localData: localOperation.data,
          remoteData: remoteOperation.data,
          timestamp: remoteOperation.timestamp,
          resolved: false
        }
      }
    }

    return null
  }

  /**
   * Check if two operations conflict
   */
  private operationsConflict(local: SyncOperation, remote: SyncOperation): boolean {
    // Same entity and both are modifying operations
    const sameEntity = local.entityId === remote.entityId
    const bothModifying = ['UPDATE', 'DELETE'].includes(local.type) && 
                         ['UPDATE', 'DELETE'].includes(remote.type)
    
    return sameEntity && bothModifying
  }

  /**
   * Resolve a conflict by choosing local or remote version
   */
  async resolveConflict(
    entityType: string, 
    conflictIndex: number, 
    resolution: 'local' | 'remote'
  ): Promise<void> {
    const state = this.syncStates.get(entityType)
    if (!state || !state.conflicts[conflictIndex]) return

    const conflict = state.conflicts[conflictIndex]
    
    if (resolution === 'remote') {
      // Accept remote changes, rollback local operation
      this.rollbackOperation(entityType, conflict.operationId)
    }
    // If 'local', keep local changes (do nothing)

    conflict.resolved = true
    Logger.info(DataSource.SYNC, entityType, `Resolved conflict with ${resolution} version`)
  }

  /**
   * Start periodic synchronization
   */
  startPeriodicSync(): void {
    if (this.syncInterval) return

    this.syncInterval = setInterval(() => {
      this.performPeriodicSync()
    }, this.SYNC_INTERVAL)

    Logger.info(DataSource.SYNC, 'manager', 'Started periodic synchronization')
  }

  /**
   * Stop periodic synchronization
   */
  stopPeriodicSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
      Logger.info(DataSource.SYNC, 'manager', 'Stopped periodic synchronization')
    }
  }

  /**
   * Perform periodic sync with server
   */
  private async performPeriodicSync(): Promise<void> {
    for (const [entityType, state] of this.syncStates) {
      try {
        // Retry failed operations
        await this.retryFailedOperations(entityType)
        
        // Sync with server for latest changes
        await this.syncWithServer(entityType)
      } catch (error) {
        Logger.error(DataSource.SYNC, entityType, 'Periodic sync failed', error)
      }
    }
  }

  /**
   * Retry failed operations
   */
  private async retryFailedOperations(entityType: string): Promise<void> {
    const state = this.syncStates.get(entityType)
    if (!state) return

    const failedOperations = Array.from(state.pendingOperations.values())
      .filter(op => {
        const age = Date.now() - new Date(op.timestamp).getTime()
        return age > 10000 // Operations older than 10 seconds
      })

    for (const operation of failedOperations) {
      try {
        await this.retryOperation(entityType, operation)
      } catch (error) {
        Logger.error(DataSource.SYNC, entityType, `Retry failed for operation: ${operation.id}`, error)
        
        // Remove operation after max retries
        if (this.getRetryCount(operation) >= this.MAX_RETRY_ATTEMPTS) {
          this.rollbackOperation(entityType, operation.id)
        }
      }
    }
  }

  /**
   * Retry a specific operation
   */
  private async retryOperation(entityType: string, operation: SyncOperation): Promise<void> {
    // Implementation would depend on the specific API endpoints
    // This is a placeholder for the retry logic
    Logger.info(DataSource.SYNC, entityType, `Retrying operation: ${operation.id}`)
  }

  /**
   * Sync with server for latest changes
   */
  private async syncWithServer(entityType: string): Promise<void> {
    const state = this.syncStates.get(entityType)
    if (!state) return

    try {
      // Fetch latest version from server
      const response = await fetch(`/api/${entityType}?version=${state.version}&since=${state.lastSync}`)
      const result = await response.json()

      if (result.success && result.changes) {
        // Apply server changes
        for (const change of result.changes) {
          await this.handleRemoteSync(entityType, change)
        }
      }
    } catch (error) {
      Logger.error(DataSource.SYNC, entityType, 'Server sync failed', error)
    }
  }

  /**
   * Broadcast optimistic update to other sessions
   */
  private broadcastOptimisticUpdate(entityType: string, operation: SyncOperation): void {
    webSocketEventService.broadcastToAll({
      type: 'OPTIMISTIC_UPDATE',
      data: {
        entityType,
        operation
      }
    })
  }

  /**
   * Broadcast rollback to other sessions
   */
  private broadcastRollback(entityType: string, operationId: string): void {
    webSocketEventService.broadcastToAll({
      type: 'OPERATION_ROLLBACK',
      data: {
        entityType,
        operationId
      }
    })
  }

  /**
   * Broadcast commit to other sessions
   */
  private broadcastCommit(entityType: string, operationId: string, result: any): void {
    webSocketEventService.broadcastToAll({
      type: 'OPERATION_COMMIT',
      data: {
        entityType,
        operationId,
        result
      }
    })
  }

  /**
   * Setup event handlers for WebSocket events
   */
  private setupEventHandlers(): void {
    // Handle incoming sync events
    webSocketEventService.on('OPTIMISTIC_UPDATE', (data) => {
      this.handleRemoteSync(data.entityType, data.operation)
    })

    webSocketEventService.on('OPERATION_ROLLBACK', (data) => {
      // Handle remote rollback
      const state = this.syncStates.get(data.entityType)
      if (state) {
        state.pendingOperations.delete(data.operationId)
      }
    })

    webSocketEventService.on('OPERATION_COMMIT', (data) => {
      // Handle remote commit
      const state = this.syncStates.get(data.entityType)
      if (state) {
        state.pendingOperations.delete(data.operationId)
      }
    })
  }

  /**
   * Get sync status for an entity type
   */
  getSyncStatus(entityType: string): {
    isInitialized: boolean
    pendingOperations: number
    conflicts: number
    lastSync: string
    version: number
  } {
    const state = this.syncStates.get(entityType)
    
    return {
      isInitialized: !!state,
      pendingOperations: state?.pendingOperations.size || 0,
      conflicts: state?.conflicts.filter(c => !c.resolved).length || 0,
      lastSync: state?.lastSync || '',
      version: state?.version || 0
    }
  }

  /**
   * Get all pending operations for debugging
   */
  getPendingOperations(entityType: string): SyncOperation[] {
    const state = this.syncStates.get(entityType)
    return state ? Array.from(state.pendingOperations.values()) : []
  }

  /**
   * Get unresolved conflicts
   */
  getConflicts(entityType: string): SyncConflict[] {
    const state = this.syncStates.get(entityType)
    return state ? state.conflicts.filter(c => !c.resolved) : []
  }

  /**
   * Clear resolved conflicts
   */
  clearResolvedConflicts(entityType: string): void {
    const state = this.syncStates.get(entityType)
    if (state) {
      state.conflicts = state.conflicts.filter(c => !c.resolved)
    }
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Generate unique operation ID
   */
  private generateOperationId(): string {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Get retry count for an operation
   */
  private getRetryCount(operation: SyncOperation): number {
    // This would be stored in operation metadata in a real implementation
    return 0
  }
}

// Export singleton instance
export const dataSyncManager = new DataSyncManager()
export default dataSyncManager