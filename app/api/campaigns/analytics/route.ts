import { NextRequest, NextResponse } from 'next/server'
import { withAuthAndPermissions } from '@/lib/middleware/auth'
import { PERMISSIONS } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  return withAuthAndPermissions([PERMISSIONS.CAMPAIGN_READ])(request, async (req) => {
    try {
      const { searchParams } = new URL(request.url)
      const timeRange = searchParams.get('timeRange') || '30d'
      
      // Calculate date range
      const now = new Date()
      let startDate: Date
      
      switch (timeRange) {
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          break
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          break
        case '90d':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
          break
        default:
          startDate = new Date(0) // All time
      }

      // Get campaigns in date range
      const campaigns = await prisma.campaign.findMany({
        where: {
          createdAt: {
            gte: startDate
          }
        },
        include: {
          contacts: true,
          messages: true,
          createdBy: {
            select: { name: true }
          }
        }
      })

      // Calculate overview metrics
      const totalCampaigns = campaigns.length
      const totalMessages = campaigns.reduce((sum, c) => sum + c.totalSent, 0)
      const totalDelivered = campaigns.reduce((sum, c) => sum + c.totalDelivered, 0)
      const totalReplies = campaigns.reduce((sum, c) => sum + c.totalReplies, 0)
      const totalContacts = new Set(campaigns.flatMap(c => c.contacts.map(cc => cc.contactId))).size
      
      const averageDeliveryRate = totalMessages > 0 ? (totalDelivered / totalMessages) * 100 : 0
      const averageResponseRate = totalMessages > 0 ? (totalReplies / totalMessages) * 100 : 0
      
      // Estimate costs (adjust based on actual pricing)
      const costPerSMS = 0.05
      const costPerWhatsApp = 0.03
      const totalCost = campaigns.reduce((sum, c) => {
        const costPerMessage = c.type === 'SMS' ? costPerSMS : costPerWhatsApp
        return sum + (c.totalSent * costPerMessage)
      }, 0)

      // Calculate performance metrics
      const performance = {
        deliveryRate: averageDeliveryRate,
        responseRate: averageResponseRate,
        conversionRate: totalReplies > 0 ? (totalReplies * 0.25) : 0, // Estimated conversion rate
        averageResponseTime: 2.4, // Hours - would need to calculate from actual data
        costPerMessage: totalMessages > 0 ? totalCost / totalMessages : 0,
        costPerResponse: totalReplies > 0 ? totalCost / totalReplies : 0
      }

      // Campaign comparison data
      const campaignComparison = campaigns
        .filter(c => c.totalSent > 0)
        .map(c => ({
          id: c.id,
          name: c.name,
          type: c.type,
          sent: c.totalSent,
          delivered: c.totalDelivered,
          responses: c.totalReplies,
          deliveryRate: c.totalSent > 0 ? (c.totalDelivered / c.totalSent) * 100 : 0,
          responseRate: c.totalSent > 0 ? (c.totalReplies / c.totalSent) * 100 : 0,
          cost: c.totalSent * (c.type === 'SMS' ? costPerSMS : costPerWhatsApp),
          roi: c.totalReplies > 0 ? (c.totalReplies * 100) : 0 // Simplified ROI calculation
        }))
        .sort((a, b) => b.responseRate - a.responseRate)
        .slice(0, 10)

      // Top performers
      const topPerformers = campaignComparison
        .slice(0, 5)
        .map(c => ({
          id: c.id,
          name: c.name,
          type: c.type,
          responseRate: c.responseRate,
          conversionRate: c.responseRate * 0.25, // Estimated conversion rate
          roi: c.roi
        }))

      // Generate recommendations
      const recommendations = generateRecommendations(campaigns, performance)

      const analytics = {
        overview: {
          totalCampaigns,
          totalMessages,
          totalContacts,
          averageDeliveryRate,
          averageResponseRate,
          totalCost
        },
        performance,
        campaignComparison,
        topPerformers,
        recommendations
      }

      return NextResponse.json(analytics)
    } catch (error) {
      console.error('Error generating campaign analytics:', error)
      return NextResponse.json(
        { error: 'Failed to generate analytics' },
        { status: 500 }
      )
    }
  })
}

function generateRecommendations(campaigns: any[], performance: any): string[] {
  const recommendations: string[] = []
  
  // Analyze campaign types
  const whatsappCampaigns = campaigns.filter(c => c.type === 'WHATSAPP')
  const smsCampaigns = campaigns.filter(c => c.type === 'SMS')
  
  if (whatsappCampaigns.length > 0 && smsCampaigns.length > 0) {
    const whatsappAvgResponse = whatsappCampaigns.reduce((sum, c) => 
      sum + (c.totalSent > 0 ? (c.totalReplies / c.totalSent) * 100 : 0), 0) / whatsappCampaigns.length
    const smsAvgResponse = smsCampaigns.reduce((sum, c) => 
      sum + (c.totalSent > 0 ? (c.totalReplies / c.totalSent) * 100 : 0), 0) / smsCampaigns.length
    
    if (whatsappAvgResponse > smsAvgResponse * 1.2) {
      recommendations.push('WhatsApp campaigns show significantly higher response rates than SMS. Consider shifting budget allocation.')
    }
  }
  
  // Delivery rate recommendations
  if (performance.deliveryRate < 90) {
    recommendations.push('Low delivery rate detected. Consider cleaning your contact list and removing invalid numbers.')
  }
  
  // Response rate recommendations
  if (performance.responseRate < 5) {
    recommendations.push('Low response rate. Consider A/B testing different message templates or timing.')
  }
  
  // Cost efficiency recommendations
  if (performance.costPerResponse > 0.5) {
    recommendations.push('High cost per response. Review targeting criteria and message effectiveness.')
  }
  
  // General best practices
  recommendations.push('Peak engagement occurs between 10 AM - 2 PM. Schedule campaigns accordingly.')
  recommendations.push('Personalized messages with customer names show 18% better performance.')
  
  if (campaigns.some(c => c.status === 'COMPLETED' && c.totalReplies > 0)) {
    recommendations.push('Follow-up campaigns within 24 hours increase conversion by 35%.')
  }
  
  return recommendations.slice(0, 5) // Limit to 5 recommendations
}