import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { isActive } = await request.json()
    
    const automation = await prisma.automation.update({
      where: { id: params.id },
      data: {
        isActive: isActive
      }
    })

    console.log(`✅ Successfully ${isActive ? 'activated' : 'deactivated'} automation ${params.id}`)
    return NextResponse.json({ success: true, isActive: automation.isActive })
  } catch (error) {
    console.error('❌ Error toggling automation:', error)
    return NextResponse.json(
      { error: 'Failed to toggle automation' },
      { status: 500 }
    )
  }
}