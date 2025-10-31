import { NextRequest, NextResponse } from 'next/server'
import { getAutomationTriggerManager } from '../../../../../lib/automationTriggers'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const updates = await request.json()
    const triggerManager = getAutomationTriggerManager()

    let success = false

    if (updates.type === 'time') {
      success = await triggerManager.updateTimeBasedTrigger(params.id, updates)
    } else if (updates.type === 'event') {
      success = await triggerManager.updateEventBasedTrigger(params.id, updates)
    } else {
      // Try both types if type is not specified
      success = await triggerManager.updateTimeBasedTrigger(params.id, updates) ||
                await triggerManager.updateEventBasedTrigger(params.id, updates)
    }

    if (!success) {
      return NextResponse.json(
        { error: 'Trigger not found or update failed' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Trigger updated successfully'
    })
  } catch (error) {
    console.error('❌ Error updating trigger:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to update trigger'
      },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const triggerManager = getAutomationTriggerManager()
    const success = await triggerManager.deleteTrigger(params.id)

    if (!success) {
      return NextResponse.json(
        { error: 'Trigger not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Trigger deleted successfully'
    })
  } catch (error) {
    console.error('❌ Error deleting trigger:', error)
    return NextResponse.json(
      { error: 'Failed to delete trigger' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { isActive } = await request.json()
    const triggerManager = getAutomationTriggerManager()
    
    const success = await triggerManager.toggleTrigger(params.id, isActive)

    if (!success) {
      return NextResponse.json(
        { error: 'Trigger not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      isActive,
      message: `Trigger ${isActive ? 'activated' : 'deactivated'} successfully`
    })
  } catch (error) {
    console.error('❌ Error toggling trigger:', error)
    return NextResponse.json(
      { error: 'Failed to toggle trigger' },
      { status: 500 }
    )
  }
}