import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { logger } from '../../../../../lib/logger'

const prisma = new PrismaClient()

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const campaign = await prisma.campaign.findUnique({
      where: { id: params.id },
      include: {
        contacts: true,
        messages: true,
        createdBy: {
          select: { id: true, name: true, email: true }
        }
      }
    })

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }

    // Calculate performance metrics
    const totalContacts = campaign.contacts.length
    const sentCount = campaign.contacts.filter(cc => ['SENT', 'DELIVERED', 'READ', 'REPLIED'].includes(cc.status)).length
    const deliveredCount = campaign.contacts.filter(cc => ['DELIVERED', 'READ', 'REPLIED'].includes(cc.status)).length
    const readCount = campaign.contacts.filter(cc => ['READ', 'REPLIED'].includes(cc.status)).length
    const repliedCount = campaign.contacts.filter(cc => cc.status === 'REPLIED').length
    const failedCount = campaign.contacts.filter(cc => cc.status === 'FAILED').length

    // Calculate rates
    const deliveryRate = sentCount > 0 ? (deliveredCount / sentCount * 100) : 0
    const readRate = deliveredCount > 0 ? (readCount / deliveredCount * 100) : 0
    const responseRate = sentCount > 0 ? (repliedCount / sentCount * 100) : 0

    // Calculate duration
    const duration = campaign.sentAt && campaign.updatedAt 
      ? Math.round((campaign.updatedAt.getTime() - campaign.sentAt.getTime()) / 1000 / 60)
      : 0

    // Cost estimation
    const costPerMessage = campaign.type === 'SMS' ? 0.05 : 0.03
    const estimatedCost = sentCount * costPerMessage

    // Generate recommendations
    const recommendations: string[] = []
    
    if (deliveryRate < 80) {
      recommendations.push('Low delivery rate detected. Consider cleaning your contact list and removing invalid numbers.')
    }
    
    if (responseRate < 2) {
      recommendations.push('Low response rate. Consider A/B testing different message templates or timing.')
    }
    
    if (campaign.type === 'SMS' && responseRate > 5) {
      recommendations.push('Good SMS response rate. Consider switching to WhatsApp for richer media content.')
    }
    
    if (!campaign.templateName) {
      recommendations.push('Consider using message templates for better personalization and compliance.')
    }

    // Engagement timeline (messages sent over time)
    const engagementTimeline = await prisma.message.groupBy({
      by: ['sentAt'],
      where: {
        campaignId: params.id,
        sentAt: { not: null }
      },
      _count: { id: true },
      orderBy: { sentAt: 'asc' }
    })

    const report = {
      campaign: {
        id: campaign.id,
        name: campaign.name,
        type: campaign.type,
        status: campaign.status,
        createdAt: campaign.createdAt,
        sentAt: campaign.sentAt,
        completedAt: campaign.updatedAt,
        createdBy: campaign.createdBy
      },
      metrics: {
        totalContacts,
        sentCount,
        deliveredCount,
        readCount,
        repliedCount,
        failedCount,
        deliveryRate: Math.round(deliveryRate * 100) / 100,
        readRate: Math.round(readRate * 100) / 100,
        responseRate: Math.round(responseRate * 100) / 100
      },
      performance: {
        duration: `${duration} minutes`,
        estimatedCost: `$${estimatedCost.toFixed(2)}`,
        costPerResponse: repliedCount > 0 ? `$${(estimatedCost / repliedCount).toFixed(2)}` : 'N/A',
        messagesPerMinute: duration > 0 ? Math.round(sentCount / duration) : 0
      },
      engagement: {
        timeline: engagementTimeline.map(item => ({
          time: item.sentAt,
          count: item._count.id
        })),
        peakHour: this.findPeakEngagementHour(engagementTimeline),
        averageResponseTime: await this.calculateAverageResponseTime(params.id)
      },
      recommendations,
      generatedAt: new Date().toISOString()
    }

    return NextResponse.json(report)
  } catch (error) {
    logger.error(`Error generating campaign report for ${params.id}:`, error)
    return NextResponse.json(
      { error: 'Failed to generate campaign report' },
      { status: 500 }
    )
  }
}

// Helper function to find peak engagement hour
function findPeakEngagementHour(timeline: any[]): string {
  if (timeline.length === 0) return 'N/A'
  
  const hourCounts: { [hour: string]: number } = {}
  
  timeline.forEach(item => {
    if (item.sentAt) {
      const hour = new Date(item.sentAt).getHours()
      hourCounts[hour] = (hourCounts[hour] || 0) + item._count.id
    }
  })
  
  const peakHour = Object.keys(hourCounts).reduce((a, b) => 
    hourCounts[a] > hourCounts[b] ? a : b
  )
  
  return `${peakHour}:00`
}

// Helper function to calculate average response time
async function calculateAverageResponseTime(campaignId: string): Promise<string> {
  try {
    const responses = await prisma.campaignContact.findMany({
      where: {
        campaignId,
        status: 'REPLIED',
        sentAt: { not: null },
        repliedAt: { not: null }
      },
      select: {
        sentAt: true,
        repliedAt: true
      }
    })

    if (responses.length === 0) return 'N/A'

    const totalResponseTime = responses.reduce((sum, response) => {
      if (response.sentAt && response.repliedAt) {
        return sum + (response.repliedAt.getTime() - response.sentAt.getTime())
      }
      return sum
    }, 0)

    const averageMs = totalResponseTime / responses.length
    const averageHours = Math.round(averageMs / (1000 * 60 * 60) * 10) / 10

    return `${averageHours} hours`
  } catch (error) {
    logger.error('Error calculating average response time:', error)
    return 'N/A'
  }
}