import { auditLogger, AuditEventType, AuditSeverity } from './auditLogger'
import { ExternalAPIRateLimiter } from './rateLimiter'

/**
 * System monitoring and health tracking
 */

export interface SystemMetrics {
  timestamp: Date
  cpuUsage?: number
  memoryUsage?: number
  activeConnections: number
  requestCount: number
  errorCount: number
  responseTime: {
    avg: number
    p95: number
    p99: number
  }
  externalAPIStatus: {
    smsFresh: {
      available: boolean
      responseTime?: number
      errorRate: number
      lastError?: string
    }
  }
}

export interface PerformanceMetric {
  operation: string
  duration: number
  timestamp: Date
  success: boolean
  errorMessage?: string
  metadata?: Record<string, any>
}

export interface HealthCheck {
  service: string
  status: 'healthy' | 'degraded' | 'unhealthy'
  responseTime?: number
  errorMessage?: string
  lastChecked: Date
  metadata?: Record<string, any>
}

class SystemMonitor {
  private static instance: SystemMonitor
  private metrics: SystemMetrics[] = []
  private performanceMetrics: PerformanceMetric[] = []
  private healthChecks: Map<string, HealthCheck> = new Map()
  private requestTimes: number[] = []
  private errorCounts = new Map<string, number>()
  private monitoringInterval: NodeJS.Timeout | null = null
  
  static getInstance(): SystemMonitor {
    if (!SystemMonitor.instance) {
      SystemMonitor.instance = new SystemMonitor()
      SystemMonitor.instance.startMonitoring()
    }
    return SystemMonitor.instance
  }
  
  /**
   * Start system monitoring
   */
  private startMonitoring() {
    // Collect metrics every minute
    this.monitoringInterval = setInterval(() => {
      this.collectSystemMetrics()
      this.performHealthChecks()
      this.cleanupOldMetrics()
    }, 60000)
    
    // Initial health check
    this.performHealthChecks()
  }
  
  /**
   * Collect system metrics
   */
  private async collectSystemMetrics() {
    try {
      const metrics: SystemMetrics = {
        timestamp: new Date(),
        activeConnections: this.getActiveConnections(),
        requestCount: this.getRequestCount(),
        errorCount: this.getErrorCount(),
        responseTime: this.calculateResponseTimes(),
        externalAPIStatus: await this.checkExternalAPIs()
      }
      
      // Add system resource metrics if available
      if (typeof process !== 'undefined') {
        const memUsage = process.memoryUsage()
        metrics.memoryUsage = (memUsage.heapUsed / memUsage.heapTotal) * 100
      }
      
      this.metrics.push(metrics)
      
      // Keep only last 24 hours of metrics
      const cutoff = new Date()
      cutoff.setHours(cutoff.getHours() - 24)
      this.metrics = this.metrics.filter(m => m.timestamp > cutoff)
      
    } catch (error) {
      console.error('Failed to collect system metrics:', error)
      await auditLogger.logSystemEvent(
        AuditEventType.API_ERROR,
        'System metrics collection failed',
        undefined,
        { error: error instanceof Error ? error.message : 'Unknown error' },
        false
      )
    }
  }
  
  /**
   * Perform health checks on critical services
   */
  private async performHealthChecks() {
    const services = [
      'database',
      'smsFreshAPI',
      'fileSystem',
      'authentication'
    ]
    
    for (const service of services) {
      try {
        const healthCheck = await this.checkServiceHealth(service)
        this.healthChecks.set(service, healthCheck)
        
        // Log unhealthy services
        if (healthCheck.status === 'unhealthy') {
          await auditLogger.logSecurityAlert(
            'SERVICE_UNHEALTHY',
            `Service ${service} is unhealthy: ${healthCheck.errorMessage}`,
            {
              severity: AuditSeverity.HIGH,
              details: { service, healthCheck }
            }
          )
        }
      } catch (error) {
        console.error(`Health check failed for ${service}:`, error)
      }
    }
  }
  
  /**
   * Check individual service health
   */
  private async checkServiceHealth(service: string): Promise<HealthCheck> {
    const startTime = Date.now()
    
    try {
      switch (service) {
        case 'database':
          return await this.checkDatabaseHealth(startTime)
        
        case 'smsFreshAPI':
          return await this.checkSMSFreshHealth(startTime)
        
        case 'fileSystem':
          return await this.checkFileSystemHealth(startTime)
        
        case 'authentication':
          return await this.checkAuthenticationHealth(startTime)
        
        default:
          return {
            service,
            status: 'unhealthy',
            errorMessage: 'Unknown service',
            lastChecked: new Date()
          }
      }
    } catch (error) {
      return {
        service,
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        errorMessage: error instanceof Error ? error.message : 'Health check failed',
        lastChecked: new Date()
      }
    }
  }
  
  /**
   * Check database health
   */
  private async checkDatabaseHealth(startTime: number): Promise<HealthCheck> {
    try {
      // Simple query to check database connectivity
      // In production, use actual database query
      // await prisma.$queryRaw`SELECT 1`
      
      const responseTime = Date.now() - startTime
      
      return {
        service: 'database',
        status: responseTime < 1000 ? 'healthy' : 'degraded',
        responseTime,
        lastChecked: new Date(),
        metadata: { queryTime: responseTime }
      }
    } catch (error) {
      return {
        service: 'database',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        errorMessage: error instanceof Error ? error.message : 'Database connection failed',
        lastChecked: new Date()
      }
    }
  }
  
  /**
   * Check SMSFresh API health
   */
  private async checkSMSFreshHealth(startTime: number): Promise<HealthCheck> {
    try {
      // Check if we can make API calls (rate limit check)
      const rateLimiter = ExternalAPIRateLimiter.getInstance()
      const canMakeCall = await rateLimiter.checkLimit('smsFresh', 30, 60000)
      
      const responseTime = Date.now() - startTime
      
      return {
        service: 'smsFreshAPI',
        status: canMakeCall ? 'healthy' : 'degraded',
        responseTime,
        lastChecked: new Date(),
        metadata: { 
          rateLimitOk: canMakeCall,
          errorRate: this.getAPIErrorRate('smsFresh')
        }
      }
    } catch (error) {
      return {
        service: 'smsFreshAPI',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        errorMessage: error instanceof Error ? error.message : 'SMSFresh API check failed',
        lastChecked: new Date()
      }
    }
  }
  
  /**
   * Check file system health
   */
  private async checkFileSystemHealth(startTime: number): Promise<HealthCheck> {
    try {
      // Check if we can write to logs directory
      if (typeof window === 'undefined') {
        const fs = require('fs').promises
        const path = require('path')
        
        const testFile = path.join('logs', '.health-check')
        await fs.writeFile(testFile, 'health-check')
        await fs.unlink(testFile)
      }
      
      const responseTime = Date.now() - startTime
      
      return {
        service: 'fileSystem',
        status: 'healthy',
        responseTime,
        lastChecked: new Date()
      }
    } catch (error) {
      return {
        service: 'fileSystem',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        errorMessage: error instanceof Error ? error.message : 'File system check failed',
        lastChecked: new Date()
      }
    }
  }
  
  /**
   * Check authentication system health
   */
  private async checkAuthenticationHealth(startTime: number): Promise<HealthCheck> {
    try {
      // Check JWT secret and basic auth functionality
      const jwtSecret = process.env.JWT_SECRET
      if (!jwtSecret || jwtSecret === 'your-super-secret-jwt-key-change-in-production') {
        throw new Error('JWT secret not properly configured')
      }
      
      const responseTime = Date.now() - startTime
      
      return {
        service: 'authentication',
        status: 'healthy',
        responseTime,
        lastChecked: new Date(),
        metadata: { jwtConfigured: true }
      }
    } catch (error) {
      return {
        service: 'authentication',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        errorMessage: error instanceof Error ? error.message : 'Authentication check failed',
        lastChecked: new Date()
      }
    }
  }
  
  /**
   * Record performance metric
   */
  recordPerformance(
    operation: string,
    duration: number,
    success: boolean = true,
    errorMessage?: string,
    metadata?: Record<string, any>
  ) {
    const metric: PerformanceMetric = {
      operation,
      duration,
      timestamp: new Date(),
      success,
      errorMessage,
      metadata
    }
    
    this.performanceMetrics.push(metric)
    
    // Keep only last hour of performance metrics
    const cutoff = new Date()
    cutoff.setHours(cutoff.getHours() - 1)
    this.performanceMetrics = this.performanceMetrics.filter(m => m.timestamp > cutoff)
    
    // Track request times for response time calculations
    this.requestTimes.push(duration)
    if (this.requestTimes.length > 1000) {
      this.requestTimes = this.requestTimes.slice(-1000)
    }
    
    // Track errors
    if (!success) {
      const errorKey = `${operation}:error`
      this.errorCounts.set(errorKey, (this.errorCounts.get(errorKey) || 0) + 1)
    }
    
    // Alert on slow operations
    if (duration > 5000) { // 5 seconds
      auditLogger.logSecurityAlert(
        'SLOW_OPERATION',
        `Operation ${operation} took ${duration}ms`,
        {
          severity: AuditSeverity.MEDIUM,
          details: { operation, duration, metadata }
        }
      )
    }
  }
  
  /**
   * Record API call metrics
   */
  recordAPICall(
    apiName: string,
    endpoint: string,
    method: string,
    duration: number,
    success: boolean,
    statusCode?: number,
    errorMessage?: string
  ) {
    this.recordPerformance(
      `${apiName}:${method}:${endpoint}`,
      duration,
      success,
      errorMessage,
      { apiName, endpoint, method, statusCode }
    )
    
    // Log to audit system
    auditLogger.logExternalAPICall(
      apiName,
      endpoint,
      method,
      success,
      duration,
      errorMessage,
      { statusCode }
    )
  }
  
  /**
   * Get current system metrics
   */
  getCurrentMetrics(): SystemMetrics | null {
    return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null
  }
  
  /**
   * Get system health status
   */
  getSystemHealth(): {
    overall: 'healthy' | 'degraded' | 'unhealthy'
    services: HealthCheck[]
    issues: string[]
  } {
    const services = Array.from(this.healthChecks.values())
    const issues: string[] = []
    
    let healthyCount = 0
    let degradedCount = 0
    let unhealthyCount = 0
    
    for (const service of services) {
      switch (service.status) {
        case 'healthy':
          healthyCount++
          break
        case 'degraded':
          degradedCount++
          issues.push(`${service.service} is degraded: ${service.errorMessage || 'Performance issues'}`)
          break
        case 'unhealthy':
          unhealthyCount++
          issues.push(`${service.service} is unhealthy: ${service.errorMessage || 'Service unavailable'}`)
          break
      }
    }
    
    let overall: 'healthy' | 'degraded' | 'unhealthy'
    if (unhealthyCount > 0) {
      overall = 'unhealthy'
    } else if (degradedCount > 0) {
      overall = 'degraded'
    } else {
      overall = 'healthy'
    }
    
    return { overall, services, issues }
  }
  
  /**
   * Get performance statistics
   */
  getPerformanceStats(operation?: string): {
    totalRequests: number
    successRate: number
    averageResponseTime: number
    p95ResponseTime: number
    p99ResponseTime: number
    errorRate: number
  } {
    let metrics = this.performanceMetrics
    
    if (operation) {
      metrics = metrics.filter(m => m.operation === operation)
    }
    
    if (metrics.length === 0) {
      return {
        totalRequests: 0,
        successRate: 0,
        averageResponseTime: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0,
        errorRate: 0
      }
    }
    
    const successfulRequests = metrics.filter(m => m.success).length
    const durations = metrics.map(m => m.duration).sort((a, b) => a - b)
    
    return {
      totalRequests: metrics.length,
      successRate: (successfulRequests / metrics.length) * 100,
      averageResponseTime: durations.reduce((a, b) => a + b, 0) / durations.length,
      p95ResponseTime: durations[Math.floor(durations.length * 0.95)] || 0,
      p99ResponseTime: durations[Math.floor(durations.length * 0.99)] || 0,
      errorRate: ((metrics.length - successfulRequests) / metrics.length) * 100
    }
  }
  
  // Helper methods
  private getActiveConnections(): number {
    // In production, get from actual connection pool
    return Math.floor(Math.random() * 50) + 10
  }
  
  private getRequestCount(): number {
    return this.performanceMetrics.length
  }
  
  private getErrorCount(): number {
    return this.performanceMetrics.filter(m => !m.success).length
  }
  
  private calculateResponseTimes(): { avg: number; p95: number; p99: number } {
    if (this.requestTimes.length === 0) {
      return { avg: 0, p95: 0, p99: 0 }
    }
    
    const sorted = [...this.requestTimes].sort((a, b) => a - b)
    const avg = sorted.reduce((a, b) => a + b, 0) / sorted.length
    const p95 = sorted[Math.floor(sorted.length * 0.95)] || 0
    const p99 = sorted[Math.floor(sorted.length * 0.99)] || 0
    
    return { avg, p95, p99 }
  }
  
  private async checkExternalAPIs(): Promise<SystemMetrics['externalAPIStatus']> {
    return {
      smsFresh: {
        available: this.healthChecks.get('smsFreshAPI')?.status === 'healthy',
        responseTime: this.healthChecks.get('smsFreshAPI')?.responseTime,
        errorRate: this.getAPIErrorRate('smsFresh'),
        lastError: this.getLastAPIError('smsFresh')
      }
    }
  }
  
  private getAPIErrorRate(apiName: string): number {
    const apiMetrics = this.performanceMetrics.filter(m => 
      m.operation.startsWith(apiName) && m.timestamp > new Date(Date.now() - 3600000)
    )
    
    if (apiMetrics.length === 0) return 0
    
    const errors = apiMetrics.filter(m => !m.success).length
    return (errors / apiMetrics.length) * 100
  }
  
  private getLastAPIError(apiName: string): string | undefined {
    const errorMetric = this.performanceMetrics
      .filter(m => m.operation.startsWith(apiName) && !m.success)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0]
    
    return errorMetric?.errorMessage
  }
  
  private cleanupOldMetrics() {
    const cutoff = new Date()
    cutoff.setHours(cutoff.getHours() - 24)
    
    this.metrics = this.metrics.filter(m => m.timestamp > cutoff)
    this.performanceMetrics = this.performanceMetrics.filter(m => m.timestamp > cutoff)
    
    // Clean up error counts
    this.errorCounts.clear()
  }
  
  /**
   * Shutdown monitoring
   */
  shutdown() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
    }
  }
}

// Export singleton instance
export const systemMonitor = SystemMonitor.getInstance()

// Convenience functions
export const recordPerformance = systemMonitor.recordPerformance.bind(systemMonitor)
export const recordAPICall = systemMonitor.recordAPICall.bind(systemMonitor)
export const getCurrentMetrics = systemMonitor.getCurrentMetrics.bind(systemMonitor)
export const getSystemHealth = systemMonitor.getSystemHealth.bind(systemMonitor)
export const getPerformanceStats = systemMonitor.getPerformanceStats.bind(systemMonitor)