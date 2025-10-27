import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    // Try to get campaigns from database
    const campaigns = await prisma.campaign.findMany({
      include: {
        createdBy: true,
        _count: {
          select: {
            contacts: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Transform Prisma data to match our interface
    const transformedCampaigns = campaigns.map(campaign => ({
      id: campaign.id,
      name: campaign.name,
      type: campaign.type as 'SMS' | 'WHATSAPP' | 'EMAIL',
      message: campaign.message,
      status: campaign.status as 'DRAFT' | 'SCHEDULED' | 'RUNNING' | 'COMPLETED' | 'PAUSED' | 'CANCELLED',
      scheduledAt: campaign.scheduledAt?.toISOString(),
      sentAt: campaign.sentAt?.toISOString(),
      totalContacts: campaign._count.contacts,
      totalSent: campaign.totalSent,
      totalDelivered: campaign.totalDelivered,
      totalReplies: campaign.totalReplies,
      totalFailed: campaign.totalSent - campaign.totalDelivered,
      createdBy: campaign.createdBy.name,
      createdAt: campaign.createdAt.toISOString(),
      updatedAt: campaign.updatedAt.toISOString()
    }))

    return NextResponse.json(transformedCampaigns)
  } catch (error) {
    console.error('Database error in /api/campaigns:', error)
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
    
    // For demo purposes, we'll use a default user ID
    // In real app, this would come from authentication
    const defaultUserId = 'default-user-id'
    
    const campaign = await prisma.campaign.create({
      data: {
        name: data.name,
        type: data.type,
        message: data.message,
        status: data.status || 'DRAFT',
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
        createdById: defaultUserId
      }
    })

    return NextResponse.json(campaign)
  } catch (error) {
    console.error('Error creating campaign:', error)
    return NextResponse.json(
      { error: 'Failed to create campaign' },
      { status: 500 }
    )
  }
}