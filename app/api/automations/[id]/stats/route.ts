import { NextRequest, NextResponse } from 'next/server'
import { getAutomationEngine } from '../../../../../lib/automationEngine'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const dateRange = searchParams.get('dateRange') || 'week'
    
    // Get automation from database
    const automation = await prisma.automation.findUnique({
      where: { id: params.id }
    })

    if (!automation) {
      return NextResponse.json(
        { error: 'Automation not found' },
        { status: 404 }
      )
    }

    // Get running executions for this automation
    const automationEngine = getAutomationEngine()
    const allRunningExecutions = automationEngine.getRunningExecutions()
    const runningExecutions = allRunningExecutions.filter(
      exec => exec.automationId === params.id
    )

    // Calculate stats for this specific automation
    const stats = {
      totalExecutions: automation.totalRuns,
      runningExecutions: runningExecutions.length,
      completedExecutions: automation.successfulRuns,
      failedExecutions: automation.totalRuns - automation.successfulRuns,
      averageExecutionTime: 45000, // Placeholder - should be calculated from actual execution times
      successRate: automation.totalRuns > 0 
        ? (automation.successfulRuns / automation.totalRuns) * 100 
        : 0,
      totalTargetsProcessed: automation.totalRuns * 10, // Estimate
      totalErrors: automation.totalRuns - automation.successfulRuns,
      lastRun: automation.lastRun?.toISOString(),
      nextRun: automation.nextRun?.toISOString()
    }

    return NextResponse.json({
      success: true,
      stats
    })
  } catch (error) {
    console.error('❌ Error fetching automation stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch automation stats' },
      { status: 500 }
    )
  }
}