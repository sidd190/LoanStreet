import { NextRequest, NextResponse } from 'next/server'
import { withAuthAndRole } from '@/lib/middleware/auth'
import { getSystemHealth, getCurrentMetrics, getPerformanceStats } from '@/lib/security/monitoring'
import { getErrorStats } from '@/lib/security/errorTracking'
import { auditLogger } from '@/lib/security/auditLogger'

/**
 * System health and monitoring endpoint
 * GET /api/admin/system/health - Admin only
 */
export async function GET(request: NextRequest) {
  return withAuthAndRole(['ADMIN'])(request, async (req) => {
    try {
      // Log access to system health endpoint
      await auditLogger.logDataAccess(
        'system',
        'health_check',
        req.user!,
        undefined,
        { endpoint: '/api/admin/system/health' }
      )

      // Get system health status
      const health = getSystemHealth()
      
      // Get current metrics
      const metrics = getCurrentMetrics()
      
      // Get performance statistics
      const performanceStats = getPerformanceStats()
      
      // Get error statistics for last hour
      const errorStats = getErrorStats(3600000) // 1 hour in milliseconds
      
      // Get recent audit logs
      const recentLogs = await auditLogger.getRecentLogs(50)
      
      // Get security alerts
      const securityAlerts = await auditLogger.getSecurityAlerts(false) // unresolved alerts
      
      const response = {
        success: true,
        data: {
          health: {
            status: health.overall,
            services: health.services,
            issues: health.issues,
            timestamp: new Date().toISOString()
          },
          metrics: metrics ? {
            timestamp: metrics.timestamp,
            activeConnections: metrics.activeConnections,
            requestCount: metrics.requestCount,
            errorCount: metrics.errorCount,
            responseTime: metrics.responseTime,
            externalAPIStatus: metrics.externalAPIStatus,
            memoryUsage: metrics.memoryUsage
          } : null,
          performance: {
            totalRequests: performanceStats.totalRequests,
            successRate: performanceStats.successRate,
            averageResponseTime: performanceStats.averageResponseTime,
            p95ResponseTime: performanceStats.p95ResponseTime,
            p99ResponseTime: performanceStats.p99ResponseTime,
            errorRate: performanceStats.errorRate
          },
          errors: {
            totalErrors: errorStats.totalErrors,
            uniqueErrors: errorStats.uniqueErrors,
            errorsByCategory: errorStats.errorsByCategory,
            errorsBySeverity: errorStats.errorsBySeverity,
            topErrors: errorStats.topErrors.slice(0, 5).map(error => ({
              id: error.id,
              message: error.message,
              category: error.category,
              severity: error.severity,
              count: error.count,
              lastOccurrence: error.lastOccurrence
            }))
          },
          security: {
            recentLogs: recentLogs.slice(0, 10).map(log => ({
              eventType: log.eventType,
              action: log.action,
              success: log.success,
              timestamp: log.timestamp,
              userEmail: log.userEmail,
              resource: log.resource
            })),
            activeAlerts: securityAlerts.slice(0, 10).map(alert => ({
              alertType: alert.alertType,
              severity: alert.severity,
              description: alert.description,
              createdAt: alert.createdAt
            }))
          }
        }
      }
      
      return NextResponse.json(response)
    } catch (error) {
      console.error('System health check error:', error)
      
      // Track the error
      await auditLogger.logSystemEvent(
        'API_ERROR' as any,
        'System health check failed',
        req.user,
        { error: error instanceof Error ? error.message : 'Unknown error' },
        false
      )
      
      return NextResponse.json(
        { 
          success: false, 
          message: 'Failed to retrieve system health information',
          error: process.env.NODE_ENV === 'development' ? error : undefined
        },
        { status: 500 }
      )
    }
  })
}