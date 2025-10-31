import { NextRequest } from 'next/server'
import { verifyAuth } from '../../../lib/auth'
import { notificationService } from '../../../lib/notificationService'

// GET /api/notifications - Get user notifications
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request)
    if (!auth.success || !auth.user) {
      return Response.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const unreadOnly = searchParams.get('unreadOnly') === 'true'

    const notifications = notificationService.getUserNotifications(
      auth.user.id,
      limit,
      unreadOnly
    )

    const unreadCount = notificationService.getUnreadCount(auth.user.id)

    return Response.json({
      success: true,
      data: {
        notifications,
        unreadCount,
        total: notifications.length
      }
    })
  } catch (error) {
    console.error('Get notifications error:', error)
    return Response.json(
      { success: false, message: 'Failed to get notifications' },
      { status: 500 }
    )
  }
}

// POST /api/notifications - Send notification (admin only)
export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const { type, title, message, data, priority, targetUsers, targetRoles } = body

    if (!type || !title || !message) {
      return Response.json(
        { success: false, message: 'Type, title, and message are required' },
        { status: 400 }
      )
    }

    const notificationId = await notificationService.sendNotification({
      type,
      title,
      message,
      data,
      priority: priority || 'MEDIUM',
      targetUsers,
      targetRoles
    })

    return Response.json({
      success: true,
      data: { notificationId }
    })
  } catch (error) {
    console.error('Send notification error:', error)
    return Response.json(
      { success: false, message: 'Failed to send notification' },
      { status: 500 }
    )
  }
}