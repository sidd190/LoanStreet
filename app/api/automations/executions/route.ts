import { NextRequest, NextResponse } from 'next/server'
import { getAutomationEngine } from '../../../../lib/automationEngine'

export async function GET(request: NextRequest) {
  try {
    const automationEngine = getAutomationEngine()
    const executions = automationEngine.getRunningExecutions()

    return NextResponse.json({
      success: true,
      executions
    })
  } catch (error) {
    console.error('❌ Error fetching executions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch executions' },
      { status: 500 }
    )
  }
}