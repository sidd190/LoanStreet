import { NextRequest } from 'next/server'
import { verifyAuth } from '../../../../lib/auth'
import { liveDataSyncService } from '../../../../lib/liveDataSync'

// POST /api/live-sync/stats - Trigger immediate stats update
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request)
    if (!auth.success || !auth.user) {
      return Response.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      )
    }

    // Trigger immediate stats update
    await liveDataSyncService.triggerStatsUpdate()

    return Response.json({
      success: true,
      message: 'Stats update triggered successfully'
    })
  } catch (error) {
    console.error('Stats sync trigger error:', error)
    return Response.json(
      { success: false, message: 'Failed to trigger stats update' },
      { status: 500 }
    )
  }
}