import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { createSMSFreshService, SMSFreshWebhookPayload } from '@/lib/smsFreshService';
import { logger } from '@/lib/logger';
import LeadCreationService from '@/lib/leadCreationService';
import { auditLogger, AuditEventType } from '@/lib/security/auditLogger';
import crypto from 'crypto';

const prisma = new PrismaClient();

// Rate limiting for webhook processing
const webhookRateLimit = new Map<string, { count: number; resetTime: number }>();
const WEBHOOK_RATE_LIMIT = 100; // Max 100 webhooks per minute per IP
const WEBHOOK_RATE_WINDOW = 60 * 1000; // 1 minute

/**
 * Enhanced SMSFresh Webhook Handler with security and rate limiting
 * Requirements: 8.2, 8.4 - Create robust webhook handler for SMSFresh callbacks with security
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const clientIP = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
  
  try {
    // Rate limiting check
    if (!checkRateLimit(clientIP)) {
      await auditLogger.logEvent(
        AuditEventType.WEBHOOK_RECEIVED,
        'SMSFresh webhook rate limit exceeded',
        { ip: clientIP, timestamp: new Date().toISOString() }
      );
      
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    // Get request body and headers
    const body = await request.text();
    const signature = request.headers.get('x-smsfresh-signature') || '';
    const timestamp = request.headers.get('x-smsfresh-timestamp') || '';
    const webhookSecret = process.env.SMSFRESH_WEBHOOK_SECRET || '';

    // Enhanced signature validation
    if (!webhookSecret) {
      logger.error('SMSFresh webhook secret not configured');
      return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
    }

    // Validate timestamp to prevent replay attacks (within 5 minutes)
    if (timestamp) {
      const webhookTime = parseInt(timestamp) * 1000; // Convert to milliseconds
      const currentTime = Date.now();
      const timeDiff = Math.abs(currentTime - webhookTime);
      
      if (timeDiff > 5 * 60 * 1000) { // 5 minutes
        await auditLogger.logEvent(
          AuditEventType.WEBHOOK_RECEIVED,
          'SMSFresh webhook timestamp too old',
          { 
            ip: clientIP, 
            timestamp: new Date(webhookTime).toISOString(),
            timeDiff: timeDiff / 1000 
          }
        );
        
        return NextResponse.json({ error: 'Request timestamp too old' }, { status: 401 });
      }
    }

    // Validate webhook signature
    const isValidSignature = validateEnhancedWebhookSignature(body, signature, timestamp, webhookSecret);
    
    if (!isValidSignature) {
      await auditLogger.logEvent(
        AuditEventType.WEBHOOK_RECEIVED,
        'SMSFresh webhook invalid signature',
        { 
          ip: clientIP, 
          signature: signature.substring(0, 10) + '...', // Log partial signature for debugging
          bodyLength: body.length 
        }
      );
      
      logger.warn('Invalid SMSFresh webhook signature', { 
        ip: clientIP, 
        signature: signature.substring(0, 10) + '...',
        bodyLength: body.length 
      });
      
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Parse and validate payload
    let payload: SMSFreshWebhookPayload;
    try {
      payload = JSON.parse(body);
      validateWebhookPayload(payload);
    } catch (parseError) {
      await auditLogger.logEvent(
        AuditEventType.WEBHOOK_RECEIVED,
        'SMSFresh webhook invalid payload',
        { 
          ip: clientIP, 
          error: parseError instanceof Error ? parseError.message : 'Unknown parse error',
          bodyPreview: body.substring(0, 200) 
        }
      );
      
      return NextResponse.json({ error: 'Invalid payload format' }, { status: 400 });
    }
    
    // Log successful webhook receipt
    await auditLogger.logEvent(
      AuditEventType.WEBHOOK_RECEIVED,
      'SMSFresh webhook received successfully',
      { 
        ip: clientIP, 
        messageId: payload.messageId,
        phone: payload.phone,
        status: payload.status,
        type: payload.type 
      }
    );
    
    logger.info('SMSFresh webhook received', { 
      ...payload, 
      ip: clientIP,
      processingTime: Date.now() - startTime 
    });

    // Process the webhook payload
    const processingResult = await processWebhookPayload(payload, clientIP);

    // Log processing completion
    await auditLogger.logEvent(
      AuditEventType.WEBHOOK_RECEIVED,
      'SMSFresh webhook processed successfully',
      { 
        messageId: payload.messageId,
        processingTime: Date.now() - startTime,
        result: processingResult 
      }
    );

    return NextResponse.json({ 
      success: true, 
      message: 'Webhook processed successfully',
      processingTime: Date.now() - startTime 
    });
    
  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    await auditLogger.logEvent(
      AuditEventType.WEBHOOK_RECEIVED,
      'SMSFresh webhook processing failed',
      { 
        ip: clientIP, 
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime 
      }
    );
    
    logger.error('SMSFresh webhook processing failed', { 
      error, 
      ip: clientIP, 
      processingTime 
    });
    
    return NextResponse.json(
      { 
        error: 'Webhook processing failed',
        processingTime 
      },
      { status: 500 }
    );
  }
}

/**
 * Enhanced webhook signature validation with timestamp
 */
function validateEnhancedWebhookSignature(
  payload: string, 
  signature: string, 
  timestamp: string, 
  secret: string
): boolean {
  try {
    // Create signature string with timestamp for enhanced security
    const signaturePayload = timestamp ? `${timestamp}.${payload}` : payload;
    
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(signaturePayload)
      .digest('hex');
    
    // Support both formats: with and without 'sha256=' prefix
    const receivedSignature = signature.startsWith('sha256=') 
      ? signature.substring(7) 
      : signature;
    
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(receivedSignature, 'hex')
    );
  } catch (error) {
    logger.error('Failed to validate webhook signature', error);
    return false;
  }
}

/**
 * Validate webhook payload structure
 */
function validateWebhookPayload(payload: any): void {
  const requiredFields = ['messageId', 'phone', 'status', 'timestamp', 'type'];
  const validStatuses = ['delivered', 'read', 'failed', 'replied', 'sent'];
  const validTypes = ['SMS', 'WHATSAPP'];

  for (const field of requiredFields) {
    if (!payload[field]) {
      throw new Error(`Missing required field: ${field}`);
    }
  }

  if (!validStatuses.includes(payload.status)) {
    throw new Error(`Invalid status: ${payload.status}`);
  }

  if (!validTypes.includes(payload.type)) {
    throw new Error(`Invalid type: ${payload.type}`);
  }

  // Validate phone number format
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  if (!phoneRegex.test(payload.phone.replace(/\D/g, ''))) {
    throw new Error(`Invalid phone number format: ${payload.phone}`);
  }

  // Validate timestamp
  const timestamp = new Date(payload.timestamp);
  if (isNaN(timestamp.getTime())) {
    throw new Error(`Invalid timestamp format: ${payload.timestamp}`);
  }
}

/**
 * Rate limiting check for webhook requests
 */
function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const windowStart = now - WEBHOOK_RATE_WINDOW;
  
  // Clean up old entries
  for (const [key, value] of webhookRateLimit.entries()) {
    if (value.resetTime < windowStart) {
      webhookRateLimit.delete(key);
    }
  }
  
  const current = webhookRateLimit.get(ip);
  
  if (!current) {
    webhookRateLimit.set(ip, { count: 1, resetTime: now });
    return true;
  }
  
  if (current.resetTime < windowStart) {
    webhookRateLimit.set(ip, { count: 1, resetTime: now });
    return true;
  }
  
  if (current.count >= WEBHOOK_RATE_LIMIT) {
    return false;
  }
  
  current.count++;
  return true;
}

/**
 * Enhanced webhook payload processing with better error handling and tracking
 */
async function processWebhookPayload(payload: SMSFreshWebhookPayload, clientIP?: string) {
  const { messageId, phone, status, content, timestamp, type } = payload;
  const processingStartTime = Date.now();

  try {
    // Normalize phone number for database lookup
    const normalizedPhone = phone.replace(/\D/g, '').slice(-10);
    
    // Find the message in our database using SMSFresh message ID
    const message = await prisma.message.findFirst({
      where: { smsFreshId: messageId },
      include: {
        contact: true,
        campaign: true,
        sentBy: true,
      },
    });

    let processingResult = {
      messageFound: !!message,
      statusUpdated: false,
      campaignStatsUpdated: false,
      incomingMessageProcessed: false,
      replyProcessed: false,
      leadCreated: false,
    };

    if (!message) {
      // This might be an incoming message from a customer or a message not in our system
      if (status === 'replied' && content) {
        processingResult.incomingMessageProcessed = await handleIncomingMessage(
          phone, content, type, timestamp, clientIP
        );
      } else if (status === 'delivered' || status === 'read' || status === 'failed') {
        // Log delivery status for messages not in our system (might be sent from other sources)
        logger.info('Delivery status received for external message', { 
          messageId, 
          phone: normalizedPhone, 
          status, 
          type 
        });
        
        await auditLogger.logEvent(
          AuditEventType.WEBHOOK_RECEIVED,
          'External message status update',
          { messageId, phone: normalizedPhone, status, type }
        );
      } else {
        logger.warn('Message not found for SMSFresh ID', { 
          messageId, 
          phone: normalizedPhone, 
          status, 
          type 
        });
      }
      
      return processingResult;
    }

    // Update message status based on webhook
    processingResult.statusUpdated = await updateMessageStatus(message.id, status, timestamp);

    // Update campaign statistics if this message is part of a campaign
    if (message.campaignId) {
      processingResult.campaignStatsUpdated = await updateCampaignStats(message.campaignId, status);
    }

    // Handle customer replies
    if (status === 'replied' && content) {
      processingResult.replyProcessed = await handleCustomerReply(message, content, timestamp);
    }

    // Create real-time notification for status updates
    await createStatusUpdateNotification(message, status, timestamp);

    const processingTime = Date.now() - processingStartTime;
    
    logger.info('Webhook payload processed successfully', {
      messageId: message.id,
      smsFreshId: messageId,
      status,
      phone: normalizedPhone,
      processingTime,
      result: processingResult,
    });

    return processingResult;
    
  } catch (error) {
    const processingTime = Date.now() - processingStartTime;
    
    logger.error('Failed to process webhook payload', { 
      payload: { ...payload, phone: phone.replace(/\d/g, '*') }, // Mask phone for privacy
      processingTime,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    // Create error notification for monitoring
    await createErrorNotification(payload, error, clientIP);
    
    throw error;
  }
}

/**
 * Enhanced message status update with validation and error handling
 */
async function updateMessageStatus(messageId: string, status: string, timestamp: string): Promise<boolean> {
  try {
    const updateData: any = { 
      status: status.toUpperCase(),
      updatedAt: new Date()
    };

    // Set appropriate timestamp based on status
    const statusTimestamp = new Date(timestamp);
    
    switch (status) {
      case 'sent':
        // Don't update if already delivered/read
        const currentMessage = await prisma.message.findUnique({
          where: { id: messageId },
          select: { status: true, deliveredAt: true, readAt: true }
        });
        
        if (currentMessage && ['DELIVERED', 'READ'].includes(currentMessage.status)) {
          return false; // Don't downgrade status
        }
        break;
        
      case 'delivered':
        updateData.deliveredAt = statusTimestamp;
        break;
        
      case 'read':
        updateData.readAt = statusTimestamp;
        // If not already delivered, set delivered time as well
        const msgForRead = await prisma.message.findUnique({
          where: { id: messageId },
          select: { deliveredAt: true }
        });
        if (msgForRead && !msgForRead.deliveredAt) {
          updateData.deliveredAt = statusTimestamp;
        }
        break;
        
      case 'replied':
        updateData.repliedAt = statusTimestamp;
        break;
        
      case 'failed':
        updateData.failedAt = statusTimestamp;
        // Increment retry count if this is a retry failure
        const failedMsg = await prisma.message.findUnique({
          where: { id: messageId },
          select: { retryCount: true }
        });
        if (failedMsg) {
          updateData.retryCount = (failedMsg.retryCount || 0) + 1;
        }
        break;
    }

    await prisma.message.update({
      where: { id: messageId },
      data: updateData,
    });

    logger.debug('Message status updated', { 
      messageId, 
      status: status.toUpperCase(), 
      timestamp: statusTimestamp.toISOString() 
    });
    
    return true;
    
  } catch (error) {
    logger.error('Failed to update message status', { 
      messageId, 
      status, 
      timestamp, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    return false;
  }
}

/**
 * Enhanced campaign statistics update with atomic operations
 */
async function updateCampaignStats(campaignId: string, status: string): Promise<boolean> {
  try {
    const updateData: any = { updatedAt: new Date() };

    // Use atomic increment operations to prevent race conditions
    switch (status) {
      case 'sent':
        updateData.totalSent = { increment: 1 };
        break;
      case 'delivered':
        updateData.totalDelivered = { increment: 1 };
        break;
      case 'read':
        updateData.totalRead = { increment: 1 };
        break;
      case 'replied':
        updateData.totalReplies = { increment: 1 };
        break;
      case 'failed':
        updateData.totalFailed = { increment: 1 };
        break;
    }

    if (Object.keys(updateData).length > 1) { // More than just updatedAt
      await prisma.campaign.update({
        where: { id: campaignId },
        data: updateData,
      });

      // Calculate and update rates
      await updateCampaignRates(campaignId);
      
      logger.debug('Campaign statistics updated', { 
        campaignId, 
        status, 
        updateData 
      });
      
      return true;
    }
    
    return false;
    
  } catch (error) {
    logger.error('Failed to update campaign statistics', { 
      campaignId, 
      status, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    return false;
  }
}

/**
 * Update campaign delivery and response rates
 */
async function updateCampaignRates(campaignId: string): Promise<void> {
  try {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: {
        totalSent: true,
        totalDelivered: true,
        totalRead: true,
        totalReplies: true,
        totalFailed: true,
      }
    });

    if (!campaign || campaign.totalSent === 0) return;

    const deliveryRate = (campaign.totalDelivered / campaign.totalSent) * 100;
    const readRate = (campaign.totalRead / campaign.totalSent) * 100;
    const responseRate = (campaign.totalReplies / campaign.totalSent) * 100;
    const failureRate = (campaign.totalFailed / campaign.totalSent) * 100;

    await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        deliveryRate: Math.round(deliveryRate * 100) / 100, // Round to 2 decimal places
        readRate: Math.round(readRate * 100) / 100,
        responseRate: Math.round(responseRate * 100) / 100,
        failureRate: Math.round(failureRate * 100) / 100,
      }
    });

  } catch (error) {
    logger.error('Failed to update campaign rates', { 
      campaignId, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}

/**
 * Create real-time notification for message status updates
 */
async function createStatusUpdateNotification(message: any, status: string, timestamp: string): Promise<void> {
  try {
    // Create notification for the message sender (if it's an outbound message)
    if (message.direction === 'OUTBOUND' && message.sentById) {
      await prisma.activity.create({
        data: {
          type: 'MESSAGE_STATUS',
          title: `Message ${status}`,
          description: `Your message to ${message.contact?.name || message.contact?.phone} was ${status}`,
          userId: message.sentById,
          leadId: message.leadId,
          metadata: {
            messageId: message.id,
            status,
            timestamp,
            contactPhone: message.contact?.phone,
          }
        },
      });
    }

    // Create system notification for monitoring
    await prisma.activity.create({
      data: {
        type: 'SYSTEM',
        title: 'Message Status Update',
        description: `Message ${message.id} status updated to ${status}`,
        userId: 'system',
        metadata: {
          messageId: message.id,
          smsFreshId: message.smsFreshId,
          status,
          timestamp,
          type: message.type,
        }
      },
    });

  } catch (error) {
    logger.error('Failed to create status update notification', { 
      messageId: message.id, 
      status, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}

/**
 * Create error notification for webhook processing failures
 */
async function createErrorNotification(payload: any, error: any, clientIP?: string): Promise<void> {
  try {
    await prisma.activity.create({
      data: {
        type: 'SYSTEM_ERROR',
        title: 'Webhook Processing Error',
        description: `Failed to process SMSFresh webhook: ${error instanceof Error ? error.message : 'Unknown error'}`,
        userId: 'system',
        metadata: {
          webhookPayload: payload,
          error: error instanceof Error ? error.message : 'Unknown error',
          clientIP,
          timestamp: new Date().toISOString(),
        }
      },
    });
  } catch (notificationError) {
    logger.error('Failed to create error notification', notificationError);
  }
}

/**
 * Enhanced incoming message handler with better error handling and tracking
 */
async function handleIncomingMessage(
  phone: string,
  content: string,
  type: string,
  timestamp: string,
  clientIP?: string
): Promise<boolean> {
  try {
    const normalizedPhone = phone.replace(/\D/g, '').slice(-10);
    
    // Find or create contact with enhanced data
    let contact = await prisma.contact.findUnique({
      where: { phone: normalizedPhone },
      include: {
        leads: {
          where: { status: { notIn: ['CLOSED_WON', 'CLOSED_LOST'] } },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    if (!contact) {
      contact = await prisma.contact.create({
        data: {
          phone: normalizedPhone,
          name: `Contact ${normalizedPhone}`,
          isActive: true,
          source: 'WHATSAPP_INCOMING',
          lastContactAt: new Date(timestamp),
        },
        include: {
          leads: true
        }
      });
      
      logger.info('New contact created from incoming message', {
        contactId: contact.id,
        phone: normalizedPhone,
        source: clientIP
      });
    } else {
      // Update last contact time
      await prisma.contact.update({
        where: { id: contact.id },
        data: { lastContactAt: new Date(timestamp) }
      });
    }

    // Create incoming message record with enhanced metadata
    const message = await prisma.message.create({
      data: {
        type: type.toUpperCase() as 'SMS' | 'WHATSAPP',
        direction: 'INBOUND',
        content,
        status: 'RECEIVED',
        contactId: contact.id,
        createdAt: new Date(timestamp),
        metadata: {
          webhookSource: 'smsfresh',
          clientIP,
          processedAt: new Date().toISOString(),
        }
      },
    });

    // Check if this is a potential lead and create lead record
    const leadResult = await checkAndCreateLead(contact, content);

    // Route message to appropriate handlers based on user roles
    await routeMessageToHandlers(message, contact);

    // Update contact statistics
    await updateContactStatistics(contact.id, 'incoming_message');

    logger.info('Incoming message processed successfully', {
      messageId: message.id,
      contactId: contact.id,
      phone: normalizedPhone,
      leadCreated: leadResult.success,
      contentLength: content.length,
    });
    
    return true;
    
  } catch (error) {
    logger.error('Failed to handle incoming message', { 
      phone: phone.replace(/\d/g, '*'), // Mask phone for privacy
      contentLength: content.length,
      type,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    // Create error activity for tracking
    await prisma.activity.create({
      data: {
        type: 'SYSTEM_ERROR',
        title: 'Incoming Message Processing Failed',
        description: `Failed to process incoming message from ${phone.replace(/\d/g, '*')}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        userId: 'system',
        metadata: {
          phone: phone.replace(/\d/g, '*'),
          type,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp,
        }
      },
    }).catch(() => {}); // Ignore if this fails too
    
    return false;
  }
}

/**
 * Update contact statistics for analytics
 */
async function updateContactStatistics(contactId: string, eventType: string): Promise<void> {
  try {
    const updateData: any = { updatedAt: new Date() };
    
    switch (eventType) {
      case 'incoming_message':
        updateData.totalIncomingMessages = { increment: 1 };
        updateData.lastMessageAt = new Date();
        break;
      case 'outgoing_message':
        updateData.totalOutgoingMessages = { increment: 1 };
        break;
      case 'campaign_message':
        updateData.totalCampaignMessages = { increment: 1 };
        break;
    }

    await prisma.contact.update({
      where: { id: contactId },
      data: updateData,
    });

  } catch (error) {
    logger.error('Failed to update contact statistics', { 
      contactId, 
      eventType, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}

/**
 * Enhanced customer reply handler with better tracking and analysis
 */
async function handleCustomerReply(
  originalMessage: any,
  replyContent: string,
  timestamp: string
): Promise<boolean> {
  try {
    // Create reply message record with enhanced metadata
    const replyMessage = await prisma.message.create({
      data: {
        type: originalMessage.type,
        direction: 'INBOUND',
        content: replyContent,
        status: 'RECEIVED',
        contactId: originalMessage.contactId,
        campaignId: originalMessage.campaignId,
        parentMessageId: originalMessage.id, // Link to original message
        createdAt: new Date(timestamp),
        metadata: {
          isReply: true,
          originalMessageId: originalMessage.id,
          replyToType: originalMessage.direction,
          responseTime: new Date(timestamp).getTime() - new Date(originalMessage.createdAt).getTime(),
        }
      },
    });

    // Analyze reply sentiment and intent
    const replyAnalysis = analyzeReplyContent(replyContent);

    // Check if this reply indicates interest and create/update lead
    const leadResult = await checkAndCreateLead(originalMessage.contact, replyContent);

    // Update original message with reply information
    await prisma.message.update({
      where: { id: originalMessage.id },
      data: {
        repliedAt: new Date(timestamp),
        replyCount: { increment: 1 },
        metadata: {
          ...originalMessage.metadata,
          hasReply: true,
          replyAnalysis,
        }
      }
    });

    // Route reply to appropriate handlers with priority
    await routeMessageToHandlers(replyMessage, originalMessage.contact, 'high');

    // Update contact engagement score
    await updateContactEngagement(originalMessage.contactId, replyAnalysis);

    // Update campaign reply statistics if applicable
    if (originalMessage.campaignId) {
      await updateCampaignReplyStats(originalMessage.campaignId, replyAnalysis);
    }

    logger.info('Customer reply processed successfully', {
      originalMessageId: originalMessage.id,
      replyMessageId: replyMessage.id,
      contactId: originalMessage.contactId,
      campaignId: originalMessage.campaignId,
      sentiment: replyAnalysis.sentiment,
      intent: replyAnalysis.intent,
      leadCreated: leadResult.success,
    });
    
    return true;
    
  } catch (error) {
    logger.error('Failed to handle customer reply', { 
      originalMessageId: originalMessage.id,
      contactId: originalMessage.contactId,
      replyLength: replyContent.length,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    return false;
  }
}
}

/**
 * Check message content for lead indicators and create lead if appropriate
 * Uses the enhanced LeadCreationService for better accuracy
 */
async function checkAndCreateLead(contact: any, messageContent: string) {
  try {
    // Use the enhanced lead creation service
    const result = await LeadCreationService.createLeadFromMessage(
      `webhook-${Date.now()}`, // Generate a temporary message ID
      contact.id,
      messageContent,
      contact.phone,
      contact.name,
      contact.email
    );

    if (result.success) {
      logger.info('Lead created/updated from webhook message', {
        contactId: contact.id,
        phone: contact.phone,
        leadId: result.leadId,
        confidence: result.confidence,
        detectedKeywords: result.detectedKeywords,
        extractedInfo: result.extractedInfo
      });
    } else {
      logger.debug('No lead created from webhook message', {
        contactId: contact.id,
        phone: contact.phone,
        reason: result.reason,
        confidence: result.confidence
      });
    }

    return result;
  } catch (error) {
    logger.error('Error in enhanced lead creation from webhook', {
      contactId: contact.id,
      phone: contact.phone,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    // Fallback to basic lead creation if enhanced service fails
    return await basicLeadCreation(contact, messageContent);
  }
}

/**
 * Fallback basic lead creation for when enhanced service fails
 */
async function basicLeadCreation(contact: any, messageContent: string) {
  const loanKeywords = [
    'loan', 'credit', 'finance', 'money', 'borrow', 'interest',
    'personal loan', 'business loan', 'home loan', 'car loan',
    'apply', 'eligible', 'amount', 'rate', 'emi'
  ];

  const interestKeywords = [
    'yes', 'interested', 'tell me more', 'details', 'apply',
    'how much', 'what rate', 'eligibility', 'documents'
  ];

  const content = messageContent.toLowerCase();
  const hasLoanKeyword = loanKeywords.some(keyword => content.includes(keyword));
  const hasInterestKeyword = interestKeywords.some(keyword => content.includes(keyword));

  if (hasLoanKeyword || hasInterestKeyword) {
    // Check if lead already exists for this contact
    const existingLead = await prisma.lead.findFirst({
      where: { phone: contact.phone },
    });

    if (!existingLead) {
      // Determine loan type from message content
      let loanType = 'PERSONAL'; // default
      if (content.includes('business')) loanType = 'BUSINESS';
      else if (content.includes('home') || content.includes('house')) loanType = 'HOME';
      else if (content.includes('car') || content.includes('vehicle')) loanType = 'VEHICLE';
      else if (content.includes('education') || content.includes('study')) loanType = 'EDUCATION';

      // Create new lead
      const lead = await prisma.lead.create({
        data: {
          name: contact.name || `Lead ${contact.phone}`,
          phone: contact.phone,
          email: contact.email,
          loanType,
          loanAmount: 0, // Will be updated when customer provides amount
          status: hasInterestKeyword ? 'INTERESTED' : 'NEW',
          priority: hasInterestKeyword ? 'HIGH' : 'MEDIUM',
          source: 'WHATSAPP_MESSAGE',
          contactId: contact.id,
          notes: `Auto-created from message: "${messageContent}"`,
        },
      });

      logger.info('Basic lead created from message', {
        contactId: contact.id,
        phone: contact.phone,
        loanType,
        leadId: lead.id
      });

      return {
        success: true,
        leadId: lead.id,
        lead,
        confidence: hasInterestKeyword ? 70 : 50,
        detectedKeywords: [],
        extractedInfo: { loanType }
      };
    }
  }

  return {
    success: false,
    reason: 'No loan keywords detected',
    confidence: 0,
    detectedKeywords: [],
    extractedInfo: {}
  };
}

/**
 * Analyze reply content for sentiment and intent
 */
function analyzeReplyContent(content: string): { sentiment: string; intent: string; keywords: string[] } {
  const lowerContent = content.toLowerCase();
  
  // Positive sentiment indicators
  const positiveKeywords = ['yes', 'interested', 'sure', 'okay', 'good', 'great', 'thanks', 'please', 'want', 'need'];
  const negativeKeywords = ['no', 'not interested', 'stop', 'remove', 'unsubscribe', 'don\'t', 'never'];
  const neutralKeywords = ['maybe', 'later', 'think', 'consider', 'info', 'details'];
  
  // Intent indicators
  const inquiryKeywords = ['how', 'what', 'when', 'where', 'why', 'tell me', 'explain', 'details'];
  const applicationKeywords = ['apply', 'application', 'form', 'documents', 'process', 'start'];
  const rejectionKeywords = ['no thanks', 'not now', 'busy', 'call later'];
  
  let sentiment = 'neutral';
  let intent = 'unknown';
  const foundKeywords: string[] = [];
  
  // Determine sentiment
  const positiveCount = positiveKeywords.filter(keyword => {
    if (lowerContent.includes(keyword)) {
      foundKeywords.push(keyword);
      return true;
    }
    return false;
  }).length;
  
  const negativeCount = negativeKeywords.filter(keyword => {
    if (lowerContent.includes(keyword)) {
      foundKeywords.push(keyword);
      return true;
    }
    return false;
  }).length;
  
  if (positiveCount > negativeCount) {
    sentiment = 'positive';
  } else if (negativeCount > positiveCount) {
    sentiment = 'negative';
  }
  
  // Determine intent
  if (inquiryKeywords.some(keyword => lowerContent.includes(keyword))) {
    intent = 'inquiry';
  } else if (applicationKeywords.some(keyword => lowerContent.includes(keyword))) {
    intent = 'application';
  } else if (rejectionKeywords.some(keyword => lowerContent.includes(keyword))) {
    intent = 'rejection';
  } else if (sentiment === 'positive') {
    intent = 'interest';
  } else if (sentiment === 'negative') {
    intent = 'rejection';
  }
  
  return { sentiment, intent, keywords: foundKeywords };
}

/**
 * Update contact engagement score based on interactions
 */
async function updateContactEngagement(contactId: string, replyAnalysis: any): Promise<void> {
  try {
    let engagementDelta = 0;
    
    switch (replyAnalysis.sentiment) {
      case 'positive':
        engagementDelta = 10;
        break;
      case 'negative':
        engagementDelta = -5;
        break;
      case 'neutral':
        engagementDelta = 2;
        break;
    }
    
    switch (replyAnalysis.intent) {
      case 'inquiry':
        engagementDelta += 15;
        break;
      case 'application':
        engagementDelta += 25;
        break;
      case 'interest':
        engagementDelta += 10;
        break;
      case 'rejection':
        engagementDelta -= 10;
        break;
    }
    
    await prisma.contact.update({
      where: { id: contactId },
      data: {
        engagementScore: { increment: engagementDelta },
        lastEngagementAt: new Date(),
      }
    });
    
  } catch (error) {
    logger.error('Failed to update contact engagement', { 
      contactId, 
      replyAnalysis, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}

/**
 * Update campaign reply statistics with analysis
 */
async function updateCampaignReplyStats(campaignId: string, replyAnalysis: any): Promise<void> {
  try {
    const updateData: any = {};
    
    switch (replyAnalysis.sentiment) {
      case 'positive':
        updateData.positiveReplies = { increment: 1 };
        break;
      case 'negative':
        updateData.negativeReplies = { increment: 1 };
        break;
      case 'neutral':
        updateData.neutralReplies = { increment: 1 };
        break;
    }
    
    switch (replyAnalysis.intent) {
      case 'inquiry':
        updateData.inquiryReplies = { increment: 1 };
        break;
      case 'application':
        updateData.applicationReplies = { increment: 1 };
        break;
      case 'interest':
        updateData.interestReplies = { increment: 1 };
        break;
      case 'rejection':
        updateData.rejectionReplies = { increment: 1 };
        break;
    }
    
    if (Object.keys(updateData).length > 0) {
      await prisma.campaign.update({
        where: { id: campaignId },
        data: updateData,
      });
    }
    
  } catch (error) {
    logger.error('Failed to update campaign reply stats', { 
      campaignId, 
      replyAnalysis, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}

/**
 * Enhanced message routing with priority support
 * Requirements: 8.2, 8.4 - Implement message routing to appropriate handlers based on user roles
 */
async function routeMessageToHandlers(message: any, contact: any, priority: 'low' | 'normal' | 'high' | 'urgent' = 'normal') {
  try {
    // Get all active users who should receive message notifications
    const users = await prisma.user.findMany({
      where: { isActive: true },
      orderBy: { lastLogin: 'desc' }, // Prioritize recently active users
    });

    const routedUsers: string[] = [];
    const routingDecisions: any[] = [];

    // Find associated lead for better context
    const lead = await prisma.lead.findFirst({
      where: { phone: contact.phone },
      include: {
        assignedTo: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Enhanced routing logic
    for (const user of users) {
      let shouldReceiveMessage = false;
      let routingReason = '';
      let priority = 'normal';
      let activityTitle = '';
      let activityDescription = '';

      if (user.role === 'ADMIN') {
        // Admin users get all messages
        shouldReceiveMessage = true;
        routingReason = 'admin_access';
        priority = 'normal';
        activityTitle = `New ${message.direction.toLowerCase()} message from ${contact.name || contact.phone}`;
        activityDescription = `${message.type} message: ${message.content.substring(0, 200)}`;
      } else if (user.role === 'EMPLOYEE') {
        // Enhanced employee routing logic
        const isAssigned = await isMessageAssignedToUser(message, user.id);
        const isHighPriorityUnassigned = await isHighPriorityUnassignedMessage(message);
        const isAvailableForAssignment = await isEmployeeAvailableForAssignment(user.id);
        
        if (isAssigned) {
          shouldReceiveMessage = true;
          routingReason = 'assigned_lead';
          priority = 'high';
          activityTitle = `Message from assigned lead: ${contact.name || contact.phone}`;
          activityDescription = `Assigned lead replied: ${message.content.substring(0, 200)}`;
        } else if (isHighPriorityUnassigned && isAvailableForAssignment) {
          shouldReceiveMessage = true;
          routingReason = 'high_priority_unassigned';
          priority = 'urgent';
          activityTitle = `High priority message from ${contact.name || contact.phone}`;
          activityDescription = `Unassigned high priority message: ${message.content.substring(0, 200)}`;
        }
      }

      if (shouldReceiveMessage) {
        await prisma.activity.create({
          data: {
            type: message.type,
            title: activityTitle,
            description: activityDescription,
            userId: user.id,
            leadId: lead?.id,
          },
        });

        routedUsers.push(user.id);
        routingDecisions.push({
          userId: user.id,
          userName: user.name,
          reason: routingReason,
          priority,
        });

        // Enhanced auto-assignment logic
        if (user.role === 'EMPLOYEE' && lead && !lead.assignedToId && routingReason === 'high_priority_unassigned') {
          await prisma.lead.update({
            where: { id: lead.id },
            data: { 
              assignedToId: user.id,
              status: 'CONTACTED',
              updatedAt: new Date(),
            },
          });

          // Create assignment activity
          await prisma.activity.create({
            data: {
              type: 'SYSTEM',
              title: 'Lead Auto-Assigned',
              description: `Lead ${lead.name} auto-assigned to ${user.name} due to incoming message`,
              userId: user.id,
              leadId: lead.id,
            },
          });

          logger.info('Lead auto-assigned to employee', {
            leadId: lead.id,
            employeeId: user.id,
            phone: contact.phone,
            reason: 'incoming_message_routing',
          });
        }
      }
    }

    // Create notification records for real-time updates
    await createMessageNotifications(message, contact, routedUsers);

    // Log detailed routing information
    await prisma.activity.create({
      data: {
        type: 'SYSTEM',
        title: 'Message Routing Completed',
        description: `Message routed to ${routedUsers.length} users. Decisions: ${JSON.stringify(routingDecisions)}`,
        userId: routedUsers[0] || 'system',
        leadId: lead?.id,
      },
    });

    logger.info('Message routed to handlers', {
      messageId: message.id,
      contactId: contact.id,
      leadId: lead?.id,
      routedToUsers: routedUsers.length,
      userIds: routedUsers,
      routingDecisions,
    });
  } catch (error) {
    logger.error('Failed to route message to handlers', { message, contact, error });
    
    // Create error activity for debugging
    await prisma.activity.create({
      data: {
        type: 'SYSTEM',
        title: 'Message Routing Failed',
        description: `Failed to route message ${message.id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        userId: 'system',
      },
    }).catch(() => {}); // Ignore if this fails too
    
    throw error;
  }
}

/**
 * Check if a message should be assigned to a specific user
 */
async function isMessageAssignedToUser(message: any, userId: string): Promise<boolean> {
  // Check if there's a lead assigned to this user for this contact
  const assignedLead = await prisma.lead.findFirst({
    where: {
      phone: message.contact?.phone,
      assignedToId: userId,
    },
  });

  return !!assignedLead;
}

/**
 * Check if this is a high priority unassigned message that should be routed to available employees
 */
async function isHighPriorityUnassignedMessage(message: any): Promise<boolean> {
  // Check if there's an unassigned lead for this contact
  const unassignedLead = await prisma.lead.findFirst({
    where: {
      phone: message.contact?.phone,
      assignedToId: null,
      priority: { in: ['HIGH', 'URGENT'] },
    },
  });

  if (unassignedLead) return true;

  // Check if message content indicates urgency or high interest
  const urgentKeywords = [
    'urgent', 'asap', 'immediately', 'emergency', 'today',
    'interested', 'apply now', 'need loan', 'ready to apply'
  ];

  const content = message.content.toLowerCase();
  return urgentKeywords.some(keyword => content.includes(keyword));
}

/**
 * Check if employee is available for new lead assignments
 */
async function isEmployeeAvailableForAssignment(userId: string): Promise<boolean> {
  try {
    // Count current assigned leads for this employee
    const assignedLeadsCount = await prisma.lead.count({
      where: {
        assignedToId: userId,
        status: { notIn: ['CLOSED_WON', 'CLOSED_LOST'] }, // Only count active leads
      },
    });

    // Default workload limit (this could be configurable per employee)
    const maxWorkload = 10;
    
    // Check if employee is under their workload limit
    const isUnderLimit = assignedLeadsCount < maxWorkload;

    // Check if employee has been active recently (within last 24 hours)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { lastLogin: true, isActive: true },
    });

    const isRecentlyActive = user?.lastLogin && 
      (new Date().getTime() - new Date(user.lastLogin).getTime()) < 24 * 60 * 60 * 1000;

    return user?.isActive && isUnderLimit && (isRecentlyActive || true); // Allow assignment even if not recently active
  } catch (error) {
    logger.error('Failed to check employee availability', { userId, error });
    return false; // Default to not available if check fails
  }
}

/**
 * Create notification records for real-time message updates
 */
async function createMessageNotifications(message: any, contact: any, userIds: string[]) {
  try {
    // Create activity notifications for each user
    const notificationPromises = userIds.map(userId => 
      prisma.activity.create({
        data: {
          type: 'NOTIFICATION',
          title: 'New Message Alert',
          description: `You have a new message from ${contact.name || contact.phone}`,
          userId,
          leadId: message.leadId, // Include lead ID if available
        },
      })
    );

    await Promise.all(notificationPromises);

    // Create a system-wide message notification record for tracking
    await prisma.activity.create({
      data: {
        type: 'SYSTEM',
        title: 'Message Routing Completed',
        description: `Message ${message.id} routed to ${userIds.length} users`,
        userId: userIds[0] || 'system', // Use first user or system
      },
    });

    logger.info('Message notifications created', {
      messageId: message.id,
      notificationCount: userIds.length,
      routedUsers: userIds,
    });
  } catch (error) {
    logger.error('Failed to create message notifications', error);
    // Don't throw error as this is not critical for message processing
  }
}

// Handle GET requests (for webhook verification if needed)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const challenge = searchParams.get('challenge');
  
  if (challenge) {
    // Return challenge for webhook verification
    return NextResponse.json({ challenge });
  }
  
  return NextResponse.json({ message: 'SMSFresh webhook endpoint' });
}