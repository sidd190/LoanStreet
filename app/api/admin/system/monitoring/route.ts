/**
 * System Monitoring API Endpoint
 * Provides access to system health, performance metrics, and data integrity reports
 */

import { NextRequest, NextResponse } from 'next/server'
import { systemMonitoring } from '../../../../../lib/systemMonitoring'
import { auditLogger, AuditEventType } from '../../../../../lib/security/auditLogger'
import { authMiddleware } from '../../../../../lib/middleware/auth'
import Logger, { DataSource } from '../../../../../lib/logger'

export async function GET(request: NextRequest) {
  try {
    // Authenticate and authorize
    const authResult = await authMiddleware(request)
    if (!authResult.success || authResult.user?.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Unauthorized access' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'health'

    Logger.info(DataSource.API, 'monitoring', `System monitoring request: ${type}`, {
      user: authResult.user.email,
      type
    })

    let data: any

    switch (type) {
      case 'health':
        data = await systemMonitoring.getSystemHealth()
        break

      case 'integrity':
        data = await systemMonitoring.getLatestIntegrityReport()
        break

      case 'metrics':
        const limit = parseInt(searchParams.get('limit') || '100')
        data = systemMonitoring.getPerformanceMetrics(limit)
        break

      case 'alerts':
        data = systemMonitoring.getAlertRules()
        break

      default:
        return NextResponse.json(
          { success: false, message: 'Invalid monitoring type' },
          { status: 400 }
        )
    }

    // Log access to monitoring data
    await auditLogger.logEvent(
      AuditEventType.ANALYTICS_VIEW,
      `Viewed system monitoring: ${type}`,
      {
        user: authResult.user,
        resource: 'system_monitoring',
        details: { type }
      }
    )

    return NextResponse.json({
      success: true,
      data,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    Logger.error(DataSource.API, 'monitoring', 'System monitoring request failed', error)

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to retrieve monitoring data',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate and authorize
    const authResult = await authMiddleware(request)
    if (!authResult.success || authResult.user?.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Unauthorized access' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { action, ...params } = body

    Logger.info(DataSource.API, 'monitoring', `System monitoring action: ${action}`, {
      user: authResult.user.email,
      action,
      params
    })

    let result: any

    switch (action) {
      case 'run_health_check':
        result = await systemMonitoring.performHealthCheck()
        break

      case 'run_integrity_check':
        result = await systemMonitoring.performDataIntegrityCheck()
        break

      case 'add_alert_rule':
        if (!params.rule) {
          return NextResponse.json(
            { success: false, message: 'Alert rule data required' },
            { status: 400 }
          )
        }
        systemMonitoring.addAlertRule(params.rule)
        result = { success: true, message: 'Alert rule added' }
        break

      case 'update_alert_rule':
        if (!params.ruleId || !params.updates) {
          return NextResponse.json(
            { success: false, message: 'Rule ID and updates required' },
            { status: 400 }
          )
        }
        const updated = systemMonitoring.updateAlertRule(params.ruleId, params.updates)
        result = { success: updated, message: updated ? 'Alert rule updated' : 'Alert rule not found' }
        break

      case 'remove_alert_rule':
        if (!params.ruleId) {
          return NextResponse.json(
            { success: false, message: 'Rule ID required' },
            { status: 400 }
          )
        }
        const removed = systemMonitoring.removeAlertRule(params.ruleId)
        result = { success: removed, message: removed ? 'Alert rule removed' : 'Alert rule not found' }
        break

      default:
        return NextResponse.json(
          { success: false, message: 'Invalid action' },
          { status: 400 }
        )
    }

    // Log administrative action
    await auditLogger.logEvent(
      AuditEventType.CONFIG_CHANGE,
      `System monitoring action: ${action}`,
      {
        user: authResult.user,
        resource: 'system_monitoring',
        details: { action, params, result }
      }
    )

    return NextResponse.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    Logger.error(DataSource.API, 'monitoring', 'System monitoring action failed', error)

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to execute monitoring action',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}