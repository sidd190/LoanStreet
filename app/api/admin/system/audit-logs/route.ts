import { NextRequest, NextResponse } from 'next/server'
import { withAuthAndRole } from '@/lib/middleware/auth'
import { auditLogger, AuditEventType } from '@/lib/security/auditLogger'
import { validatePagination, validateDateRange } from '@/lib/security/validation'

/**
 * Audit logs endpoint
 * GET /api/admin/system/audit-logs - Admin only
 */
export async function GET(request: NextRequest) {
  return withAuthAndRole(['ADMIN'])(request, async (req) => {
    try {
      const { searchParams } = new URL(req.url)
      
      // Validate pagination parameters
      const paginationValidation = validatePagination(
        searchParams.get('limit') || undefined,
        searchParams.get('offset') || undefined
      )
      
      if (paginationValidation.errors.length > 0) {
        return NextResponse.json(
          {
            success: false,
            message: 'Invalid pagination parameters',
            errors: paginationValidation.errors
          },
          { status: 400 }
        )
      }
      
      // Validate date range parameters
      const dateValidation = validateDateRange(
        searchParams.get('dateFrom') || undefined,
        searchParams.get('dateTo') || undefined
      )
      
      if (dateValidation.errors.length > 0) {
        return NextResponse.json(
          {
            success: false,
            message: 'Invalid date range parameters',
            errors: dateValidation.errors
          },
          { status: 400 }
        )
      }
      
      // Parse filter parameters
      const eventType = searchParams.get('eventType') as AuditEventType | null
      const userId = searchParams.get('userId') || undefined
      const resource = searchParams.get('resource') || undefined
      const success = searchParams.get('success') ? searchParams.get('success') === 'true' : undefined
      const severity = searchParams.get('severity') || undefined
      
      // Log access to audit logs
      await auditLogger.logDataAccess(
        'audit_logs',
        'view',
        req.user!,
        undefined,
        {
          filters: {
            eventType,
            userId,
            resource,
            success,
            severity,
            dateFrom: dateValidation.dateFrom,
            dateTo: dateValidation.dateTo
          }
        }
      )
      
      // Get audit logs (in production, this would query the database)
      const allLogs = await auditLogger.getRecentLogs(1000)
      
      // Apply filters
      let filteredLogs = allLogs
      
      if (eventType) {
        filteredLogs = filteredLogs.filter(log => log.eventType === eventType)
      }
      
      if (userId) {
        filteredLogs = filteredLogs.filter(log => log.userId === userId)
      }
      
      if (resource) {
        filteredLogs = filteredLogs.filter(log => log.resource === resource)
      }
      
      if (success !== undefined) {
        filteredLogs = filteredLogs.filter(log => log.success === success)
      }
      
      if (severity) {
        filteredLogs = filteredLogs.filter(log => log.severity === severity)
      }
      
      if (dateValidation.dateFrom) {
        filteredLogs = filteredLogs.filter(log => 
          new Date(log.timestamp) >= dateValidation.dateFrom!
        )
      }
      
      if (dateValidation.dateTo) {
        filteredLogs = filteredLogs.filter(log => 
          new Date(log.timestamp) <= dateValidation.dateTo!
        )
      }
      
      // Apply pagination
      const total = filteredLogs.length
      const paginatedLogs = filteredLogs.slice(
        paginationValidation.offset,
        paginationValidation.offset + paginationValidation.limit
      )
      
      // Format logs for response (remove sensitive data)
      const formattedLogs = paginatedLogs.map(log => ({
        id: log.id,
        eventType: log.eventType,
        severity: log.severity,
        userId: log.userId,
        userEmail: log.userEmail,
        userRole: log.userRole,
        ipAddress: log.ipAddress,
        resource: log.resource,
        resourceId: log.resourceId,
        action: log.action,
        success: log.success,
        errorMessage: log.errorMessage,
        timestamp: log.timestamp,
        // Include limited details (remove sensitive information)
        details: log.details ? {
          ...log.details,
          // Remove potentially sensitive fields
          password: undefined,
          token: undefined,
          apiKey: undefined
        } : undefined
      }))
      
      return NextResponse.json({
        success: true,
        data: {
          logs: formattedLogs,
          pagination: {
            total,
            limit: paginationValidation.limit,
            offset: paginationValidation.offset,
            hasMore: total > paginationValidation.offset + paginationValidation.limit
          },
          filters: {
            eventType,
            userId,
            resource,
            success,
            severity,
            dateFrom: dateValidation.dateFrom,
            dateTo: dateValidation.dateTo
          }
        }
      })
      
    } catch (error) {
      console.error('Audit logs retrieval error:', error)
      
      // Track the error
      await auditLogger.logSystemEvent(
        'API_ERROR' as any,
        'Audit logs retrieval failed',
        req.user,
        { error: error instanceof Error ? error.message : 'Unknown error' },
        false
      )
      
      return NextResponse.json(
        { 
          success: false, 
          message: 'Failed to retrieve audit logs',
          error: process.env.NODE_ENV === 'development' ? error : undefined
        },
        { status: 500 }
      )
    }
  })
}