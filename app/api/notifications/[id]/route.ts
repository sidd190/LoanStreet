import { NextRequest } from 'next/server'
import { verifyAuth } from '../../../../lib/auth'
import { notificationService } from '../../../../lib/notificationService'

// PATCH /api/notifications/[id] - Mark notification as read
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await verifyAuth(request)
    if (!auth.success || !auth.user) {
      return Response.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { action } = body

    if (action === 'mark_read') {
      const success = notificationService.markAsRead(params.id, auth.user.id)
      
      if (!success) {
        return Response.json(
          { success: false, message: 'Notification not found' },
          { status: 404 }
        )
      }

      return Response.json({
        success: true,
        message: 'Notification marked as read'
      })
    }

    return Response.json(
      { success: false, message: 'Invalid action' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Update notification error:', error)
    return Response.json(
      { success: false, message: 'Failed to update notification' },
      { status: 500 }
    )
  }
}

// DELETE /api/notifications/[id] - Delete notification
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await verifyAuth(request)
    if (!auth.success || !auth.user) {
      return Response.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      )
    }

    const success = notificationService.deleteNotification(params.id, auth.user.id)
    
    if (!success) {
      return Response.json(
        { success: false, message: 'Notification not found' },
        { status: 404 }
      )
    }

    return Response.json({
      success: true,
      message: 'Notification deleted'
    })
  } catch (error) {
    console.error('Delete notification error:', error)
    return Response.json(
      { success: false, message: 'Failed to delete notification' },
      { status: 500 }
    )
  }
}