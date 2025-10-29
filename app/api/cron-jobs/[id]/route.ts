import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getCronManager } from '../../../../lib/cronJobs'

const prisma = new PrismaClient()

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cronJob = await prisma.cronJob.findUnique({
      where: { id: params.id }
    })

    if (!cronJob) {
      return NextResponse.json(
        { error: 'Cron job not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      ...cronJob,
      config: cronJob.config ? JSON.parse(cronJob.config) : null
    })
  } catch (error) {
    console.error('Error fetching cron job:', error)
    return NextResponse.json(
      { error: 'Failed to fetch cron job' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const updates = await request.json()
    
    const updateData: any = {}
    if (updates.name) updateData.name = updates.name
    if (updates.schedule) updateData.schedule = updates.schedule
    if (updates.isActive !== undefined) updateData.isActive = updates.isActive
    if (updates.config) updateData.config = JSON.stringify(updates.config)

    const cronJob = await prisma.cronJob.update({
      where: { id: params.id },
      data: updateData
    })

    // If toggling active status, update the cron manager
    if (updates.isActive !== undefined) {
      const cronManager = getCronManager()
      await cronManager.toggleJob(cronJob.name, updates.isActive)
    }

    return NextResponse.json(cronJob)
  } catch (error) {
    console.error('Error updating cron job:', error)
    return NextResponse.json(
      { error: 'Failed to update cron job' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cronJob = await prisma.cronJob.findUnique({
      where: { id: params.id }
    })

    if (!cronJob) {
      return NextResponse.json(
        { error: 'Cron job not found' },
        { status: 404 }
      )
    }

    // Stop the job in cron manager
    const cronManager = getCronManager()
    await cronManager.toggleJob(cronJob.name, false)

    // Delete from database
    await prisma.cronJob.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting cron job:', error)
    return NextResponse.json(
      { error: 'Failed to delete cron job' },
      { status: 500 }
    )
  }
}