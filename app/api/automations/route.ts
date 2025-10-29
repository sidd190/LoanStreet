import { NextRequest, NextResponse } from 'next/server'
import { getAutomationService } from '../../../lib/automationService'

export async function GET(request: NextRequest) {
  try {
    console.log('✅ Automations API called - fetching from automation service')
    
    const automationService = getAutomationService()
    const automations = await automationService.getAutomations()

    console.log('✅ Successfully loaded automations from service')
    return NextResponse.json({
      success: true,
      automations
    })
  } catch (error) {
    console.error('⚠️ Error in /api/automations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch automations' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    
    const automationService = getAutomationService()
    const automationId = await automationService.createAutomation({
      name: data.name,
      description: data.description,
      type: data.type,
      status: data.status || 'draft',
      schedule: data.schedule,
      conditions: data.conditions,
      actions: data.actions
    })

    console.log('✅ Successfully created automation in service')
    return NextResponse.json({ id: automationId, success: true })
  } catch (error) {
    console.error('❌ Error creating automation:', error)
    return NextResponse.json(
      { error: 'Failed to create automation' },
      { status: 500 }
    )
  }
}