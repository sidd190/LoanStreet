import { NextRequest } from 'next/server'
import { verifyAuth } from '../../../../lib/auth'
import { notificationService } from '../../../../lib/notificationService'

// GET /api/notifications/preferences - Get user notification preferences
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request)
    if (!auth.success || !auth.user) {
      return Response.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      )
    }

    const preferences = notificationService.getPreferences(auth.user.id)

    return Response.json({
      success: true,
      data: preferences
    })
  } catch (error) {
    console.error('Get notification preferences error:', error)
    return Response.json(
      { success: false, message: 'Failed to get notification preferences' },
      { status: 500 }
    )
  }
}

// PUT /api/notifications/preferences - Update user notification preferences
export async function PUT(request: NextRequest) {
  try {
    const auth = await verifyAuth(request)
    if (!auth.success || !auth.user) {
      return Response.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const {
      enableBrowserNotifications,
      enableInAppNotifications,
      enableEmailNotifications,
      notificationTypes,
      quietHours
    } = body

    notificationService.updatePreferences(auth.user.id, {
      enableBrowserNotifications,
      enableInAppNotifications,
      enableEmailNotifications,
      notificationTypes,
      quietHours
    })

    const updatedPreferences = notificationService.getPreferences(auth.user.id)

    return Response.json({
      success: true,
      data: updatedPreferences,
      message: 'Notification preferences updated'
    })
  } catch (error) {
    console.error('Update notification preferences error:', error)
    return Response.json(
      { success: false, message: 'Failed to update notification preferences' },
      { status: 500 }
    )
  }
}