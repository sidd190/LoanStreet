import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth, hasPermission } from '@/lib/auth'
import dashboardStatsService from '@/lib/dashboardStatsService'

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request)
    
    if (!user || !hasPermission(user, 'dashboard:view')) {
      return NextResponse.json(
        { success: false, message: 'Access denied' },
        { status: 403 }
      )
    }

    const forceRefresh = request.nextUrl.searchParams.get('refresh') === 'true'
    const stats = await dashboardStatsService.getStats(!forceRefresh)

    return NextResponse.json({
      success: true,
      data: stats
    })
  } catch (error) {
    console.error('Failed to fetch dashboard stats:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch dashboard stats' },
      { status: 500 }
    )
  }
}