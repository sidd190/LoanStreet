import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const automation = await prisma.automation.findUnique({
      where: { id: params.id }
    })

    if (!automation) {
      return NextResponse.json(
        { error: 'Automation not found' },
        { status: 404 }
      )
    }

    // Transform to match interface
    const transformedAutomation = {
      id: automation.id,
      name: automation.name,
      description: automation.description || '',
      type: automation.type,
      status: automation.isActive ? 'active' : 'paused',
      schedule: JSON.parse(automation.schedule || '{}'),
      conditions: JSON.parse(automation.conditions || '{}'),
      actions: JSON.parse(automation.actions || '[]'),
      stats: {
        totalRuns: automation.totalRuns || 0,
        successfulRuns: automation.successfulRuns || 0,
        lastRun: automation.lastRun?.toISOString(),
        nextRun: automation.nextRun?.toISOString()
      },
      createdAt: automation.createdAt.toISOString(),
      updatedAt: automation.updatedAt.toISOString()
    }

    return NextResponse.json(transformedAutomation)
  } catch (error) {
    console.error('Database error in /api/automations/[id]:', error)
    return NextResponse.json(
      { error: 'Database not available' },
      { status: 503 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const updates = await request.json()
    
    const automation = await prisma.automation.update({
      where: { id: params.id },
      data: {
        name: updates.name,
        description: updates.description,
        type: updates.type,
        isActive: updates.status === 'active',
        schedule: updates.schedule ? JSON.stringify(updates.schedule) : undefined,
        conditions: updates.conditions ? JSON.stringify(updates.conditions) : undefined,
        actions: updates.actions ? JSON.stringify(updates.actions) : undefined
      }
    })

    return NextResponse.json(automation)
  } catch (error) {
    console.error('Error updating automation:', error)
    return NextResponse.json(
      { error: 'Failed to update automation' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.automation.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting automation:', error)
    return NextResponse.json(
      { error: 'Failed to delete automation' },
      { status: 500 }
    )
  }
}