import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    // Get user from token
    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      )
    }

    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      )
    }

    // Get dashboard statistics
    const [
      totalContacts,
      totalCampaigns,
      totalMessages,
      totalLeads,
      activeCampaigns,
      recentMessages
    ] = await Promise.all([
      prisma.contact.count(),
      prisma.campaign.count(),
      prisma.message.count(),
      prisma.lead.count(),
      prisma.campaign.count({
        where: {
          status: {
            in: ['RUNNING', 'SCHEDULED']
          }
        }
      }),
      prisma.message.findMany({
        take: 5,
        orderBy: {
          createdAt: 'desc'
        },
        include: {
          contact: {
            select: {
              name: true,
              phone: true
            }
          },
          campaign: {
            select: {
              name: true
            }
          }
        }
      })
    ])

    // Calculate response rate (messages with replies vs total sent)
    const totalSentMessages = await prisma.message.count({
      where: {
        direction: 'OUTBOUND'
      }
    })

    const totalReplies = await prisma.message.count({
      where: {
        direction: 'INBOUND'
      }
    })

    const responseRate = totalSentMessages > 0 ? (totalReplies / totalSentMessages) * 100 : 0

    // Calculate conversion rate (leads converted vs total leads)
    const convertedLeads = await prisma.lead.count({
      where: {
        status: 'CLOSED_WON'
      }
    })

    const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0

    // Format recent activity
    const recentActivity = recentMessages.map((message, index) => ({
      id: message.id,
      type: message.direction === 'OUTBOUND' ? 'message' : 'reply',
      title: message.direction === 'OUTBOUND' 
        ? `Message sent to ${message.contact?.name || 'Unknown'}`
        : `Reply received from ${message.contact?.name || 'Unknown'}`,
      time: getTimeAgo(message.createdAt),
      user: message.direction === 'OUTBOUND' ? 'System' : message.contact?.name || 'Unknown'
    }))

    const stats = {
      totalContacts,
      totalCampaigns,
      totalMessages,
      totalLeads,
      activeCampaigns,
      responseRate: Math.round(responseRate * 10) / 10,
      conversionRate: Math.round(conversionRate * 10) / 10,
      recentActivity
    }

    return NextResponse.json({
      success: true,
      data: stats
    })

  } catch (error) {
    console.error('Dashboard stats error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch dashboard stats' },
      { status: 500 }
    )
  }
}

function getTimeAgo(date: Date): string {
  const now = new Date()
  const diffInMs = now.getTime() - date.getTime()
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60))
  const diffInHours = Math.floor(diffInMinutes / 60)
  const diffInDays = Math.floor(diffInHours / 24)

  if (diffInMinutes < 60) {
    return `${diffInMinutes} minutes ago`
  } else if (diffInHours < 24) {
    return `${diffInHours} hours ago`
  } else {
    return `${diffInDays} days ago`
  }
}