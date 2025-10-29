import { NextRequest, NextResponse } from 'next/server'
import { withAuthAndRole } from '@/lib/middleware/auth'
import { auditLogger } from '@/lib/security/auditLogger'
import { validatePagination } from '@/lib/security/validation'

/**
 * Security alerts endpoint
 * GET /api/admin/system/security-alerts - Admin only
 * POST /api/admin/system/security-alerts/resolve - Admin only
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
      
      // Parse filter parameters
      const resolved = searchParams.get('resolved') === 'true'
      const severity = searchParams.get('severity') || undefined
      const alertType = searchParams.get('alertType') || undefined
      
      // Log access to security alerts
      await auditLogger.logDataAccess(
        'security_alerts',
        'view',
        req.user!,
        undefined,
        {
          filters: { resolved, severity, alertType }
        }
      )
      
      // Get security alerts
      const allAlerts = await auditLogger.getSecurityAlerts(resolved)
      
      // Apply additional filters
      let filteredAlerts = allAlerts
      
      if (severity) {
        filteredAlerts = filteredAlerts.filter(alert => alert.severity === severity)
      }
      
      if (alertType) {
        filteredAlerts = filteredAlerts.filter(alert => alert.alertType === alertType)
      }
      
      // Sort by creation date (newest first)
      filteredAlerts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      
      // Apply pagination
      const total = filteredAlerts.length
      const paginatedAlerts = filteredAlerts.slice(
        paginationValidation.offset,
        paginationValidation.offset + paginationValidation.limit
      )
      
      // Format alerts for response
      const formattedAlerts = paginatedAlerts.map(alert => ({
        id: alert.id,
        alertType: alert.alertType,
        severity: alert.severity,
        description: alert.description,
        ipAddress: alert.ipAddress,
        userAgent: alert.userAgent,
        userId: alert.userId,
        resolved: alert.resolved,
        resolvedBy: alert.resolvedBy,
        resolvedAt: alert.resolvedAt,
        createdAt: alert.createdAt,
        details: alert.details
      }))
      
      return NextResponse.json({
        success: true,
        data: {
          alerts: formattedAlerts,
          pagination: {
            total,
            limit: paginationValidation.limit,
            offset: paginationValidation.offset,
            hasMore: total > paginationValidation.offset + paginationValidation.limit
          },
          filters: {
            resolved,
            severity,
            alertType
          }
        }
      })
      
    } catch (error) {
      console.error('Security alerts retrieval error:', error)
      
      // Track the error
      await auditLogger.logSystemEvent(
        'API_ERROR' as any,
        'Security alerts retrieval failed',
        req.user,
        { error: error instanceof Error ? error.message : 'Unknown error' },
        false
      )
      
      return NextResponse.json(
        { 
          success: false, 
          message: 'Failed to retrieve security alerts',
          error: process.env.NODE_ENV === 'development' ? error : undefined
        },
        { status: 500 }
      )
    }
  })
}

/**
 * Resolve security alert
 * POST /api/admin/system/security-alerts/resolve
 */
export async function POST(request: NextRequest) {
  return withAuthAndRole(['ADMIN'])(request, async (req) => {
    try {
      const body = await req.json()
      const { alertId, resolution } = body
      
      if (!alertId) {
        return NextResponse.json(
          {
            success: false,
            message: 'Alert ID is required'
          },
          { status: 400 }
        )
      }
      
      // Log the resolution action
      await auditLogger.logDataModification(
        'security_alert',
        'resolve',
        req.user!,
        alertId,
        {
          resolution,
          resolvedBy: req.user!.email
        }
      )
      
      // In production, you would update the database
      // For now, we'll just log the action
      console.log(`Security alert ${alertId} resolved by ${req.user!.email}`, {
        resolution,
        timestamp: new Date()
      })
      
      return NextResponse.json({
        success: true,
        message: 'Security alert resolved successfully',
        data: {
          alertId,
          resolvedBy: req.user!.email,
          resolvedAt: new Date(),
          resolution
        }
      })
      
    } catch (error) {
      console.error('Security alert resolution error:', error)
      
      // Track the error
      await auditLogger.logSystemEvent(
        'API_ERROR' as any,
        'Security alert resolution failed',
        req.user,
        { error: error instanceof Error ? error.message : 'Unknown error' },
        false
      )
      
      return NextResponse.json(
        { 
          success: false, 
          message: 'Failed to resolve security alert',
          error: process.env.NODE_ENV === 'development' ? error : undefined
        },
        { status: 500 }
      )
    }
  })
}