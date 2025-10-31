import { NextRequest, NextResponse } from 'next/server';
import { errorMonitoring } from '@/lib/errorMonitoring';
import { logger } from '@/lib/logger';
import { auditLogger, AuditEventType } from '@/lib/security/auditLogger';

/**
 * Error Monitoring API
 * Requirements: 8.3, 8.5 - Provide error monitoring and alerting interface
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    
    switch (action) {
      case 'statistics':
        const stats = errorMonitoring.getErrorStatistics();
        return NextResponse.json({
          success: true,
          data: stats,
          timestamp: new Date().toISOString(),
        });
        
      case 'alerts':
        const includeResolved = searchParams.get('includeResolved') === 'true';
        const alerts = includeResolved 
          ? errorMonitoring.getAllAlerts()
          : errorMonitoring.getActiveAlerts();
          
        return NextResponse.json({
          success: true,
          data: alerts,
          count: alerts.length,
          timestamp: new Date().toISOString(),
        });
        
      case 'trends':
        const startDate = searchParams.get('start');
        const endDate = searchParams.get('end');
        const groupBy = searchParams.get('groupBy') as 'hour' | 'day' || 'hour';
        
        if (!startDate || !endDate) {
          return NextResponse.json(
            { error: 'Start and end dates are required for trends' },
            { status: 400 }
          );
        }
        
        const trends = await errorMonitoring.getErrorTrends(
          {
            start: new Date(startDate),
            end: new Date(endDate),
          },
          groupBy
        );
        
        return NextResponse.json({
          success: true,
          data: trends,
          timestamp: new Date().toISOString(),
        });
        
      default:
        // Return overview by default
        const overview = {
          statistics: errorMonitoring.getErrorStatistics(),
          activeAlerts: errorMonitoring.getActiveAlerts(),
          timestamp: new Date().toISOString(),
        };
        
        return NextResponse.json({
          success: true,
          data: overview,
        });
    }
    
  } catch (error) {
    logger.error('Failed to get error monitoring data', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to get error monitoring data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, alertId, resolvedBy } = body;
    
    switch (action) {
      case 'resolve_alert':
        if (!alertId) {
          return NextResponse.json(
            { error: 'Alert ID is required' },
            { status: 400 }
          );
        }
        
        const resolved = await errorMonitoring.resolveAlert(alertId, resolvedBy);
        
        if (resolved) {
          await auditLogger.logEvent(
            AuditEventType.SYSTEM_ALERT_RESOLVED,
            'Alert manually resolved via API',
            { alertId, resolvedBy }
          );
          
          return NextResponse.json({
            success: true,
            message: 'Alert resolved successfully',
          });
        } else {
          return NextResponse.json(
            { error: 'Failed to resolve alert or alert not found' },
            { status: 404 }
          );
        }
        
      case 'test_error':
        // Test endpoint for generating sample errors (development only)
        if (process.env.NODE_ENV === 'production') {
          return NextResponse.json(
            { error: 'Test errors not allowed in production' },
            { status: 403 }
          );
        }
        
        const { type, service, message, details } = body;
        
        await errorMonitoring.reportError(
          type || 'TEST_ERROR',
          service || 'SYSTEM',
          message || 'Test error generated via API',
          details || { source: 'api_test', timestamp: new Date().toISOString() }
        );
        
        return NextResponse.json({
          success: true,
          message: 'Test error reported successfully',
        });
        
      case 'test_success':
        // Test endpoint for generating sample success reports (development only)
        if (process.env.NODE_ENV === 'production') {
          return NextResponse.json(
            { error: 'Test success reports not allowed in production' },
            { status: 403 }
          );
        }
        
        const { successType, successService, successDetails } = body;
        
        await errorMonitoring.reportSuccess(
          successType || 'TEST_SUCCESS',
          successService || 'SYSTEM',
          successDetails || { source: 'api_test', timestamp: new Date().toISOString() }
        );
        
        return NextResponse.json({
          success: true,
          message: 'Test success reported successfully',
        });
        
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
    
  } catch (error) {
    logger.error('Failed to process error monitoring action', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to process action',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}