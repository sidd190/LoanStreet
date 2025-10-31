import { NextRequest, NextResponse } from 'next/server'
import { getAutomationEngine } from '../../../../../lib/automationEngine'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const automationEngine = getAutomationEngine()
    const executionId = await automationEngine.executeAutomation(params.id)

    return NextResponse.json({
      success: true,
      executionId,
      message: 'Automation execution started'
    })
  } catch (error) {
    console.error('❌ Error executing automation:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to execute automation'
      },
      { status: 500 }
    )
  }
}