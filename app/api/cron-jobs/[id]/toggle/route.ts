import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getCronManager } from '../../../../../lib/cronJobs'

const prisma = new PrismaClient()

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { isActive } = await request.json()
    
    const cronJob = await prisma.cronJob.update({
      where: { id: params.id },
      data: { isActive }
    })

    // Update the cron manager
    const cronManager = getCronManager()
    await cronManager.toggleJob(cronJob.name, isActive)

    console.log(`✅ Successfully ${isActive ? 'activated' : 'deactivated'} cron job ${cronJob.name}`)
    return NextResponse.json({ success: true, isActive: cronJob.isActive })
  } catch (error) {
    console.error('❌ Error toggling cron job:', error)
    return NextResponse.json(
      { error: 'Failed to toggle cron job' },
      { status: 500 }
    )
  }
}