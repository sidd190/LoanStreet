import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    console.log('✅ Automations API called - attempting database connection')
    
    // Try to get automations from database
    const automations = await prisma.automation.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Transform Prisma data to match our interface
    const transformedAutomations = automations.map(automation => ({
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
    }))

    console.log('✅ Successfully loaded automations from database')
    return NextResponse.json(transformedAutomations)
  } catch (error) {
    console.error('⚠️ Database error in /api/automations, will fallback to JSON data:', error)
    // Return error so DataService falls back to JSON data
    return NextResponse.json(
      { error: 'Database not available' },
      { status: 503 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    
    const automation = await prisma.automation.create({
      data: {
        name: data.name,
        description: data.description,
        type: data.type,
        isActive: data.status === 'active',
        schedule: JSON.stringify(data.schedule),
        conditions: JSON.stringify(data.conditions),
        actions: JSON.stringify(data.actions)
      }
    })

    console.log('✅ Successfully created automation in database')
    return NextResponse.json(automation)
  } catch (error) {
    console.error('❌ Error creating automation:', error)
    return NextResponse.json(
      { error: 'Failed to create automation' },
      { status: 500 }
    )
  }
}