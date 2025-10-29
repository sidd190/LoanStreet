import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { logger } from '../../../../lib/logger'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') // 'available', 'processed', 'all'
    const limit = parseInt(searchParams.get('limit') || '50')

    let whereClause: any = { isActive: true }

    if (status === 'available') {
      // Contacts not contacted in the last 7 days
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      whereClause = {
        ...whereClause,
        OR: [
          { lastContact: null },
          { lastContact: { lt: sevenDaysAgo } }
        ]
      }
    } else if (status === 'processed') {
      // Contacts contacted in the last 7 days
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      whereClause = {
        ...whereClause,
        lastContact: { gte: sevenDaysAgo }
      }
    }

    const contacts = await prisma.contact.findMany({
      where: whereClause,
      include: {
        campaigns: {
          include: {
            campaign: {
              select: { id: true, name: true, status: true, createdAt: true }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 1
        },
        leads: {
          select: { id: true, status: true, loanType: true, loanAmount: true }
        }
      },
      orderBy: { createdAt: 'asc' },
      take: limit
    })

    const dataSets = contacts.map(contact => ({
      id: contact.id,
      phone: contact.phone,
      name: contact.name,
      isActive: contact.isActive,
      lastContact: contact.lastContact,
      tags: contact.tags ? JSON.parse(contact.tags) : [],
      lastCampaign: contact.campaigns[0] || null,
      leadCount: contact.leads.length,
      leadTypes: [...new Set(contact.leads.map(lead => lead.loanType))],
      totalLoanAmount: contact.leads.reduce((sum, lead) => sum + lead.loanAmount, 0),
      createdAt: contact.createdAt,
      updatedAt: contact.updatedAt
    }))

    // Group by processing status for summary
    const summary = {
      total: dataSets.length,
      available: dataSets.filter(ds => !ds.lastContact || 
        new Date(ds.lastContact).getTime() < Date.now() - 7 * 24 * 60 * 60 * 1000).length,
      processed: dataSets.filter(ds => ds.lastContact && 
        new Date(ds.lastContact).getTime() >= Date.now() - 7 * 24 * 60 * 60 * 1000).length,
      withLeads: dataSets.filter(ds => ds.leadCount > 0).length
    }

    return NextResponse.json({
      dataSets,
      summary,
      pagination: {
        limit,
        hasMore: contacts.length === limit
      }
    })
  } catch (error) {
    logger.error('Error fetching data sets:', error)
    return NextResponse.json(
      { error: 'Failed to fetch data sets' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, contactIds, campaignId } = body

    switch (action) {
      case 'mark_processed':
        await prisma.contact.updateMany({
          where: { id: { in: contactIds } },
          data: { 
            lastContact: new Date(),
            updatedAt: new Date()
          }
        })
        
        logger.info(`Marked ${contactIds.length} contacts as processed`)
        return NextResponse.json({ 
          success: true, 
          message: `Marked ${contactIds.length} contacts as processed` 
        })

      case 'reset_processing':
        await prisma.contact.updateMany({
          where: { id: { in: contactIds } },
          data: { 
            lastContact: null,
            updatedAt: new Date()
          }
        })
        
        logger.info(`Reset processing status for ${contactIds.length} contacts`)
        return NextResponse.json({ 
          success: true, 
          message: `Reset processing status for ${contactIds.length} contacts` 
        })

      case 'create_next_campaign':
        if (!campaignId) {
          return NextResponse.json(
            { error: 'Campaign ID is required for creating next campaign' },
            { status: 400 }
          )
        }

        const sourceCampaign = await prisma.campaign.findUnique({
          where: { id: campaignId }
        })

        if (!sourceCampaign) {
          return NextResponse.json(
            { error: 'Source campaign not found' },
            { status: 404 }
          )
        }

        const nextCampaign = await prisma.campaign.create({
          data: {
            name: `${sourceCampaign.name} - Next Set`,
            type: sourceCampaign.type,
            message: sourceCampaign.message,
            templateName: sourceCampaign.templateName,
            parameters: sourceCampaign.parameters,
            mediaUrl: sourceCampaign.mediaUrl,
            mediaType: sourceCampaign.mediaType,
            status: 'DRAFT',
            createdById: sourceCampaign.createdById
          }
        })

        // Add contacts to the new campaign
        const campaignContacts = contactIds.map((contactId: string) => ({
          campaignId: nextCampaign.id,
          contactId
        }))

        await prisma.campaignContact.createMany({
          data: campaignContacts
        })

        logger.info(`Created next campaign ${nextCampaign.id} with ${contactIds.length} contacts`)
        return NextResponse.json({
          success: true,
          campaignId: nextCampaign.id,
          message: `Created next campaign with ${contactIds.length} contacts`
        })

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }
  } catch (error) {
    logger.error('Error processing data set action:', error)
    return NextResponse.json(
      { error: 'Failed to process data set action' },
      { status: 500 }
    )
  }
}