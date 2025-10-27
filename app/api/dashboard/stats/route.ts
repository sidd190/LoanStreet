import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    console.log('✅ Dashboard stats API called - attempting database connection')
    
    // Get date range from query params (default to last 30 days)
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '30')
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    // Parallel queries for better performance
    const [
      totalContacts,
      totalCampaigns,
      totalMessages,
      totalLeads,
      recentMessages,
      recentCampaigns,
      leadsByStatus,
      messagesByType
    ] = await Promise.all([
      // Total contacts
      prisma.contact.count({
        where: { isActive: true }
      }),

      // Total campaigns
      prisma.campaign.count({
        where: {
          createdAt: { gte: startDate }
        }
      }),

      // Total messages
      prisma.message.count({
        where: {
          createdAt: { gte: startDate }
        }
      }),

      // Total leads
      prisma.lead.count({
        where: {
          createdAt: { gte: startDate }
        }
      }),

      // Recent messages for response rate calculation
      prisma.message.findMany({
        where: {
          createdAt: { gte: startDate }
        },
        select: {
          direction: true,
          status: true
        }
      }),

      // Recent campaigns for stats
      prisma.campaign.findMany({
        where: {
          createdAt: { gte: startDate }
        },
        select: {
          totalSent: true,
          totalDelivered: true,
          totalReplies: true
        }
      }),

      // Leads by status
      prisma.lead.groupBy({
        by: ['status'],
        where: {
          createdAt: { gte: startDate }
        },
        _count: {
          id: true
        }
      }),

      // Messages by type
      prisma.message.groupBy({
        by: ['type'],
        where: {
          createdAt: { gte: startDate }
        },
        _count: {
          id: true
        }
      })
    ])

    // Calculate response rate
    const outboundMessages = recentMessages.filter(m => m.direction === 'OUTBOUND').length
    const inboundMessages = recentMessages.filter(m => m.direction === 'INBOUND').length
    const responseRate = outboundMessages > 0 ? (inboundMessages / outboundMessages) * 100 : 0

    // Calculate conversion rate (leads that became customers)
    const convertedLeads = leadsByStatus.find(l => l.status === 'CLOSED_WON')?._count.id || 0
    const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0

    // Campaign performance
    const campaignStats = recentCampaigns.reduce(
      (acc, campaign) => ({
        totalSent: acc.totalSent + campaign.totalSent,
        totalDelivered: acc.totalDelivered + campaign.totalDelivered,
        totalReplies: acc.totalReplies + campaign.totalReplies
      }),
      { totalSent: 0, totalDelivered: 0, totalReplies: 0 }
    )

    // Recent activity (mock data for now)
    const recentActivity = [
      {
        id: 1,
        type: 'campaign',
        title: 'Personal Loan Campaign launched',
        time: '2 hours ago',
        user: 'Admin User'
      },
      {
        id: 2,
        type: 'message',
        title: 'WhatsApp message sent to 500 contacts',
        time: '4 hours ago',
        user: 'Marketing Team'
      },
      {
        id: 3,
        type: 'lead',
        title: 'New lead: Rajesh Kumar - ₹5L Personal Loan',
        time: '6 hours ago',
        user: 'System'
      }
    ]

    const stats = {
      totalContacts,
      totalCampaigns,
      totalMessages,
      totalLeads,
      activeUsers: 8, // This would come from active sessions
      responseRate: Math.round(responseRate * 10) / 10,
      conversionRate: Math.round(conversionRate * 10) / 10,
      recentActivity,
      campaignStats,
      leadsByStatus: leadsByStatus.map(l => ({
        status: l.status,
        count: l._count.id
      })),
      messagesByType: messagesByType.map(m => ({
        type: m.type,
        count: m._count.id
      }))
    }

    console.log('✅ Successfully loaded dashboard stats from database')
    return NextResponse.json(stats)

  } catch (error) {
    console.error('⚠️ Database error in dashboard stats API, will fallback to JSON data:', error)
    return NextResponse.json(
      { message: 'Database not available', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 503 }
    )
  }
}