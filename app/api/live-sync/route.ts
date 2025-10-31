import { NextRequest } from 'next/server'
import { verifyAuth } from '../../../lib/auth'
import { liveDataSyncService } from '../../../lib/liveDataSync'

// GET /api/live-sync - Get sync service status
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request)
    if (!auth.success || !auth.user) {
      return Response.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      )
    }

    if (auth.user.role !== 'ADMIN') {
      return Response.json(
        { success: false, message: 'Admin access required' },
        { status: 403 }
      )
    }

    const status = liveDataSyncService.getStatus()

    return Response.json({
      success: true,
      data: status
    })
  } catch (error) {
    console.error('Live sync status error:', error)
    return Response.json(
      { success: false, message: 'Failed to get sync status' },
      { status: 500 }
    )
  }
}

// POST /api/live-sync - Trigger sync events
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request)
    if (!auth.success || !auth.user) {
      return Response.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { event, data } = body

    if (!event) {
      return Response.json(
        { success: false, message: 'Event type is required' },
        { status: 400 }
      )
    }

    // Handle different sync events
    await liveDataSyncService.handleSystemEvent(event, data || {})

    return Response.json({
      success: true,
      message: `Sync event '${event}' processed successfully`
    })
  } catch (error) {
    console.error('Live sync trigger error:', error)
    return Response.json(
      { success: false, message: 'Failed to trigger sync event' },
      { status: 500 }
    )
  }
}