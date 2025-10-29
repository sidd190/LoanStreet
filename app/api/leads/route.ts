import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    // Try to get leads from database
    const leads = await prisma.lead.findMany({
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
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({
      success: true,
      leads
    })
  } catch (error) {
    console.error('Database error in /api/leads:', error)
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
    
    const lead = await prisma.lead.create({
      data: {
        name: data.name,
        phone: data.phone,
        email: data.email,
        loanType: data.loanType,
        loanAmount: data.loanAmount,
        status: data.status || 'NEW',
        priority: data.priority || 'MEDIUM',
        source: data.source,
        notes: data.notes
      }
    })

    return NextResponse.json(lead)
  } catch (error) {
    console.error('Error creating lead:', error)
    return NextResponse.json(
      { error: 'Failed to create lead' },
      { status: 500 }
    )
  }
}