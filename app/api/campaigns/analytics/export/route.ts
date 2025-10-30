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

      // Get campaigns with detailed data
      const campaigns = await prisma.campaign.findMany({
        where: {
          createdAt: {
            gte: startDate
          }
        },
        include: {
          contacts: true,
          createdBy: {
            select: { name: true }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      })

      // Generate CSV content
      const csvHeaders = [
        'Campaign ID',
        'Campaign Name',
        'Type',
        'Status',
        'Created By',
        'Created Date',
        'Sent Date',
        'Total Contacts',
        'Messages Sent',
        'Messages Delivered',
        'Messages Failed',
        'Replies',
        'Delivery Rate (%)',
        'Response Rate (%)',
        'Estimated Cost ($)'
      ]

      const csvRows = campaigns.map(campaign => {
        const deliveryRate = campaign.totalSent > 0 ? 
          ((campaign.totalDelivered / campaign.totalSent) * 100).toFixed(2) : '0.00'
        const responseRate = campaign.totalSent > 0 ? 
          ((campaign.totalReplies / campaign.totalSent) * 100).toFixed(2) : '0.00'
        const estimatedCost = campaign.totalSent * (campaign.type === 'SMS' ? 0.05 : 0.03)

        return [
          campaign.id,
          `"${campaign.name}"`, // Wrap in quotes to handle commas
          campaign.type,
          campaign.status,
          `"${campaign.createdBy.name}"`,
          campaign.createdAt.toISOString().split('T')[0],
          campaign.sentAt ? campaign.sentAt.toISOString().split('T')[0] : '',
          campaign.contacts.length,
          campaign.totalSent,
          campaign.totalDelivered,
          campaign.totalFailed,
          campaign.totalReplies,
          deliveryRate,
          responseRate,
          estimatedCost.toFixed(2)
        ]
      })

      // Combine headers and rows
      const csvContent = [
        csvHeaders.join(','),
        ...csvRows.map(row => row.join(','))
      ].join('\n')

      // Create response with CSV content
      const response = new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="campaign-analytics-${timeRange}-${new Date().toISOString().split('T')[0]}.csv"`
        }
      })

      return response
    } catch (error) {
      console.error('Error exporting campaign analytics:', error)
      return NextResponse.json(
        { error: 'Failed to export analytics' },
        { status: 500 }
      )
    }
  })
}