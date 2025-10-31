import { NextRequest, NextResponse } from 'next/server'
import { getAutomationEngine } from '../../../../lib/automationEngine'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const dateRange = searchParams.get('dateRange') || 'week'
    
    // Calculate date filter
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

    // Get automation statistics from database
    const automations = await prisma.automation.findMany({
      where: {
        createdAt: { gte: startDate }
      }
    })

    // Calculate stats
    const totalExecutions = automations.reduce((sum, auto) => sum + auto.totalRuns, 0)
    const successfulExecutions = automations.reduce((sum, auto) => sum + auto.successfulRuns, 0)
    const failedExecutions = totalExecutions - successfulExecutions
    
    // Get running executions from engine
    const automationEngine = getAutomationEngine()
    const runningExecutions = automationEngine.getRunningExecutions()
    
    // Calculate average execution time (simplified - in production, store actual execution times)
    const averageExecutionTime = 45000 // 45 seconds average (placeholder)
    
    const stats = {
      totalExecutions,
      runningExecutions: runningExecutions.length,
      completedExecutions: successfulExecutions,
      failedExecutions,
      averageExecutionTime,
      successRate: totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0,
      totalTargetsProcessed: automations.reduce((sum, auto) => sum + auto.totalRuns * 10, 0), // Estimate
      totalErrors: failedExecutions
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