import { NextRequest, NextResponse } from 'next/server'
import { getAutomationEngine } from '../../../../../lib/automationEngine'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const automationEngine = getAutomationEngine()
    const execution = automationEngine.getExecutionStatus(params.id)

    if (!execution) {
      return NextResponse.json(
        { error: 'Execution not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      execution
    })
  } catch (error) {
    console.error('❌ Error fetching execution:', error)
    return NextResponse.json(
      { error: 'Failed to fetch execution' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const automationEngine = getAutomationEngine()
    const cancelled = await automationEngine.cancelExecution(params.id)

    if (!cancelled) {
      return NextResponse.json(
        { error: 'Execution not found or cannot be cancelled' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Execution cancelled'
    })
  } catch (error) {
    console.error('❌ Error cancelling execution:', error)
    return NextResponse.json(
      { error: 'Failed to cancel execution' },
      { status: 500 }
    )
  }
}