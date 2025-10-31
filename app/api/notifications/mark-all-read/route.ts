import { NextRequest } from 'next/server'
import { verifyAuth } from '../../../../lib/auth'
import { notificationService } from '../../../../lib/notificationService'

// POST /api/notifications/mark-all-read - Mark all notifications as read
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request)
    if (!auth.success || !auth.user) {
      return Response.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      )
    }

    const count = notificationService.markAllAsRead(auth.user.id)

    return Response.json({
      success: true,
      data: { markedCount: count },
      message: `Marked ${count} notifications as read`
    })
  } catch (error) {
    console.error('Mark all read error:', error)
    return Response.json(
      { success: false, message: 'Failed to mark notifications as read' },
      { status: 500 }
    )
  }
}