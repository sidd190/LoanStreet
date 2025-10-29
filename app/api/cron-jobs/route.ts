import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getCronManager } from '../../../lib/cronJobs'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const cronManager = getCronManager()
    
    // Get cron job status from manager
    const jobStatus = cronManager.getJobStatus()
    
    // Get cron job records from database
    const cronJobs = await prisma.cronJob.findMany({
      orderBy: { createdAt: 'desc' }
    })

    // Merge status with database records
    const enrichedJobs = cronJobs.map(job => {
      const status = jobStatus.find(s => s.name === job.name)
      return {
        ...job,
        isRunning: status?.isRunning || false,
        schedule: job.schedule,
        config: job.config ? JSON.parse(job.config) : null
      }
    })

    return NextResponse.json(enrichedJobs)
  } catch (error) {
    console.error('Error fetching cron jobs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch cron jobs' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    
    const cronJob = await prisma.cronJob.create({
      data: {
        name: data.name,
        schedule: data.schedule,
        isActive: data.isActive ?? true,
        config: data.config ? JSON.stringify(data.config) : null
      }
    })

    return NextResponse.json(cronJob)
  } catch (error) {
    console.error('Error creating cron job:', error)
    return NextResponse.json(
      { error: 'Failed to create cron job' },
      { status: 500 }
    )
  }
}