import { NextRequest, NextResponse } from 'next/server'
import { withAuthAndPermissions } from '@/lib/middleware/auth'
import { PERMISSIONS } from '@/lib/auth'
import { getCampaignExecutor } from '@/lib/campaignExecutor'
import { validateMessageLength } from '@/lib/messageTemplates'

export async function POST(request: NextRequest) {
  return withAuthAndPermissions([PERMISSIONS.MESSAGE_SEND])(request, async (req) => {
    try {
      const data = await req.json()
      
      // Validate required fields
      if (!data.contacts || !Array.isArray(data.contacts) || data.contacts.length === 0) {
        return NextResponse.json(
          { error: 'Contacts array is required and cannot be empty' },
          { status: 400 }
        )
      }

      if (!data.message || !data.type) {
        return NextResponse.json(
          { error: 'Message content and type are required' },
          { status: 400 }
        )
      }

      // Validate message length
      const messageValidation = validateMessageLength(data.message, data.type)
      if (!messageValidation.valid) {
        return NextResponse.json(
          { error: messageValidation.error },
          { status: 400 }
        )
      }

      // Validate contacts format
      const validContacts = data.contacts.filter((contact: any) => 
        contact.id && contact.phone && typeof contact.phone === 'string'
      )

      if (validContacts.length === 0) {
        return NextResponse.json(
          { error: 'No valid contacts provided. Each contact must have id and phone.' },
          { status: 400 }
        )
      }

      if (validContacts.length !== data.contacts.length) {
        console.warn(`${data.contacts.length - validContacts.length} invalid contacts filtered out`)
      }

      // Validate media parameters for WhatsApp
      if (data.type === 'WHATSAPP' && data.mediaUrl) {
        if (!data.mediaType || !['image', 'video', 'document'].includes(data.mediaType)) {
          return NextResponse.json(
            { error: 'Valid mediaType is required when mediaUrl is provided' },
            { status: 400 }
          )
        }
      }

      const campaignExecutor = getCampaignExecutor()
      
      // Send immediate bulk message
      const result = await campaignExecutor.sendImmediateMessage({
        contacts: validContacts,
        message: data.message,
        type: data.type,
        templateId: data.templateId,
        parameters: data.parameters,
        mediaUrl: data.mediaUrl,
        mediaType: data.mediaType,
        userId: req.user!.id
      })

      if (result.success) {
        return NextResponse.json({
          success: true,
          messageId: result.messageId,
          totalProcessed: result.totalProcessed,
          successCount: result.successCount,
          failureCount: result.failureCount,
          message: `Successfully sent ${result.successCount} messages`
        })
      } else {
        return NextResponse.json({
          success: false,
          totalProcessed: result.totalProcessed,
          successCount: result.successCount,
          failureCount: result.failureCount,
          errors: result.errors,
          message: `Sent ${result.successCount} messages, ${result.failureCount} failed`
        }, { status: 207 }) // 207 Multi-Status for partial success
      }
    } catch (error) {
      console.error('Bulk messaging error:', error)
      return NextResponse.json(
        { error: 'Failed to send bulk messages' },
        { status: 500 }
      )
    }
  })
}

export async function GET(request: NextRequest) {
  return withAuthAndPermissions([PERMISSIONS.MESSAGE_READ])(request, async (req) => {
    try {
      const { searchParams } = new URL(request.url)
      const campaignId = searchParams.get('campaignId')

      if (!campaignId) {
        return NextResponse.json(
          { error: 'Campaign ID is required' },
          { status: 400 }
        )
      }

      const campaignExecutor = getCampaignExecutor()
      const status = await campaignExecutor.getCampaignStatus(campaignId)

      return NextResponse.json(status)
    } catch (error) {
      console.error('Error getting bulk message status:', error)
      return NextResponse.json(
        { error: 'Failed to get message status' },
        { status: 500 }
      )
    }
  })
}