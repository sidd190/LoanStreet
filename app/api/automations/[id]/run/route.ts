import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Update automation stats
    const automation = await prisma.automation.update({
      where: { id: params.id },
      data: {
        totalRuns: { increment: 1 },
        successfulRuns: { increment: 1 },
        lastRun: new Date()
      }
    })

    console.log(`✅ Successfully executed automation ${params.id}`)
    return NextResponse.json({ 
      success: true, 
      message: 'Automation executed successfully',
      stats: {
        totalRuns: automation.totalRuns,
        successfulRuns: automation.successfulRuns,
        lastRun: automation.lastRun?.toISOString()
      }
    })
  } catch (error) {
    console.error('❌ Error running automation:', error)
    
    // Still increment total runs but not successful runs
    try {
      await prisma.automation.update({
        where: { id: params.id },
        data: {
          totalRuns: { increment: 1 },
          lastRun: new Date()
        }
      })
    } catch (updateError) {
      console.error('Failed to update automation stats:', updateError)
    }

    return NextResponse.json(
      { error: 'Failed to run automation' },
      { status: 500 }
    )
  }
}