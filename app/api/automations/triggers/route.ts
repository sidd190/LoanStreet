import { NextRequest, NextResponse } from 'next/server'
import { getAutomationTriggerManager } from '../../../../lib/automationTriggers'

export async function GET(request: NextRequest) {
  try {
    const triggerManager = getAutomationTriggerManager()
    const status = triggerManager.getTriggerStatus()
    const scheduledTriggers = triggerManager.getScheduledTriggers()
    const eventTriggers = triggerManager.getEventTriggers()

    return NextResponse.json({
      success: true,
      status,
      scheduledTriggers,
      eventTriggers
    })
  } catch (error) {
    console.error('❌ Error fetching triggers:', error)
    return NextResponse.json(
      { error: 'Failed to fetch triggers' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { type, ...triggerData } = await request.json()
    const triggerManager = getAutomationTriggerManager()

    let triggerId: string

    if (type === 'time') {
      triggerId = await triggerManager.createTimeBasedTrigger({
        automationId: triggerData.automationId,
        frequency: triggerData.frequency || 'daily',
        time: triggerData.time,
        days: triggerData.days,
        cronExpression: triggerData.cronExpression,
        timezone: triggerData.timezone || 'UTC',
        isActive: triggerData.isActive !== false
      })
    } else if (type === 'event') {
      triggerId = await triggerManager.createEventBasedTrigger({
        automationId: triggerData.automationId,
        eventType: triggerData.eventType,
        conditions: triggerData.conditions,
        isActive: triggerData.isActive !== false
      })
    } else {
      return NextResponse.json(
        { error: 'Invalid trigger type. Must be "time" or "event"' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      triggerId,
      message: 'Trigger created successfully'
    })
  } catch (error) {
    console.error('❌ Error creating trigger:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to create trigger'
      },
      { status: 500 }
    )
  }
}