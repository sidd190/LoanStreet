import { NextRequest, NextResponse } from 'next/server'
import { withAuthAndRole } from '@/lib/middleware/auth'
import DataService from '@/lib/dataService'
import { broadcastMessageReceived, broadcastMessageStatusUpdate } from '@/lib/realTimeMessaging'
import { getMessageService } from '@/lib/messageService'
import { logger } from '@/lib/logger'
import { auditLogger, AuditEventType } from '@/lib/security/auditLogger'

// POST /api/messages/send - Enhanced message sending with error handling and fallbacks
export async function POST(request: NextRequest) {
  return withAuthAndRole(['ADMIN', 'EMPLOYEE'])(request, async (req) => {
    const startTime = Date.now()
    
    try {
      const messageData = await req.json()
      
      // Add sender information
      messageData.sentById = req.user!.id
      messageData.sentBy = req.user!.name
      messageData.sentAt = new Date().toISOString()
      
      // Validate required fields
      if (!messageData.content || !messageData.contactPhone) {
        return NextResponse.json(
          { success: false, message: 'Content and contact phone are required' },
          { status: 400 }
        )
      }
      
      // Validate message content length
      if (messageData.content.length > 4096) {
        return NextResponse.json(
          { success: false, message: 'Message content exceeds maximum length (4096 characters)' },
          { status: 400 }
        )
      }
      
      // Set default values
      messageData.direction = 'OUTBOUND'
      messageData.type = messageData.type || 'WHATSAPP'
      
      // Get enhanced message service
      const messageService = getMessageService()
      
      // Determine message priority based on user role and message type
      const priority = messageData.priority || (req.user!.role === 'ADMIN' ? 'high' : 'normal')
      
      // Send message using enhanced service with error handling and fallbacks
      let sendResult
      
      if (messageData.type === 'WHATSAPP') {
        if (messageData.mediaUrl) {
          // Send media message
          sendResult = await messageService.sendWhatsAppMedia(
            {
              phone: [messageData.contactPhone],
              templateName: messageData.templateName || 'custom_message',
              parameters: [messageData.content],
              mediaType: messageData.mediaType || 'image',
              mediaUrl: messageData.mediaUrl,
            },
            {
              priority,
              enableFallback: true,
              fallbackToSMS: true,
              retryOnFailure: true,
              trackDelivery: true,
            }
          )
        } else if (messageData.isReply) {
          // Send reply message
          sendResult = await messageService.sendReply(
            {
              phone: messageData.contactPhone,
              text: messageData.content,
            },
            {
              priority: 'high', // Replies are always high priority
              enableFallback: true,
              fallbackToSMS: true,
              retryOnFailure: true,
              trackDelivery: true,
            }
          )
        } else {
          // Send regular text message
          sendResult = await messageService.sendWhatsAppText(
            {
              phone: [messageData.contactPhone],
              templateName: messageData.templateName || 'custom_message',
              parameters: [messageData.content],
            },
            {
              priority,
              enableFallback: true,
              fallbackToSMS: true,
              retryOnFailure: true,
              trackDelivery: true,
            }
          )
        }
      } else {
        // Direct SMS send (fallback or explicit SMS request)
        sendResult = await messageService.sendWhatsAppText(
          {
            phone: [messageData.contactPhone],
            templateName: messageData.templateName || 'custom_message',
            parameters: [messageData.content],
          },
          {
            priority,
            enableFallback: false, // Direct SMS, no fallback needed
            fallbackToSMS: true,
            retryOnFailure: true,
            trackDelivery: true,
          }
        )
      }
      
      // Update message data with send result
      messageData.status = sendResult.success ? 'SENT' : 'FAILED'
      messageData.smsFreshId = sendResult.messageId
      messageData.deliveryMethod = sendResult.method
      messageData.fallbackUsed = sendResult.fallbackUsed
      messageData.retryCount = sendResult.retryCount
      messageData.sendErrors = sendResult.errors
      
      if (!sendResult.success) {
        messageData.failureReason = sendResult.errors.join('; ')
      }
      
      // Save message to database
      const message = await DataService.sendMessage(messageData)
      
      // Broadcast message to real-time subscribers
      try {
        const contactId = messageData.contactPhone // Using phone as contactId for now
        broadcastMessageReceived(contactId, message)
        
        // Only simulate status updates if message was sent successfully
        if (sendResult.success) {
          // Real status updates will come from webhooks, but we can simulate for immediate feedback
          setTimeout(() => {
            broadcastMessageStatusUpdate(contactId, message.id, 'DELIVERED')
          }, 2000)
          
          setTimeout(() => {
            broadcastMessageStatusUpdate(contactId, message.id, 'READ')
          }, 5000)
        }
      } catch (broadcastError) {
        logger.error('Failed to broadcast message', broadcastError)
      }
      
      // Log comprehensive audit trail
      await auditLogger.logEvent(
        sendResult.success ? AuditEventType.MESSAGE_SENT : AuditEventType.MESSAGE_SEND_FAILED,
        `Message ${sendResult.success ? 'sent' : 'failed'} via ${sendResult.method}`,
        {
          messageId: message.id,
          smsFreshId: sendResult.messageId,
          userId: req.user!.id,
          userRole: req.user!.role,
          contactPhone: messageData.contactPhone.replace(/\d/g, '*'), // Mask for privacy
          messageType: messageData.type,
          deliveryMethod: sendResult.method,
          fallbackUsed: sendResult.fallbackUsed,
          retryCount: sendResult.retryCount,
          processingTime: Date.now() - startTime,
          success: sendResult.success,
          errors: sendResult.errors,
        }
      )
      
      // Log employee action if user is employee
      if (req.user!.role === 'EMPLOYEE') {
        try {
          await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/employee/log-action`, {
            method: 'POST',
            headers: {
              'Authorization': req.headers.get('authorization') || '',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              action: 'send_message',
              details: {
                messageId: message.id,
                contactPhone: messageData.contactPhone,
                messageType: messageData.type,
                contentLength: messageData.content.length,
                deliveryMethod: sendResult.method,
                fallbackUsed: sendResult.fallbackUsed,
                success: sendResult.success,
              }
            })
          })
        } catch (logError) {
          logger.error('Failed to log employee action', logError)
        }
      }
      
      const processingTime = Date.now() - startTime
      
      return NextResponse.json({
        success: sendResult.success,
        message,
        sendResult: {
          messageId: sendResult.messageId,
          method: sendResult.method,
          fallbackUsed: sendResult.fallbackUsed,
          retryCount: sendResult.retryCount,
          processingTime,
          errors: sendResult.errors,
        },
        message: sendResult.success 
          ? `Message sent successfully via ${sendResult.method.toUpperCase()}${sendResult.fallbackUsed ? ' (fallback)' : ''}`
          : `Failed to send message: ${sendResult.errors.join('; ')}`,
      })
      
    } catch (error) {
      const processingTime = Date.now() - startTime
      
      logger.error('Message send error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.id,
        processingTime,
      })
      
      // Log error in audit trail
      await auditLogger.logEvent(
        AuditEventType.MESSAGE_SEND_FAILED,
        'Message send failed with exception',
        {
          userId: req.user?.id,
          userRole: req.user?.role,
          error: error instanceof Error ? error.message : 'Unknown error',
          processingTime,
        }
      )
      
      return NextResponse.json(
        { 
          success: false, 
          message: 'Failed to send message',
          error: error instanceof Error ? error.message : 'Unknown error',
          processingTime,
        },
        { status: 500 }
      )
    }
  })
}