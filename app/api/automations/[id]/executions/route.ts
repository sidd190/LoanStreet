import { NextRequest, NextResponse } from 'next/server'
import { getAutomationEngine } from '../../../../../lib/automationEngine'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const dateRange = searchParams.get('dateRange') || 'week'
    
    const automationEngine = getAutomationEngine()
    let executions = automationEngine.getRunningExecutions()
    
    // Filter by automation ID
    executions = executions.filter(exec => exec.automationId === params.id)
    
    // Filter by status if provided
    if (status && status !== 'ALL') {
      executions = executions.filter(exec => exec.status === status)
    }
    
    // Filter by date range
    const now = new Date()
    let startDate: Date
    
    switch (dateRange) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        break
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        break
      default:
        startDate = new Date(0) // All time
    }
    
    executions = executions.filter(exec => exec.startedAt >= startDate)
    
    // Sort by start time (newest first)
    executions.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())

    return NextResponse.json({
      success: true,
      executions
    })
  } catch (error) {
    console.error('❌ Error fetching automation executions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch executions' },
      { status: 500 }
    )
  }
}