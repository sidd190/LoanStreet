import { NextRequest, NextResponse } from 'next/server'
import { getAutomationService } from '../../../../lib/automationService'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const automationService = getAutomationService()
    const automations = await automationService.getAutomations()
    const automation = automations.find(a => a.id === params.id)

    if (!automation) {
      return NextResponse.json(
        { error: 'Automation not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(automation)
  } catch (error) {
    console.error('Error fetching automation:', error)
    return NextResponse.json(
      { error: 'Failed to fetch automation' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const updates = await request.json()
    
    const automationService = getAutomationService()
    const success = await automationService.updateAutomation(params.id, updates)

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to update automation' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating automation:', error)
    return NextResponse.json(
      { error: 'Failed to update automation' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const automationService = getAutomationService()
    const success = await automationService.deleteAutomation(params.id)

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to delete automation' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting automation:', error)
    return NextResponse.json(
      { error: 'Failed to delete automation' },
      { status: 500 }
    )
  }
}