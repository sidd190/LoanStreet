import { auditLogger, AuditEventType, AuditSeverity } from './auditLogger'
import { systemMonitor } from './monitoring'
import { AuthUser } from '../auth'

/**
 * Comprehensive error tracking and reporting system
 */

export enum ErrorCategory {
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  VALIDATION = 'VALIDATION',
  DATABASE = 'DATABASE',
  EXTERNAL_API = 'EXTERNAL_API',
  FILE_SYSTEM = 'FILE_SYSTEM',
  NETWORK = 'NETWORK',
  BUSINESS_LOGIC = 'BUSINESS_LOGIC',
  SYSTEM = 'SYSTEM',
  SECURITY = 'SECURITY',
  RATE_LIMIT = 'RATE_LIMIT',
  UNKNOWN = 'UNKNOWN'
}

export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export interface ErrorContext {
  userId?: string
  userEmail?: string
  userRole?: string
  ipAddress?: string
  userAgent?: string
  requestId?: string
  sessionId?: string
  endpoint?: string
  method?: string
  parameters?: Record<string, any>
  headers?: Record<string, string>
  timestamp: Date
}

export interface TrackedError {
  id: string
  category: ErrorCategory
  severity: ErrorSeverity
  message: string
  stack?: string
  code?: string
  context: ErrorContext
  metadata: Record<string, any>
  count: number
  firstOccurrence: Date
  lastOccurrence: Date
  resolved: boolean
  resolvedBy?: string
  resolvedAt?: Date
  tags: string[]
}

export interface ErrorPattern {
  pattern: string
  category: ErrorCategory
  severity: ErrorSeverity
  description: string
  suggestedAction: string
}

class ErrorTracker {
  private static instance: ErrorTracker
  private errors: Map<string, TrackedError> = new Map()
  private errorPatterns: ErrorPattern[] = []
  private recentErrors: TrackedError[] = []
  private maxRecentErrors = 1000
  
  static getInstance(): ErrorTracker {
    if (!ErrorTracker.instance) {
      ErrorTracker.instance = new ErrorTracker()
      ErrorTracker.instance.initializeErrorPatterns()
    }
    return ErrorTracker.instance
  }
  
  /**
   * Initialize known error patterns
   */
  private initializeErrorPatterns() {
    this.errorPatterns = [
      // Authentication errors
      {
        pattern: /invalid.*token|token.*expired|unauthorized/i,
        category: ErrorCategory.AUTHENTICATION,
        severity: ErrorSeverity.MEDIUM,
        description: 'Authentication token issues',
        suggestedAction: 'Check token validation and refresh logic'
      },
      {
        pattern: /login.*failed|invalid.*credentials/i,
        category: ErrorCategory.AUTHENTICATION,
        severity: ErrorSeverity.MEDIUM,
        description: 'Login authentication failures',
        suggestedAction: 'Monitor for brute force attacks'
      },
      
      // Authorization errors
      {
        pattern: /insufficient.*permissions|access.*denied|forbidden/i,
        category: ErrorCategory.AUTHORIZATION,
        severity: ErrorSeverity.MEDIUM,
        description: 'Authorization failures',
        suggestedAction: 'Review user permissions and role assignments'
      },
      
      // Database errors
      {
        pattern: /database.*connection|connection.*timeout|prisma/i,
        category: ErrorCategory.DATABASE,
        severity: ErrorSeverity.HIGH,
        description: 'Database connectivity issues',
        suggestedAction: 'Check database server status and connection pool'
      },
      {
        pattern: /unique.*constraint|duplicate.*key/i,
        category: ErrorCategory.DATABASE,
        severity: ErrorSeverity.MEDIUM,
        description: 'Data integrity violations',
        suggestedAction: 'Review data validation and uniqueness constraints'
      },
      
      // External API errors
      {
        pattern: /smsfresh|sms.*api|whatsapp.*api/i,
        category: ErrorCategory.EXTERNAL_API,
        severity: ErrorSeverity.MEDIUM,
        description: 'External messaging API issues',
        suggestedAction: 'Check API credentials and service status'
      },
      {
        pattern: /network.*error|timeout|connection.*refused/i,
        category: ErrorCategory.NETWORK,
        severity: ErrorSeverity.MEDIUM,
        description: 'Network connectivity issues',
        suggestedAction: 'Check network connectivity and firewall settings'
      },
      
      // Validation errors
      {
        pattern: /validation.*failed|invalid.*input|schema.*error/i,
        category: ErrorCategory.VALIDATION,
        severity: ErrorSeverity.LOW,
        description: 'Input validation failures',
        suggestedAction: 'Review input validation rules and user guidance'
      },
      
      // File system errors
      {
        pattern: /file.*not.*found|permission.*denied|disk.*full/i,
        category: ErrorCategory.FILE_SYSTEM,
        severity: ErrorSeverity.MEDIUM,
        description: 'File system access issues',
        suggestedAction: 'Check file permissions and disk space'
      },
      
      // Rate limiting errors
      {
        pattern: /rate.*limit|too.*many.*requests/i,
        category: ErrorCategory.RATE_LIMIT,
        severity: ErrorSeverity.MEDIUM,
        description: 'Rate limiting triggered',
        suggestedAction: 'Monitor for abuse and adjust rate limits if needed'
      },
      
      // Security errors
      {
        pattern: /xss|injection|malicious|suspicious/i,
        category: ErrorCategory.SECURITY,
        severity: ErrorSeverity.HIGH,
        description: 'Security threat detected',
        suggestedAction: 'Investigate potential security breach'
      }
    ]
  }
  
  /**
   * Track an error
   */
  async trackError(
    error: Error | string,
    context: Partial<ErrorContext> = {},
    metadata: Record<string, any> = {}
  ): Promise<string> {
    const errorMessage = error instanceof Error ? error.message : error
    const errorStack = error instanceof Error ? error.stack : undefined
    
    // Generate error ID based on message and stack
    const errorId = this.generateErrorId(errorMessage, errorStack)
    
    // Categorize and assess severity
    const { category, severity } = this.categorizeError(errorMessage, errorStack)
    
    // Create or update error entry
    const now = new Date()
    const fullContext: ErrorContext = {
      timestamp: now,
      ...context
    }
    
    let trackedError = this.errors.get(errorId)
    
    if (trackedError) {
      // Update existing error
      trackedError.count++
      trackedError.lastOccurrence = now
      trackedError.context = fullContext // Update with latest context
      trackedError.metadata = { ...trackedError.metadata, ...metadata }
    } else {
      // Create new error entry
      trackedError = {
        id: errorId,
        category,
        severity,
        message: errorMessage,
        stack: errorStack,
        context: fullContext,
        metadata,
        count: 1,
        firstOccurrence: now,
        lastOccurrence: now,
        resolved: false,
        tags: this.generateTags(errorMessage, category, context)
      }
      
      this.errors.set(errorId, trackedError)
    }
    
    // Add to recent errors
    this.recentErrors.unshift(trackedError)
    if (this.recentErrors.length > this.maxRecentErrors) {
      this.recentErrors = this.recentErrors.slice(0, this.maxRecentErrors)
    }
    
    // Log to audit system
    await this.logErrorToAudit(trackedError, context)
    
    // Record performance impact
    systemMonitor.recordPerformance(
      `error:${category}`,
      0,
      false,
      errorMessage,
      { errorId, category, severity }
    )
    
    // Check for critical errors that need immediate attention
    if (severity === ErrorSeverity.CRITICAL) {
      await this.handleCriticalError(trackedError)
    }
    
    // Check for error patterns that might indicate attacks
    await this.checkForSecurityPatterns(trackedError)
    
    return errorId
  }
  
  /**
   * Generate unique error ID
   */
  private generateErrorId(message: string, stack?: string): string {
    // Create a hash-like ID based on error message and first few lines of stack
    const stackLines = stack?.split('\n').slice(0, 3).join('\n') || ''
    const combined = `${message}:${stackLines}`
    
    // Simple hash function
    let hash = 0
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    
    return `error_${Math.abs(hash).toString(36)}`
  }
  
  /**
   * Categorize error and assess severity
   */
  private categorizeError(message: string, stack?: string): {
    category: ErrorCategory
    severity: ErrorSeverity
  } {
    const fullText = `${message} ${stack || ''}`.toLowerCase()
    
    // Check against known patterns
    for (const pattern of this.errorPatterns) {
      if (pattern.pattern.test(fullText)) {
        return {
          category: pattern.category,
          severity: pattern.severity
        }
      }
    }
    
    // Default categorization based on keywords
    if (fullText.includes('critical') || fullText.includes('fatal')) {
      return { category: ErrorCategory.SYSTEM, severity: ErrorSeverity.CRITICAL }
    }
    
    if (fullText.includes('warning') || fullText.includes('warn')) {
      return { category: ErrorCategory.UNKNOWN, severity: ErrorSeverity.LOW }
    }
    
    return { category: ErrorCategory.UNKNOWN, severity: ErrorSeverity.MEDIUM }
  }
  
  /**
   * Generate tags for error
   */
  private generateTags(
    message: string,
    category: ErrorCategory,
    context: Partial<ErrorContext>
  ): string[] {
    const tags: string[] = [category.toLowerCase()]
    
    // Add endpoint-based tags
    if (context.endpoint) {
      tags.push(`endpoint:${context.endpoint.split('/')[1] || 'root'}`)
    }
    
    // Add method-based tags
    if (context.method) {
      tags.push(`method:${context.method.toLowerCase()}`)
    }
    
    // Add user-based tags
    if (context.userRole) {
      tags.push(`role:${context.userRole.toLowerCase()}`)
    }
    
    // Add message-based tags
    const messageLower = message.toLowerCase()
    if (messageLower.includes('timeout')) tags.push('timeout')
    if (messageLower.includes('connection')) tags.push('connection')
    if (messageLower.includes('permission')) tags.push('permission')
    if (messageLower.includes('validation')) tags.push('validation')
    
    return tags
  }
  
  /**
   * Log error to audit system
   */
  private async logErrorToAudit(
    error: TrackedError,
    context: Partial<ErrorContext>
  ) {
    const user: AuthUser | undefined = context.userId ? {
      id: context.userId,
      email: context.userEmail || '',
      name: '',
      role: (context.userRole as 'ADMIN' | 'EMPLOYEE') || 'EMPLOYEE',
      permissions: [],
      isActive: true
    } : undefined
    
    await auditLogger.logEvent(
      AuditEventType.API_ERROR,
      `Error occurred: ${error.message}`,
      {
        user,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        resource: context.endpoint,
        details: {
          errorId: error.id,
          category: error.category,
          severity: error.severity,
          count: error.count,
          stack: error.stack,
          metadata: error.metadata
        },
        success: false,
        errorMessage: error.message,
        severity: this.mapToAuditSeverity(error.severity),
        sessionId: context.sessionId,
        requestId: context.requestId
      }
    )
  }
  
  /**
   * Handle critical errors
   */
  private async handleCriticalError(error: TrackedError) {
    // Log security alert for critical errors
    await auditLogger.logSecurityAlert(
      'CRITICAL_ERROR',
      `Critical error occurred: ${error.message}`,
      {
        severity: AuditSeverity.CRITICAL,
        details: {
          errorId: error.id,
          category: error.category,
          count: error.count,
          firstOccurrence: error.firstOccurrence,
          lastOccurrence: error.lastOccurrence
        }
      }
    )
    
    // In production, you might want to:
    // - Send notifications to administrators
    // - Create incident tickets
    // - Trigger automated recovery procedures
    console.error(`🚨 CRITICAL ERROR: ${error.message}`, {
      errorId: error.id,
      category: error.category,
      count: error.count
    })
  }
  
  /**
   * Check for security-related error patterns
   */
  private async checkForSecurityPatterns(error: TrackedError) {
    const securityKeywords = [
      'injection', 'xss', 'csrf', 'malicious', 'suspicious',
      'unauthorized', 'brute force', 'attack', 'exploit'
    ]
    
    const errorText = `${error.message} ${error.stack || ''}`.toLowerCase()
    const hasSecurityKeywords = securityKeywords.some(keyword => 
      errorText.includes(keyword)
    )
    
    if (hasSecurityKeywords || error.category === ErrorCategory.SECURITY) {
      await auditLogger.logSecurityAlert(
        'SECURITY_ERROR_PATTERN',
        `Potential security issue detected: ${error.message}`,
        {
          severity: AuditSeverity.HIGH,
          ipAddress: error.context.ipAddress,
          userAgent: error.context.userAgent,
          userId: error.context.userId,
          details: {
            errorId: error.id,
            category: error.category,
            endpoint: error.context.endpoint,
            method: error.context.method
          }
        }
      )
    }
    
    // Check for repeated errors from same IP (potential attack)
    if (error.context.ipAddress && error.count > 10) {
      const recentErrorsFromIP = this.recentErrors.filter(e => 
        e.context.ipAddress === error.context.ipAddress &&
        e.lastOccurrence > new Date(Date.now() - 300000) // Last 5 minutes
      )
      
      if (recentErrorsFromIP.length > 20) {
        await auditLogger.logSecurityAlert(
          'REPEATED_ERRORS_FROM_IP',
          `High error rate from IP ${error.context.ipAddress}`,
          {
            severity: AuditSeverity.HIGH,
            ipAddress: error.context.ipAddress,
            details: {
              errorCount: recentErrorsFromIP.length,
              timeWindow: '5 minutes',
              errors: recentErrorsFromIP.map(e => ({
                id: e.id,
                message: e.message,
                count: e.count
              }))
            }
          }
        )
      }
    }
  }
  
  /**
   * Map error severity to audit severity
   */
  private mapToAuditSeverity(severity: ErrorSeverity): AuditSeverity {
    switch (severity) {
      case ErrorSeverity.LOW: return AuditSeverity.LOW
      case ErrorSeverity.MEDIUM: return AuditSeverity.MEDIUM
      case ErrorSeverity.HIGH: return AuditSeverity.HIGH
      case ErrorSeverity.CRITICAL: return AuditSeverity.CRITICAL
      default: return AuditSeverity.MEDIUM
    }
  }
  
  /**
   * Get error statistics
   */
  getErrorStats(timeWindow?: number): {
    totalErrors: number
    uniqueErrors: number
    errorsByCategory: Record<ErrorCategory, number>
    errorsBySeverity: Record<ErrorSeverity, number>
    topErrors: TrackedError[]
    recentErrors: TrackedError[]
  } {
    const cutoff = timeWindow ? new Date(Date.now() - timeWindow) : null
    const relevantErrors = cutoff 
      ? Array.from(this.errors.values()).filter(e => e.lastOccurrence > cutoff)
      : Array.from(this.errors.values())
    
    const errorsByCategory = {} as Record<ErrorCategory, number>
    const errorsBySeverity = {} as Record<ErrorSeverity, number>
    
    // Initialize counters
    Object.values(ErrorCategory).forEach(cat => errorsByCategory[cat] = 0)
    Object.values(ErrorSeverity).forEach(sev => errorsBySeverity[sev] = 0)
    
    let totalErrorCount = 0
    
    for (const error of relevantErrors) {
      totalErrorCount += error.count
      errorsByCategory[error.category] += error.count
      errorsBySeverity[error.severity] += error.count
    }
    
    // Get top errors by count
    const topErrors = relevantErrors
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
    
    // Get recent errors
    const recentErrors = this.recentErrors
      .filter(e => !cutoff || e.lastOccurrence > cutoff)
      .slice(0, 20)
    
    return {
      totalErrors: totalErrorCount,
      uniqueErrors: relevantErrors.length,
      errorsByCategory,
      errorsBySeverity,
      topErrors,
      recentErrors
    }
  }
  
  /**
   * Get specific error details
   */
  getError(errorId: string): TrackedError | null {
    return this.errors.get(errorId) || null
  }
  
  /**
   * Mark error as resolved
   */
  async resolveError(errorId: string, resolvedBy: string): Promise<boolean> {
    const error = this.errors.get(errorId)
    if (!error) return false
    
    error.resolved = true
    error.resolvedBy = resolvedBy
    error.resolvedAt = new Date()
    
    // Log resolution
    await auditLogger.logSystemEvent(
      AuditEventType.CONFIG_CHANGE,
      `Error ${errorId} marked as resolved`,
      undefined,
      { errorId, resolvedBy, errorMessage: error.message }
    )
    
    return true
  }
  
  /**
   * Clean up old resolved errors
   */
  cleanupResolvedErrors(olderThanDays: number = 30) {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - olderThanDays)
    
    let cleanedCount = 0
    
    for (const [id, error] of this.errors.entries()) {
      if (error.resolved && error.resolvedAt && error.resolvedAt < cutoff) {
        this.errors.delete(id)
        cleanedCount++
      }
    }
    
    console.log(`Cleaned up ${cleanedCount} resolved errors older than ${olderThanDays} days`)
  }
}

// Export singleton instance
export const errorTracker = ErrorTracker.getInstance()

// Convenience functions
export const trackError = errorTracker.trackError.bind(errorTracker)
export const getErrorStats = errorTracker.getErrorStats.bind(errorTracker)
export const getError = errorTracker.getError.bind(errorTracker)
export const resolveError = errorTracker.resolveError.bind(errorTracker)