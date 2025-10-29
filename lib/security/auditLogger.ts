import { PrismaClient } from '@prisma/client'
import { AuthUser } from '../auth'
import { AUDIT_CONFIG } from './config'

const prisma = new PrismaClient()

/**
 * Comprehensive audit logging system for security and compliance
 */

export enum AuditEventType {
  // Authentication events
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  LOGIN_FAILED = 'LOGIN_FAILED',
  PASSWORD_CHANGE = 'PASSWORD_CHANGE',
  PASSWORD_RESET = 'PASSWORD_RESET',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  
  // Data access events
  CONTACT_VIEW = 'CONTACT_VIEW',
  CONTACT_EXPORT = 'CONTACT_EXPORT',
  CAMPAIGN_VIEW = 'CAMPAIGN_VIEW',
  MESSAGE_VIEW = 'MESSAGE_VIEW',
  LEAD_VIEW = 'LEAD_VIEW',
  ANALYTICS_VIEW = 'ANALYTICS_VIEW',
  
  // Data modification events
  CONTACT_CREATE = 'CONTACT_CREATE',
  CONTACT_UPDATE = 'CONTACT_UPDATE',
  CONTACT_DELETE = 'CONTACT_DELETE',
  CONTACT_IMPORT = 'CONTACT_IMPORT',
  CAMPAIGN_CREATE = 'CAMPAIGN_CREATE',
  CAMPAIGN_UPDATE = 'CAMPAIGN_UPDATE',
  CAMPAIGN_DELETE = 'CAMPAIGN_DELETE',
  CAMPAIGN_EXECUTE = 'CAMPAIGN_EXECUTE',
  MESSAGE_SEND = 'MESSAGE_SEND',
  MESSAGE_REPLY = 'MESSAGE_REPLY',
  LEAD_CREATE = 'LEAD_CREATE',
  LEAD_UPDATE = 'LEAD_UPDATE',
  LEAD_DELETE = 'LEAD_DELETE',
  LEAD_ASSIGN = 'LEAD_ASSIGN',
  
  // System events
  FILE_UPLOAD = 'FILE_UPLOAD',
  BULK_OPERATION = 'BULK_OPERATION',
  CONFIG_CHANGE = 'CONFIG_CHANGE',
  API_ERROR = 'API_ERROR',
  SECURITY_VIOLATION = 'SECURITY_VIOLATION',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  
  // External API events
  SMSFRESH_API_CALL = 'SMSFRESH_API_CALL',
  SMSFRESH_API_ERROR = 'SMSFRESH_API_ERROR',
  WEBHOOK_RECEIVED = 'WEBHOOK_RECEIVED',
}

export enum AuditSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export interface AuditLogEntry {
  id?: string
  eventType: AuditEventType
  severity: AuditSeverity
  userId?: string
  userEmail?: string
  userRole?: string
  ipAddress?: string
  userAgent?: string
  resource?: string
  resourceId?: string
  action: string
  details: Record<string, any>
  success: boolean
  errorMessage?: string
  timestamp: Date
  sessionId?: string
  requestId?: string
}

export interface SecurityAlert {
  id?: string
  alertType: string
  severity: AuditSeverity
  description: string
  ipAddress?: string
  userAgent?: string
  userId?: string
  details: Record<string, any>
  resolved: boolean
  resolvedBy?: string
  resolvedAt?: Date
  createdAt: Date
}

class AuditLogger {
  private static instance: AuditLogger
  private logBuffer: AuditLogEntry[] = []
  private alertBuffer: SecurityAlert[] = []
  private flushInterval: NodeJS.Timeout | null = null
  
  static getInstance(): AuditLogger {
    if (!AuditLogger.instance) {
      AuditLogger.instance = new AuditLogger()
      AuditLogger.instance.startBufferFlush()
    }
    return AuditLogger.instance
  }
  
  /**
   * Start periodic buffer flush to database
   */
  private startBufferFlush() {
    this.flushInterval = setInterval(() => {
      this.flushBuffers()
    }, 30000) // Flush every 30 seconds
  }
  
  /**
   * Flush buffered logs to database
   */
  private async flushBuffers() {
    if (this.logBuffer.length === 0 && this.alertBuffer.length === 0) {
      return
    }
    
    try {
      // Flush audit logs
      if (this.logBuffer.length > 0) {
        const logsToFlush = [...this.logBuffer]
        this.logBuffer = []
        
        // In a real implementation, you would save to database
        // For now, we'll log to console and file
        for (const log of logsToFlush) {
          await this.persistAuditLog(log)
        }
      }
      
      // Flush security alerts
      if (this.alertBuffer.length > 0) {
        const alertsToFlush = [...this.alertBuffer]
        this.alertBuffer = []
        
        for (const alert of alertsToFlush) {
          await this.persistSecurityAlert(alert)
        }
      }
    } catch (error) {
      console.error('Failed to flush audit buffers:', error)
      // Re-add failed logs back to buffer for retry
    }
  }
  
  /**
   * Persist audit log entry
   */
  private async persistAuditLog(entry: AuditLogEntry) {
    try {
      // Log to console in development
      if (process.env.NODE_ENV === 'development') {
        console.log(`[AUDIT] ${entry.eventType}: ${entry.action}`, {
          user: entry.userEmail,
          resource: entry.resource,
          success: entry.success,
          details: entry.details
        })
      }
      
      // In production, save to database
      // await prisma.auditLog.create({ data: entry })
      
      // For now, append to log file
      const logLine = JSON.stringify({
        ...entry,
        timestamp: entry.timestamp.toISOString()
      }) + '\n'
      
      // In a real implementation, use a proper file logging library
      if (typeof window === 'undefined') {
        const fs = require('fs').promises
        await fs.appendFile('logs/audit.log', logLine)
      }
    } catch (error) {
      console.error('Failed to persist audit log:', error)
    }
  }
  
  /**
   * Persist security alert
   */
  private async persistSecurityAlert(alert: SecurityAlert) {
    try {
      // Log critical alerts immediately to console
      if (alert.severity === AuditSeverity.CRITICAL) {
        console.error(`[SECURITY ALERT] ${alert.alertType}: ${alert.description}`, alert.details)
      }
      
      // In production, save to database and potentially send notifications
      // await prisma.securityAlert.create({ data: alert })
      
      // For now, append to security log file
      const logLine = JSON.stringify({
        ...alert,
        createdAt: alert.createdAt.toISOString()
      }) + '\n'
      
      if (typeof window === 'undefined') {
        const fs = require('fs').promises
        await fs.appendFile('logs/security.log', logLine)
      }
    } catch (error) {
      console.error('Failed to persist security alert:', error)
    }
  }
  
  /**
   * Log audit event
   */
  async logEvent(
    eventType: AuditEventType,
    action: string,
    options: {
      user?: AuthUser
      ipAddress?: string
      userAgent?: string
      resource?: string
      resourceId?: string
      details?: Record<string, any>
      success?: boolean
      errorMessage?: string
      severity?: AuditSeverity
      sessionId?: string
      requestId?: string
    } = {}
  ) {
    const {
      user,
      ipAddress,
      userAgent,
      resource,
      resourceId,
      details = {},
      success = true,
      errorMessage,
      severity = AuditSeverity.LOW,
      sessionId,
      requestId
    } = options
    
    const entry: AuditLogEntry = {
      eventType,
      severity,
      userId: user?.id,
      userEmail: user?.email,
      userRole: user?.role,
      ipAddress,
      userAgent,
      resource,
      resourceId,
      action,
      details,
      success,
      errorMessage,
      timestamp: new Date(),
      sessionId,
      requestId
    }
    
    // Add to buffer for batch processing
    this.logBuffer.push(entry)
    
    // For critical events, flush immediately
    if (severity === AuditSeverity.CRITICAL || !success) {
      await this.flushBuffers()
    }
  }
  
  /**
   * Log security alert
   */
  async logSecurityAlert(
    alertType: string,
    description: string,
    options: {
      severity?: AuditSeverity
      ipAddress?: string
      userAgent?: string
      userId?: string
      details?: Record<string, any>
    } = {}
  ) {
    const {
      severity = AuditSeverity.MEDIUM,
      ipAddress,
      userAgent,
      userId,
      details = {}
    } = options
    
    const alert: SecurityAlert = {
      alertType,
      severity,
      description,
      ipAddress,
      userAgent,
      userId,
      details,
      resolved: false,
      createdAt: new Date()
    }
    
    this.alertBuffer.push(alert)
    
    // Flush critical alerts immediately
    if (severity === AuditSeverity.CRITICAL) {
      await this.flushBuffers()
    }
  }
  
  /**
   * Authentication event logging
   */
  async logAuthentication(
    eventType: AuditEventType.LOGIN | AuditEventType.LOGOUT | AuditEventType.LOGIN_FAILED,
    user: AuthUser | null,
    ipAddress?: string,
    userAgent?: string,
    details?: Record<string, any>
  ) {
    await this.logEvent(eventType, `User ${eventType.toLowerCase()}`, {
      user: user || undefined,
      ipAddress,
      userAgent,
      details,
      success: eventType !== AuditEventType.LOGIN_FAILED,
      severity: eventType === AuditEventType.LOGIN_FAILED ? AuditSeverity.MEDIUM : AuditSeverity.LOW
    })
  }
  
  /**
   * Data access event logging
   */
  async logDataAccess(
    resource: string,
    action: string,
    user: AuthUser,
    resourceId?: string,
    details?: Record<string, any>
  ) {
    const eventType = this.getDataAccessEventType(resource, action)
    
    await this.logEvent(eventType, `${action} ${resource}`, {
      user,
      resource,
      resourceId,
      details,
      severity: AuditSeverity.LOW
    })
  }
  
  /**
   * Data modification event logging
   */
  async logDataModification(
    resource: string,
    action: string,
    user: AuthUser,
    resourceId?: string,
    details?: Record<string, any>,
    success: boolean = true
  ) {
    const eventType = this.getDataModificationEventType(resource, action)
    
    await this.logEvent(eventType, `${action} ${resource}`, {
      user,
      resource,
      resourceId,
      details,
      success,
      severity: success ? AuditSeverity.LOW : AuditSeverity.MEDIUM
    })
  }
  
  /**
   * External API call logging
   */
  async logExternalAPICall(
    apiName: string,
    endpoint: string,
    method: string,
    success: boolean,
    responseTime?: number,
    errorMessage?: string,
    details?: Record<string, any>
  ) {
    const eventType = success ? AuditEventType.SMSFRESH_API_CALL : AuditEventType.SMSFRESH_API_ERROR
    
    await this.logEvent(eventType, `${method} ${endpoint}`, {
      resource: apiName,
      details: {
        ...details,
        responseTime,
        method,
        endpoint
      },
      success,
      errorMessage,
      severity: success ? AuditSeverity.LOW : AuditSeverity.MEDIUM
    })
  }
  
  /**
   * System event logging
   */
  async logSystemEvent(
    eventType: AuditEventType,
    action: string,
    user?: AuthUser,
    details?: Record<string, any>,
    success: boolean = true
  ) {
    await this.logEvent(eventType, action, {
      user,
      details,
      success,
      severity: success ? AuditSeverity.LOW : AuditSeverity.HIGH
    })
  }
  
  /**
   * Get event type for data access
   */
  private getDataAccessEventType(resource: string, action: string): AuditEventType {
    const key = `${resource.toUpperCase()}_${action.toUpperCase()}`
    return (AuditEventType as any)[key] || AuditEventType.ANALYTICS_VIEW
  }
  
  /**
   * Get event type for data modification
   */
  private getDataModificationEventType(resource: string, action: string): AuditEventType {
    const key = `${resource.toUpperCase()}_${action.toUpperCase()}`
    return (AuditEventType as any)[key] || AuditEventType.CONFIG_CHANGE
  }
  
  /**
   * Get recent audit logs
   */
  async getRecentLogs(limit: number = 100): Promise<AuditLogEntry[]> {
    // In production, query from database
    // return await prisma.auditLog.findMany({
    //   orderBy: { timestamp: 'desc' },
    //   take: limit
    // })
    
    // For now, return from buffer
    return this.logBuffer.slice(0, limit)
  }
  
  /**
   * Get security alerts
   */
  async getSecurityAlerts(resolved: boolean = false): Promise<SecurityAlert[]> {
    // In production, query from database
    // return await prisma.securityAlert.findMany({
    //   where: { resolved },
    //   orderBy: { createdAt: 'desc' }
    // })
    
    // For now, return from buffer
    return this.alertBuffer.filter(alert => alert.resolved === resolved)
  }
  
  /**
   * Cleanup old logs based on retention policy
   */
  async cleanupOldLogs() {
    const retentionDays = AUDIT_CONFIG.retention.auditLogs
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays)
    
    try {
      // In production, delete from database
      // await prisma.auditLog.deleteMany({
      //   where: {
      //     timestamp: {
      //       lt: cutoffDate
      //     }
      //   }
      // })
      
      console.log(`Cleaned up audit logs older than ${retentionDays} days`)
    } catch (error) {
      console.error('Failed to cleanup old audit logs:', error)
    }
  }
  
  /**
   * Shutdown and flush remaining logs
   */
  async shutdown() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval)
    }
    await this.flushBuffers()
  }
}

// Export singleton instance
export const auditLogger = AuditLogger.getInstance()

// Convenience functions
export const logAuthentication = auditLogger.logAuthentication.bind(auditLogger)
export const logDataAccess = auditLogger.logDataAccess.bind(auditLogger)
export const logDataModification = auditLogger.logDataModification.bind(auditLogger)
export const logExternalAPICall = auditLogger.logExternalAPICall.bind(auditLogger)
export const logSystemEvent = auditLogger.logSystemEvent.bind(auditLogger)
export const logSecurityAlert = auditLogger.logSecurityAlert.bind(auditLogger)