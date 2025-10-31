import { NextRequest, NextResponse } from 'next/server'
import { getAutomationRetryManager } from '../../../../lib/automationRetryManager'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const includeAcknowledged = searchParams.get('includeAcknowledged') === 'true'
    
    const retryManager = getAutomationRetryManager()
    
    const notifications = includeAcknowledged 
      ? retryManager.getAllNotifications()
      : retryManager.getActiveNotifications()

    return NextResponse.json({
      success: true,
      notifications
    })
  } catch (error) {
    console.error('❌ Error fetching notifications:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, notificationId, acknowledgedBy } = await request.json()
    const retryManager = getAutomationRetryManager()

    let result = false

    switch (action) {
      case 'acknowledge':
        if (!acknowledgedBy) {
          return NextResponse.json(
            { error: 'acknowledgedBy is required for acknowledge action' },
            { status: 400 }
          )
        }
        result = await retryManager.acknowledgeNotification(notificationId, acknowledgedBy)
        break
      
      case 'dismiss':
        result = await retryManager.dismissNotification(notificationId)
        break
      
      default:
        return NextResponse.json(
          { error: 'Invalid action. Must be "acknowledge" or "dismiss"' },
          { status: 400 }
        )
    }

    if (!result) {
      return NextResponse.json(
        { error: 'Notification not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Notification ${action}d successfully`
    })
  } catch (error) {
    console.error('❌ Error managing notification:', error)
    return NextResponse.json(
      { error: 'Failed to manage notification' },
      { status: 500 }
    )
  }
}