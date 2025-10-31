import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth'
import dashboardStatsService from '@/lib/dashboardStatsService'
import Logger, { DataSource } from '@/lib/logger'

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    // Verify authentication
    const authResult = await verifyAuth(request)
    if (!authResult.success) {
      Logger.warn(DataSource.API, 'dashboard_stats', 'Authentication failed', authResult.error)
      return NextResponse.json(
        { success: false, message: authResult.error },
        { status: 401 }
      )
    }

    const user = authResult.user!

    // Check for cache control headers
    const cacheControl = request.headers.get('cache-control')
    const forceRefresh = cacheControl === 'no-cache' || request.nextUrl.searchParams.get('refresh') === 'true'

    Logger.info(DataSource.API, 'dashboard_stats', `Fetching dashboard stats for user ${user.id}${forceRefresh ? ' (force refresh)' : ''}`)

    // Get dashboard statistics using the service
    const stats = await dashboardStatsService.getStats(!forceRefresh)

    const duration = Date.now() - startTime
    Logger.success(DataSource.API, 'dashboard_stats', `Dashboard stats API completed in ${duration}ms`)

    return NextResponse.json({
      success: true,
      data: stats,
      meta: {
        cached: !forceRefresh,
        duration,
        timestamp: new Date().toISOString()
      }
    }, {
      headers: {
        'Cache-Control': 'private, max-age=300', // Cache for 5 minutes
        'X-Response-Time': `${duration}ms`
      }
    })

  } catch (error) {
    const duration = Date.now() - startTime
    Logger.error(DataSource.API, 'dashboard_stats', `Dashboard stats API failed after ${duration}ms`, error)
    
    // Try to return fallback data even on error
    try {
      const fallbackStats = await dashboardStatsService.getStats(true)
      return NextResponse.json({
        success: true,
        data: fallbackStats,
        meta: {
          cached: true,
          fallback: true,
          duration,
          timestamp: new Date().toISOString(),
          error: 'Primary data source unavailable, using cached/fallback data'
        }
      }, {
        status: 200,
        headers: {
          'X-Response-Time': `${duration}ms`,
          'X-Fallback': 'true'
        }
      })
    } catch (fallbackError) {
      Logger.error(DataSource.API, 'dashboard_stats', 'Both primary and fallback data sources failed', fallbackError)
      return NextResponse.json(
        { 
          success: false, 
          message: 'Failed to fetch dashboard stats',
          error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        },
        { status: 500 }
      )
    }
  }
}