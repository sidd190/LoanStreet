import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { withAuthAndPermissions } from '@/lib/middleware/auth'
import { PERMISSIONS } from '@/lib/auth'

const prisma = new PrismaClient()

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuthAndPermissions([PERMISSIONS.CAMPAIGN_READ])(request, async (req) => {
    try {
      const campaign = await prisma.campaign.findUnique({
        where: { id: params.id },
        include: {
          createdBy: true,
          contacts: {
            include: {
              contact: true
            }
          },
          _count: {
            select: {
              contacts: true,
              messages: true
            }
          }
        }
      })

      if (!campaign) {
        return NextResponse.json(
          { error: 'Campaign not found' },
          { status: 404 }
        )
      }

      // Transform Prisma data to match our interface
      const transformedCampaign = {
        id: campaign.id,
        name: campaign.name,
        type: campaign.type as 'SMS' | 'WHATSAPP',
        message: campaign.message,
        templateName: campaign.templateName,
        parameters: campaign.parameters,
        mediaUrl: campaign.mediaUrl,
        mediaType: campaign.mediaType as 'image' | 'video' | 'document' | undefined,
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
        updatedAt: campaign.updatedAt.toISOString(),
        contacts: campaign.contacts.map(cc => ({
          id: cc.contact.id,
          name: cc.contact.name || '',
          phone: cc.contact.phone,
          email: cc.contact.email,
          status: cc.status,
          sentAt: cc.sentAt?.toISOString(),
          deliveredAt: cc.deliveredAt?.toISOString(),
          readAt: cc.readAt?.toISOString(),
          repliedAt: cc.repliedAt?.toISOString()
        }))
      }

      return NextResponse.json(transformedCampaign)
    } catch (error) {
      console.error('Database error in /api/campaigns/[id]:', error)
      return NextResponse.json(
        { error: 'Database not available' },
        { status: 503 }
      )
    }
  })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuthAndPermissions([PERMISSIONS.CAMPAIGN_UPDATE])(request, async (req) => {
    try {
      const data = await req.json()
      
      // Check if campaign exists and can be updated
      const existingCampaign = await prisma.campaign.findUnique({
        where: { id: params.id }
      })

      if (!existingCampaign) {
        return NextResponse.json(
          { error: 'Campaign not found' },
          { status: 404 }
        )
      }

      // Check if campaign can be edited based on status and operation
      const editableStatuses = ['DRAFT', 'SCHEDULED']
      const statusChangeOperations = ['RUNNING', 'PAUSED', 'CANCELLED', 'COMPLETED']
      
      if (!editableStatuses.includes(existingCampaign.status) && 
          !statusChangeOperations.includes(data.status) && 
          !data.status) {
        return NextResponse.json(
          { error: 'Campaign cannot be edited in current status' },
          { status: 400 }
        )
      }

      // Validate status transitions
      if (data.status) {
        const validTransitions: Record<string, string[]> = {
          'DRAFT': ['SCHEDULED', 'RUNNING', 'CANCELLED'],
          'SCHEDULED': ['RUNNING', 'CANCELLED', 'DRAFT'],
          'RUNNING': ['PAUSED', 'CANCELLED', 'COMPLETED'],
          'PAUSED': ['RUNNING', 'CANCELLED'],
          'COMPLETED': [],
          'CANCELLED': []
        }

        if (!validTransitions[existingCampaign.status]?.includes(data.status)) {
          return NextResponse.json(
            { error: `Cannot change status from ${existingCampaign.status} to ${data.status}` },
            { status: 400 }
          )
        }
      }

      const updateData: any = {
        updatedAt: new Date()
      }

      // Only update fields that are provided
      if (data.name !== undefined) updateData.name = data.name
      if (data.message !== undefined) updateData.message = data.message
      if (data.templateName !== undefined) updateData.templateName = data.templateName
      if (data.parameters !== undefined) updateData.parameters = data.parameters
      if (data.mediaUrl !== undefined) updateData.mediaUrl = data.mediaUrl
      if (data.mediaType !== undefined) updateData.mediaType = data.mediaType
      if (data.scheduledAt !== undefined) {
        updateData.scheduledAt = data.scheduledAt ? new Date(data.scheduledAt) : null
      }
      if (data.status !== undefined) {
        updateData.status = data.status
        
        // Set sentAt when campaign starts running for the first time
        if (data.status === 'RUNNING' && !existingCampaign.sentAt) {
          updateData.sentAt = new Date()
        }
        
        // Set completedAt when campaign is completed or cancelled
        if (['COMPLETED', 'CANCELLED'].includes(data.status)) {
          updateData.completedAt = new Date()
        }
      }

      const campaign = await prisma.campaign.update({
        where: { id: params.id },
        data: updateData,
        include: {
          createdBy: true,
          _count: {
            select: {
              contacts: true
            }
          }
        }
      })

      // Transform response
      const transformedCampaign = {
        id: campaign.id,
        name: campaign.name,
        type: campaign.type as 'SMS' | 'WHATSAPP',
        message: campaign.message,
        status: campaign.status as 'DRAFT' | 'SCHEDULED' | 'RUNNING' | 'COMPLETED' | 'PAUSED' | 'CANCELLED',
        scheduledAt: campaign.scheduledAt?.toISOString(),
        sentAt: campaign.sentAt?.toISOString(),
        completedAt: campaign.completedAt?.toISOString(),
        totalContacts: campaign._count.contacts,
        totalSent: campaign.totalSent,
        totalDelivered: campaign.totalDelivered,
        totalReplies: campaign.totalReplies,
        totalFailed: campaign.totalSent - campaign.totalDelivered,
        createdBy: campaign.createdBy.name,
        createdAt: campaign.createdAt.toISOString(),
        updatedAt: campaign.updatedAt.toISOString()
      }

      return NextResponse.json(transformedCampaign)
    } catch (error) {
      console.error('Error updating campaign:', error)
      return NextResponse.json(
        { error: 'Failed to update campaign' },
        { status: 500 }
      )
    }
  })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuthAndPermissions([PERMISSIONS.CAMPAIGN_DELETE])(request, async (req) => {
    try {
      // Check if campaign exists
      const existingCampaign = await prisma.campaign.findUnique({
        where: { id: params.id }
      })

      if (!existingCampaign) {
        return NextResponse.json(
          { error: 'Campaign not found' },
          { status: 404 }
        )
      }

      // Check if campaign can be deleted based on status
      const deletableStatuses = ['DRAFT', 'SCHEDULED', 'CANCELLED']
      if (!deletableStatuses.includes(existingCampaign.status)) {
        return NextResponse.json(
          { error: 'Cannot delete campaign in current status' },
          { status: 400 }
        )
      }

      // Delete campaign (cascade will handle related records)
      await prisma.campaign.delete({
        where: { id: params.id }
      })

      return NextResponse.json({ success: true })
    } catch (error) {
      console.error('Error deleting campaign:', error)
      return NextResponse.json(
        { error: 'Failed to delete campaign' },
        { status: 500 }
      )
    }
  })
}