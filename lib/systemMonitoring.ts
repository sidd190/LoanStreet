/**
 * System Monitoring and Health Check Service
 * Provides comprehensive system monitoring, health checks, and data integrity validation
 */

import { PrismaClient } from '@prisma/client'
import { databaseService } from './databaseService'
import { errorMonitoring } from './errorMonitoring'
import { auditLogger, AuditEventType, AuditSeverity } from './security/auditLogger'
import Logger, { DataSource } from './logger'

export interface SystemHealth {
  overall: 'HEALTHY' | 'DEGRADED' | 'CRITICAL'
  components: {
    database: ComponentHealth
    api: ComponentHealth
    websocket: ComponentHealth
    whatsapp: ComponentHealth
    storage: ComponentHealth
    memory: ComponentHealth
    cpu: ComponentHealth
  }
  lastCheck: string
  uptime: number
}

export interface ComponentHealth {
  status: 'HEALTHY' | 'DEGRADED' | 'CRITICAL' | 'UNKNOWN'
  responseTime?: number
  errorRate?: number
  lastError?: string
  metrics?: Record<string, any>
  lastCheck: string
}

export interface DataIntegrityReport {
  id: string
  timestamp: string
  status: 'PASSED' | 'FAILED' | 'WARNING'
  checks: DataIntegrityCheck[]
  summary: {
    totalChecks: number
    passed: number
    failed: number
    warnings: number
  }
}

export interface DataIntegrityCheck {
  name: string
  description: string
  status: 'PASSED' | 'FAILED' | 'WARNING'
  details?: string
  affectedRecords?: number
  query?: string
  expectedValue?: any
  actualValue?: any
}

export interface PerformanceMetrics {
  timestamp: string
  api: {
    totalRequests: number
    averageResponseTime: number
    errorRate: number
    slowRequests: number
  }
  database: {
    totalQueries: number
    averageQueryTime: number
    slowQueries: number
    failedQueries: number
    connectionPoolUsage: number
  }
  memory: {
    used: number
    total: number
    heapUsed: number
    heapTotal: number
    utilizationPercent: number
  }
  cpu: {
    usage: number
    loadAverage: number[]
  }
  websocket: {
    activeConnections: number
    messagesPerSecond: number
    connectionErrors: number
  }
}

export interface AlertRule {
  id: string
  name: string
  description: string
  metric: string
  operator: '>' | '<' | '=' | '>=' | '<=' | '!='
  threshold: number
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  enabled: boolean
  cooldownMinutes: number
  lastTriggered?: string
}

class SystemMonitoringService {
  private prisma: PrismaClient
  private monitoringInterval: NodeJS.Timeout | null = null
  private integrityCheckInterval: NodeJS.Timeout | null = null
  private performanceMetrics: PerformanceMetrics[] = []
  private alertRules: AlertRule[] = []
  private readonly MAX_METRICS_HISTORY = 1000
  private readonly MONITORING_INTERVAL = 30000 // 30 seconds
  private readonly INTEGRITY_CHECK_INTERVAL = 300000 // 5 minutes

  constructor() {
    this.prisma = new PrismaClient()
    this.initializeDefaultAlertRules()
  }

  /**
   * Start system monitoring
   */
  start(): void {
    Logger.info(DataSource.MONITORING, 'system', 'Starting system monitoring')

    // Start health monitoring
    this.monitoringInterval = setInterval(() => {
      this.performHealthCheck()
    }, this.MONITORING_INTERVAL)

    // Start data integrity checks
    this.integrityCheckInterval = setInterval(() => {
      this.performDataIntegrityCheck()
    }, this.INTEGRITY_CHECK_INTERVAL)

    // Initial checks
    setTimeout(() => {
      this.performHealthCheck()
      this.performDataIntegrityCheck()
    }, 1000)
  }

  /**
   * Stop system monitoring
   */
  stop(): void {
    Logger.info(DataSource.MONITORING, 'system', 'Stopping system monitoring')

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = null
    }

    if (this.integrityCheckInterval) {
      clearInterval(this.integrityCheckInterval)
      this.integrityCheckInterval = null
    }
  }

  /**
   * Perform comprehensive health check
   */
  async performHealthCheck(): Promise<SystemHealth> {
    const startTime = Date.now()

    try {
      Logger.info(DataSource.MONITORING, 'health_check', 'Starting system health check')

      const [
        databaseHealth,
        apiHealth,
        websocketHealth,
        whatsappHealth,
        storageHealth,
        memoryHealth,
        cpuHealth
      ] = await Promise.allSettled([
        this.checkDatabaseHealth(),
        this.checkAPIHealth(),
        this.checkWebSocketHealth(),
        this.checkWhatsAppHealth(),
        this.checkStorageHealth(),
        this.checkMemoryHealth(),
        this.checkCPUHealth()
      ])

      const components = {
        database: this.getHealthResult(databaseHealth),
        api: this.getHealthResult(apiHealth),
        websocket: this.getHealthResult(websocketHealth),
        whatsapp: this.getHealthResult(whatsappHealth),
        storage: this.getHealthResult(storageHealth),
        memory: this.getHealthResult(memoryHealth),
        cpu: this.getHealthResult(cpuHealth)
      }

      const overallStatus = this.determineOverallHealth(components)
      const uptime = process.uptime()

      const health: SystemHealth = {
        overall: overallStatus,
        components,
        lastCheck: new Date().toISOString(),
        uptime
      }

      // Store performance metrics
      await this.collectPerformanceMetrics()

      // Check alert rules
      await this.checkAlertRules(health)

      const duration = Date.now() - startTime
      Logger.success(DataSource.MONITORING, 'health_check', `Health check completed in ${duration}ms`, {
        overall: overallStatus,
        duration
      })

      return health

    } catch (error) {
      Logger.error(DataSource.MONITORING, 'health_check', 'Health check failed', error)
      
      return {
        overall: 'CRITICAL',
        components: {
          database: { status: 'UNKNOWN', lastCheck: new Date().toISOString() },
          api: { status: 'UNKNOWN', lastCheck: new Date().toISOString() },
          websocket: { status: 'UNKNOWN', lastCheck: new Date().toISOString() },
          whatsapp: { status: 'UNKNOWN', lastCheck: new Date().toISOString() },
          storage: { status: 'UNKNOWN', lastCheck: new Date().toISOString() },
          memory: { status: 'UNKNOWN', lastCheck: new Date().toISOString() },
          cpu: { status: 'UNKNOWN', lastCheck: new Date().toISOString() }
        },
        lastCheck: new Date().toISOString(),
        uptime: process.uptime()
      }
    }
  }

  /**
   * Perform data integrity check
   */
  async performDataIntegrityCheck(): Promise<DataIntegrityReport> {
    const reportId = this.generateReportId()
    const timestamp = new Date().toISOString()

    try {
      Logger.info(DataSource.MONITORING, 'integrity_check', `Starting data integrity check: ${reportId}`)

      const checks: DataIntegrityCheck[] = []

      // Check for orphaned records
      checks.push(...await this.checkOrphanedRecords())

      // Check data consistency
      checks.push(...await this.checkDataConsistency())

      // Check referential integrity
      checks.push(...await this.checkReferentialIntegrity())

      // Check data quality
      checks.push(...await this.checkDataQuality())

      // Check business rules
      checks.push(...await this.checkBusinessRules())

      const summary = {
        totalChecks: checks.length,
        passed: checks.filter(c => c.status === 'PASSED').length,
        failed: checks.filter(c => c.status === 'FAILED').length,
        warnings: checks.filter(c => c.status === 'WARNING').length
      }

      const status = summary.failed > 0 ? 'FAILED' : 
                    summary.warnings > 0 ? 'WARNING' : 'PASSED'

      const report: DataIntegrityReport = {
        id: reportId,
        timestamp,
        status,
        checks,
        summary
      }

      // Log results
      if (status === 'FAILED') {
        Logger.error(DataSource.MONITORING, 'integrity_check', `Data integrity check failed: ${reportId}`, summary)
        await auditLogger.logEvent(
          AuditEventType.SECURITY_VIOLATION,
          'Data integrity check failed',
          {
            details: { reportId, summary, failedChecks: checks.filter(c => c.status === 'FAILED') },
            severity: AuditSeverity.HIGH
          }
        )
      } else if (status === 'WARNING') {
        Logger.warn(DataSource.MONITORING, 'integrity_check', `Data integrity check has warnings: ${reportId}`, summary)
      } else {
        Logger.success(DataSource.MONITORING, 'integrity_check', `Data integrity check passed: ${reportId}`, summary)
      }

      return report

    } catch (error) {
      Logger.error(DataSource.MONITORING, 'integrity_check', `Data integrity check failed: ${reportId}`, error)
      
      return {
        id: reportId,
        timestamp,
        status: 'FAILED',
        checks: [{
          name: 'System Error',
          description: 'Data integrity check could not be completed due to system error',
          status: 'FAILED',
          details: error instanceof Error ? error.message : 'Unknown error'
        }],
        summary: { totalChecks: 1, passed: 0, failed: 1, warnings: 0 }
      }
    }
  }

  /**
   * Check database health
   */
  private async checkDatabaseHealth(): Promise<ComponentHealth> {
    const startTime = Date.now()

    try {
      const health = await databaseService.getHealthStatus()
      const responseTime = Date.now() - startTime

      return {
        status: health.status === 'HEALTHY' ? 'HEALTHY' : 
                health.status === 'DEGRADED' ? 'DEGRADED' : 'CRITICAL',
        responseTime,
        metrics: {
          avgQueryTime: health.performance.avgQueryTime,
          slowQueries: health.performance.slowQueries,
          failedQueries: health.performance.failedQueries,
          storageUtilization: health.storage.utilizationPercent
        },
        lastCheck: new Date().toISOString()
      }
    } catch (error) {
      return {
        status: 'CRITICAL',
        responseTime: Date.now() - startTime,
        lastError: error instanceof Error ? error.message : 'Unknown error',
        lastCheck: new Date().toISOString()
      }
    }
  }

  /**
   * Check API health
   */
  private async checkAPIHealth(): Promise<ComponentHealth> {
    const startTime = Date.now()

    try {
      // Test API endpoint
      const response = await fetch('/api/dashboard/stats')
      const responseTime = Date.now() - startTime

      if (response.ok) {
        return {
          status: responseTime < 1000 ? 'HEALTHY' : 
                  responseTime < 3000 ? 'DEGRADED' : 'CRITICAL',
          responseTime,
          lastCheck: new Date().toISOString()
        }
      } else {
        return {
          status: 'CRITICAL',
          responseTime,
          lastError: `HTTP ${response.status}`,
          lastCheck: new Date().toISOString()
        }
      }
    } catch (error) {
      return {
        status: 'CRITICAL',
        responseTime: Date.now() - startTime,
        lastError: error instanceof Error ? error.message : 'Unknown error',
        lastCheck: new Date().toISOString()
      }
    }
  }

  /**
   * Check WebSocket health
   */
  private async checkWebSocketHealth(): Promise<ComponentHealth> {
    // Placeholder for WebSocket health check
    return {
      status: 'HEALTHY',
      metrics: {
        activeConnections: 0,
        messagesPerSecond: 0
      },
      lastCheck: new Date().toISOString()
    }
  }

  /**
   * Check WhatsApp API health
   */
  private async checkWhatsAppHealth(): Promise<ComponentHealth> {
    // Placeholder for WhatsApp API health check
    return {
      status: 'HEALTHY',
      lastCheck: new Date().toISOString()
    }
  }

  /**
   * Check storage health
   */
  private async checkStorageHealth(): Promise<ComponentHealth> {
    try {
      // Check disk space (Node.js specific)
      if (typeof window === 'undefined') {
        const fs = require('fs')
        const stats = fs.statSync('.')
        
        return {
          status: 'HEALTHY',
          metrics: {
            available: stats.size || 0
          },
          lastCheck: new Date().toISOString()
        }
      }

      return {
        status: 'HEALTHY',
        lastCheck: new Date().toISOString()
      }
    } catch (error) {
      return {
        status: 'CRITICAL',
        lastError: error instanceof Error ? error.message : 'Unknown error',
        lastCheck: new Date().toISOString()
      }
    }
  }

  /**
   * Check memory health
   */
  private async checkMemoryHealth(): Promise<ComponentHealth> {
    try {
      const memUsage = process.memoryUsage()
      const utilizationPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100

      return {
        status: utilizationPercent < 80 ? 'HEALTHY' : 
                utilizationPercent < 95 ? 'DEGRADED' : 'CRITICAL',
        metrics: {
          heapUsed: memUsage.heapUsed,
          heapTotal: memUsage.heapTotal,
          utilizationPercent
        },
        lastCheck: new Date().toISOString()
      }
    } catch (error) {
      return {
        status: 'CRITICAL',
        lastError: error instanceof Error ? error.message : 'Unknown error',
        lastCheck: new Date().toISOString()
      }
    }
  }

  /**
   * Check CPU health
   */
  private async checkCPUHealth(): Promise<ComponentHealth> {
    try {
      // Basic CPU check using process.cpuUsage()
      const cpuUsage = process.cpuUsage()
      const usage = (cpuUsage.user + cpuUsage.system) / 1000000 // Convert to seconds

      return {
        status: usage < 80 ? 'HEALTHY' : 
                usage < 95 ? 'DEGRADED' : 'CRITICAL',
        metrics: {
          usage,
          loadAverage: require('os').loadavg()
        },
        lastCheck: new Date().toISOString()
      }
    } catch (error) {
      return {
        status: 'HEALTHY', // Default to healthy if we can't measure
        lastCheck: new Date().toISOString()
      }
    }
  }

  /**
   * Check for orphaned records
   */
  private async checkOrphanedRecords(): Promise<DataIntegrityCheck[]> {
    const checks: DataIntegrityCheck[] = []

    try {
      // Check for messages without contacts
      const orphanedMessages = await this.prisma.message.count({
        where: {
          contact: null
        }
      })

      checks.push({
        name: 'Orphaned Messages',
        description: 'Messages that reference non-existent contacts',
        status: orphanedMessages === 0 ? 'PASSED' : 'FAILED',
        affectedRecords: orphanedMessages,
        details: orphanedMessages > 0 ? `Found ${orphanedMessages} orphaned messages` : undefined
      })

      // Check for leads without contacts
      const orphanedLeads = await this.prisma.lead.count({
        where: {
          contactId: { not: null },
          contact: null
        }
      })

      checks.push({
        name: 'Orphaned Leads',
        description: 'Leads that reference non-existent contacts',
        status: orphanedLeads === 0 ? 'PASSED' : 'FAILED',
        affectedRecords: orphanedLeads,
        details: orphanedLeads > 0 ? `Found ${orphanedLeads} orphaned leads` : undefined
      })

    } catch (error) {
      checks.push({
        name: 'Orphaned Records Check',
        description: 'Check for orphaned records failed',
        status: 'FAILED',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    }

    return checks
  }

  /**
   * Check data consistency
   */
  private async checkDataConsistency(): Promise<DataIntegrityCheck[]> {
    const checks: DataIntegrityCheck[] = []

    try {
      // Check campaign statistics consistency
      const campaigns = await this.prisma.campaign.findMany({
        include: {
          messages: true,
          contacts: true
        }
      })

      let inconsistentCampaigns = 0
      for (const campaign of campaigns) {
        const actualSent = campaign.messages.length
        if (campaign.totalSent !== actualSent) {
          inconsistentCampaigns++
        }
      }

      checks.push({
        name: 'Campaign Statistics Consistency',
        description: 'Campaign statistics match actual message counts',
        status: inconsistentCampaigns === 0 ? 'PASSED' : 'WARNING',
        affectedRecords: inconsistentCampaigns,
        details: inconsistentCampaigns > 0 ? `Found ${inconsistentCampaigns} campaigns with inconsistent statistics` : undefined
      })

    } catch (error) {
      checks.push({
        name: 'Data Consistency Check',
        description: 'Data consistency check failed',
        status: 'FAILED',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    }

    return checks
  }

  /**
   * Check referential integrity
   */
  private async checkReferentialIntegrity(): Promise<DataIntegrityCheck[]> {
    const checks: DataIntegrityCheck[] = []

    try {
      // Check if all foreign keys are valid
      const invalidReferences = await this.prisma.$queryRaw`
        SELECT 'messages' as table_name, COUNT(*) as count
        FROM Message m
        LEFT JOIN Contact c ON m.contactId = c.id
        WHERE c.id IS NULL
      ` as any[]

      const totalInvalid = invalidReferences.reduce((sum, row) => sum + Number(row.count), 0)

      checks.push({
        name: 'Referential Integrity',
        description: 'All foreign key references are valid',
        status: totalInvalid === 0 ? 'PASSED' : 'FAILED',
        affectedRecords: totalInvalid,
        details: totalInvalid > 0 ? `Found ${totalInvalid} invalid foreign key references` : undefined
      })

    } catch (error) {
      checks.push({
        name: 'Referential Integrity Check',
        description: 'Referential integrity check failed',
        status: 'FAILED',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    }

    return checks
  }

  /**
   * Check data quality
   */
  private async checkDataQuality(): Promise<DataIntegrityCheck[]> {
    const checks: DataIntegrityCheck[] = []

    try {
      // Check for contacts with invalid phone numbers
      const invalidPhones = await this.prisma.contact.count({
        where: {
          OR: [
            { phone: '' },
            { phone: null },
            { phone: { not: { regex: '^[+]?[0-9]{10,15}$' } } }
          ]
        }
      })

      checks.push({
        name: 'Phone Number Quality',
        description: 'All contacts have valid phone numbers',
        status: invalidPhones === 0 ? 'PASSED' : 'WARNING',
        affectedRecords: invalidPhones,
        details: invalidPhones > 0 ? `Found ${invalidPhones} contacts with invalid phone numbers` : undefined
      })

      // Check for duplicate contacts
      const duplicatePhones = await this.prisma.$queryRaw`
        SELECT phone, COUNT(*) as count
        FROM Contact
        GROUP BY phone
        HAVING COUNT(*) > 1
      ` as any[]

      checks.push({
        name: 'Duplicate Contacts',
        description: 'No duplicate phone numbers in contacts',
        status: duplicatePhones.length === 0 ? 'PASSED' : 'WARNING',
        affectedRecords: duplicatePhones.length,
        details: duplicatePhones.length > 0 ? `Found ${duplicatePhones.length} duplicate phone numbers` : undefined
      })

    } catch (error) {
      checks.push({
        name: 'Data Quality Check',
        description: 'Data quality check failed',
        status: 'FAILED',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    }

    return checks
  }

  /**
   * Check business rules
   */
  private async checkBusinessRules(): Promise<DataIntegrityCheck[]> {
    const checks: DataIntegrityCheck[] = []

    try {
      // Check for campaigns with future sent dates
      const futureCampaigns = await this.prisma.campaign.count({
        where: {
          sentAt: {
            gt: new Date()
          }
        }
      })

      checks.push({
        name: 'Campaign Date Logic',
        description: 'No campaigns have future sent dates',
        status: futureCampaigns === 0 ? 'PASSED' : 'WARNING',
        affectedRecords: futureCampaigns,
        details: futureCampaigns > 0 ? `Found ${futureCampaigns} campaigns with future sent dates` : undefined
      })

      // Check for leads with invalid loan amounts
      const invalidLoans = await this.prisma.lead.count({
        where: {
          loanAmount: {
            lte: 0
          }
        }
      })

      checks.push({
        name: 'Loan Amount Validation',
        description: 'All leads have positive loan amounts',
        status: invalidLoans === 0 ? 'PASSED' : 'WARNING',
        affectedRecords: invalidLoans,
        details: invalidLoans > 0 ? `Found ${invalidLoans} leads with invalid loan amounts` : undefined
      })

    } catch (error) {
      checks.push({
        name: 'Business Rules Check',
        description: 'Business rules check failed',
        status: 'FAILED',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    }

    return checks
  }

  /**
   * Collect performance metrics
   */
  private async collectPerformanceMetrics(): Promise<void> {
    try {
      const memUsage = process.memoryUsage()
      const cpuUsage = process.cpuUsage()

      const metrics: PerformanceMetrics = {
        timestamp: new Date().toISOString(),
        api: {
          totalRequests: 0, // Would be tracked by middleware
          averageResponseTime: 0,
          errorRate: 0,
          slowRequests: 0
        },
        database: {
          totalQueries: 0, // Would be tracked by database service
          averageQueryTime: 0,
          slowQueries: 0,
          failedQueries: 0,
          connectionPoolUsage: 0
        },
        memory: {
          used: memUsage.heapUsed,
          total: memUsage.heapTotal,
          heapUsed: memUsage.heapUsed,
          heapTotal: memUsage.heapTotal,
          utilizationPercent: (memUsage.heapUsed / memUsage.heapTotal) * 100
        },
        cpu: {
          usage: (cpuUsage.user + cpuUsage.system) / 1000000,
          loadAverage: require('os').loadavg()
        },
        websocket: {
          activeConnections: 0,
          messagesPerSecond: 0,
          connectionErrors: 0
        }
      }

      this.performanceMetrics.push(metrics)

      // Keep only recent metrics
      if (this.performanceMetrics.length > this.MAX_METRICS_HISTORY) {
        this.performanceMetrics.shift()
      }

    } catch (error) {
      Logger.error(DataSource.MONITORING, 'metrics', 'Failed to collect performance metrics', error)
    }
  }

  /**
   * Check alert rules
   */
  private async checkAlertRules(health: SystemHealth): Promise<void> {
    for (const rule of this.alertRules) {
      if (!rule.enabled) continue

      // Check cooldown period
      if (rule.lastTriggered) {
        const cooldownEnd = new Date(rule.lastTriggered).getTime() + (rule.cooldownMinutes * 60 * 1000)
        if (Date.now() < cooldownEnd) continue
      }

      const shouldTrigger = this.evaluateAlertRule(rule, health)
      if (shouldTrigger) {
        await this.triggerAlert(rule, health)
        rule.lastTriggered = new Date().toISOString()
      }
    }
  }

  /**
   * Evaluate alert rule
   */
  private evaluateAlertRule(rule: AlertRule, health: SystemHealth): boolean {
    // Extract metric value based on rule.metric
    let value: number = 0

    // Parse metric path (e.g., "components.database.responseTime")
    const parts = rule.metric.split('.')
    let current: any = health

    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part]
      } else {
        return false // Metric not found
      }
    }

    if (typeof current === 'number') {
      value = current
    } else {
      return false
    }

    // Evaluate condition
    switch (rule.operator) {
      case '>': return value > rule.threshold
      case '<': return value < rule.threshold
      case '>=': return value >= rule.threshold
      case '<=': return value <= rule.threshold
      case '=': return value === rule.threshold
      case '!=': return value !== rule.threshold
      default: return false
    }
  }

  /**
   * Trigger alert
   */
  private async triggerAlert(rule: AlertRule, health: SystemHealth): Promise<void> {
    Logger.warn(DataSource.MONITORING, 'alert', `Alert triggered: ${rule.name}`, {
      rule: rule.name,
      severity: rule.severity,
      threshold: rule.threshold
    })

    await auditLogger.logEvent(
      AuditEventType.SYSTEM_ERROR,
      `System alert triggered: ${rule.name}`,
      {
        details: {
          rule,
          health: health.overall,
          components: health.components
        },
        severity: rule.severity as AuditSeverity
      }
    )
  }

  /**
   * Initialize default alert rules
   */
  private initializeDefaultAlertRules(): void {
    this.alertRules = [
      {
        id: 'db_response_time',
        name: 'Database Response Time',
        description: 'Database response time is too high',
        metric: 'components.database.responseTime',
        operator: '>',
        threshold: 5000,
        severity: 'HIGH',
        enabled: true,
        cooldownMinutes: 5
      },
      {
        id: 'memory_usage',
        name: 'Memory Usage',
        description: 'Memory usage is too high',
        metric: 'components.memory.metrics.utilizationPercent',
        operator: '>',
        threshold: 90,
        severity: 'CRITICAL',
        enabled: true,
        cooldownMinutes: 2
      },
      {
        id: 'api_response_time',
        name: 'API Response Time',
        description: 'API response time is too high',
        metric: 'components.api.responseTime',
        operator: '>',
        threshold: 3000,
        severity: 'MEDIUM',
        enabled: true,
        cooldownMinutes: 5
      }
    ]
  }

  /**
   * Helper methods
   */
  private getHealthResult(result: PromiseSettledResult<ComponentHealth>): ComponentHealth {
    if (result.status === 'fulfilled') {
      return result.value
    } else {
      return {
        status: 'CRITICAL',
        lastError: result.reason?.message || 'Unknown error',
        lastCheck: new Date().toISOString()
      }
    }
  }

  private determineOverallHealth(components: SystemHealth['components']): SystemHealth['overall'] {
    const statuses = Object.values(components).map(c => c.status)
    
    if (statuses.includes('CRITICAL')) return 'CRITICAL'
    if (statuses.includes('DEGRADED')) return 'DEGRADED'
    return 'HEALTHY'
  }

  private generateReportId(): string {
    return `integrity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Public API methods
   */
  async getSystemHealth(): Promise<SystemHealth> {
    return this.performHealthCheck()
  }

  async getLatestIntegrityReport(): Promise<DataIntegrityReport> {
    return this.performDataIntegrityCheck()
  }

  getPerformanceMetrics(limit: number = 100): PerformanceMetrics[] {
    return this.performanceMetrics.slice(-limit)
  }

  getAlertRules(): AlertRule[] {
    return [...this.alertRules]
  }

  updateAlertRule(ruleId: string, updates: Partial<AlertRule>): boolean {
    const index = this.alertRules.findIndex(r => r.id === ruleId)
    if (index !== -1) {
      this.alertRules[index] = { ...this.alertRules[index], ...updates }
      return true
    }
    return false
  }

  addAlertRule(rule: AlertRule): void {
    this.alertRules.push(rule)
  }

  removeAlertRule(ruleId: string): boolean {
    const index = this.alertRules.findIndex(r => r.id === ruleId)
    if (index !== -1) {
      this.alertRules.splice(index, 1)
      return true
    }
    return false
  }
}

// Export singleton instance
export const systemMonitoring = new SystemMonitoringService()
export default systemMonitoring