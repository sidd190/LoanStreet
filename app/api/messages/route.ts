import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    // Try to get messages from database
    const messages = await prisma.message.findMany({
      include: {
        contact: true,
        campaign: true,
        sentBy: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 100 // Limit to recent messages
    })

    // Transform Prisma data to match our interface
    const transformedMessages = messages.map(message => ({
      id: message.id,
      type: message.type as 'SMS' | 'WHATSAPP' | 'EMAIL',
      direction: message.direction as 'INBOUND' | 'OUTBOUND',
      content: message.content,
      status: message.status as 'PENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED' | 'REPLIED',
      contactName: message.contact.name || 'Unknown',
      contactPhone: message.contact.phone,
      contactEmail: message.contact.email,
      campaignName: message.campaign?.name,
      sentBy: message.sentBy?.name,
      sentAt: message.sentAt?.toISOString(),
      deliveredAt: message.deliveredAt?.toISOString(),
      readAt: message.readAt?.toISOString(),
      createdAt: message.createdAt.toISOString()
    }))

    return NextResponse.json(transformedMessages)
  } catch (error) {
    console.error('Database error in /api/messages:', error)
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
    
    // Find or create contact
    let contact = await prisma.contact.findFirst({
      where: { phone: data.contactPhone }
    })
    
    if (!contact) {
      contact = await prisma.contact.create({
        data: {
          phone: data.contactPhone,
          name: data.contactName,
          email: data.contactEmail
        }
      })
    }
    
    const message = await prisma.message.create({
      data: {
        type: data.type,
        direction: data.direction,
        content: data.content,
        status: data.status || 'PENDING',
        contactId: contact.id,
        sentAt: data.sentAt ? new Date(data.sentAt) : null
      }
    })

    return NextResponse.json(message)
  } catch (error) {
    console.error('Error creating message:', error)
    return NextResponse.json(
      { error: 'Failed to create message' },
      { status: 500 }
    )
  }
}