import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const lead = await prisma.lead.findUnique({
      where: { id: params.id },
      include: {
        contact: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true
          }
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    if (!lead) {
      return NextResponse.json(
        { success: false, message: 'Lead not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      lead
    })
  } catch (error) {
    console.error('Error fetching lead:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch lead' },
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
    
    // Handle assignedTo field - convert string ID to connect object
    const updateData: any = { ...updates }
    if (updates.assignedTo) {
      updateData.assignedTo = {
        connect: { id: updates.assignedTo }
      }
    }

    const lead = await prisma.lead.update({
      where: { id: params.id },
      data: updateData,
      include: {
        contact: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true
          }
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      lead
    })
  } catch (error) {
    console.error('Error updating lead:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to update lead' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.lead.delete({
      where: { id: params.id }
    })

    return NextResponse.json({
      success: true,
      message: 'Lead deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting lead:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to delete lead' },
      { status: 500 }
    )
  }
}