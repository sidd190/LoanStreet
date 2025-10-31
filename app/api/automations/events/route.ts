import { NextRequest, NextResponse } from 'next/server'
import { getAutomationEngine } from '../../../../lib/automationEngine'

export async function POST(request: NextRequest) {
  try {
    const { eventType, eventData } = await request.json()

    if (!eventType) {
      return NextResponse.json(
        { error: 'Event type is required' },
        { status: 400 }
      )
    }

    const automationEngine = getAutomationEngine()
    automationEngine.triggerEvent(eventType, eventData || {})

    return NextResponse.json({
      success: true,
      message: `Event ${eventType} triggered`
    })
  } catch (error) {
    console.error('❌ Error triggering event:', error)
    return NextResponse.json(
      { error: 'Failed to trigger event' },
      { status: 500 }
    )
  }
}