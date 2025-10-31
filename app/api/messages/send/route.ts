import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth'
import smsFreshService from '@/lib/smsFreshService'
import Logger, { DataSource } from '@/lib/logger'

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    // Verify authentication
    const authResult = await verifyAuth(request)
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, message: authResult.error },
        { status: 401 }
      )
    }

    const user = authResult.user!
    const messageData = await request.json()
    
    // Add sender information
    messageData.sentById = user.id
    messageData.sentBy = user.name
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
    messageData.id = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    messageData.createdAt = new Date().toISOString()
    
    Logger.info(DataSource.API, 'send_message', `Sending ${messageData.type} message to ${messageData.contactPhone}`)
    
    // Send message using SMSFresh service
    let sendResult
    
    if (messageData.type === 'WHATSAPP') {
      if (messageData.mediaUrl) {
        // Send media message
        sendResult = await smsFreshService.sendMediaMessage(
          messageData.contactPhone,
          messageData.templateName || 'CUSTOM_MESSAGE',
          messageData.mediaUrl,
          messageData.mediaType || 'image',
          [messageData.content]
        )
      } else if (messageData.templateName) {
        // Send template message
        sendResult = await smsFreshService.sendTemplateMessage(
          messageData.contactPhone,
          messageData.templateName,
          [messageData.content]
        )
      } else {
        // Send text message (reply)
        sendResult = await smsFreshService.sendTextMessage(
          messageData.contactPhone,
          messageData.content
        )
      }
    } else {
      // For SMS, use text message method
      sendResult = await smsFreshService.sendTextMessage(
        messageData.contactPhone,
        messageData.content
      )
    }
    
    // Update message data with send result
    messageData.status = sendResult.success ? 'SENT' : 'FAILED'
    messageData.smsFreshId = sendResult.messageId
    
    if (!sendResult.success) {
      messageData.failureReason = sendResult.error
    }
    
    const processingTime = Date.now() - startTime
    
    if (sendResult.success) {
      Logger.success(DataSource.API, 'send_message', `Message sent successfully to ${messageData.contactPhone} in ${processingTime}ms`)
    } else {
      Logger.error(DataSource.API, 'send_message', `Message failed for ${messageData.contactPhone}`, sendResult.error)
    }
    
    return NextResponse.json({
      success: sendResult.success,
      message: messageData,
      sendResult: {
        messageId: sendResult.messageId,
        status: sendResult.status,
        processingTime,
      },
      message: sendResult.success 
        ? `Message sent successfully via WhatsApp`
        : `Failed to send message: ${sendResult.error}`,
    })
    
  } catch (error) {
    const processingTime = Date.now() - startTime
    
    Logger.error(DataSource.API, 'send_message', 'Message send error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTime,
    })
    
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
}