import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { createSMSFreshService, SMSFreshWebhookPayload } from '@/lib/smsFreshService';
import { logger } from '@/lib/logger';

const prisma = new PrismaClient();

/**
 * SMSFresh Webhook Handler
 * Requirements: 4.5 - Create webhook endpoint for receiving SMSFresh callbacks
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-smsfresh-signature') || '';
    const webhookSecret = process.env.SMSFRESH_WEBHOOK_SECRET || '';

    // Validate webhook signature for security
    if (webhookSecret) {
      const smsFreshService = createSMSFreshService();
      const isValid = smsFreshService.validateWebhookSignature(body, signature, webhookSecret);
      
      if (!isValid) {
        logger.warn('Invalid SMSFresh webhook signature', { signature });
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    const payload: SMSFreshWebhookPayload = JSON.parse(body);
    
    logger.info('SMSFresh webhook received', payload);

    // Process the webhook payload
    await processWebhookPayload(payload);

    return NextResponse.json({ success: true, message: 'Webhook processed successfully' });
  } catch (error) {
    logger.error('SMSFresh webhook processing failed', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

/**
 * Process incoming webhook payload from SMSFresh
 */
async function processWebhookPayload(payload: SMSFreshWebhookPayload) {
  const { messageId, phone, status, content, timestamp, type } = payload;

  try {
    // Find the message in our database using SMSFresh message ID
    const message = await prisma.message.findFirst({
      where: { smsFreshId: messageId },
      include: {
        contact: true,
        campaign: true,
        sentBy: true,
      },
    });

    if (!message) {
      // This might be an incoming message from a customer
      if (status === 'replied' && content) {
        await handleIncomingMessage(phone, content, type, timestamp);
      } else {
        logger.warn('Message not found for SMSFresh ID', { messageId, phone });
      }
      return;
    }

    // Update message status based on webhook
    await updateMessageStatus(message.id, status, timestamp);

    // Update campaign statistics if this message is part of a campaign
    if (message.campaignId) {
      await updateCampaignStats(message.campaignId, status);
    }

    // Handle customer replies
    if (status === 'replied' && content) {
      await handleCustomerReply(message, content, timestamp);
    }

    logger.info('Webhook payload processed successfully', {
      messageId: message.id,
      status,
      phone,
    });
  } catch (error) {
    logger.error('Failed to process webhook payload', { payload, error });
    throw error;
  }
}

/**
 * Update message status based on webhook data
 */
async function updateMessageStatus(messageId: string, status: string, timestamp: string) {
  const updateData: any = { status: status.toUpperCase() };

  // Set appropriate timestamp based on status
  switch (status) {
    case 'delivered':
      updateData.deliveredAt = new Date(timestamp);
      break;
    case 'read':
      updateData.readAt = new Date(timestamp);
      break;
    case 'replied':
      updateData.repliedAt = new Date(timestamp);
      break;
  }

  await prisma.message.update({
    where: { id: messageId },
    data: updateData,
  });
}

/**
 * Update campaign statistics
 */
async function updateCampaignStats(campaignId: string, status: string) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
  });

  if (!campaign) return;

  const updateData: any = {};

  switch (status) {
    case 'delivered':
      updateData.totalDelivered = campaign.totalDelivered + 1;
      break;
    case 'replied':
      updateData.totalReplies = campaign.totalReplies + 1;
      break;
    case 'failed':
      updateData.totalFailed = campaign.totalFailed + 1;
      break;
  }

  if (Object.keys(updateData).length > 0) {
    await prisma.campaign.update({
      where: { id: campaignId },
      data: updateData,
    });
  }
}

/**
 * Handle incoming messages from customers (not replies to campaigns)
 */
async function handleIncomingMessage(
  phone: string,
  content: string,
  type: string,
  timestamp: string
) {
  try {
    // Find or create contact
    let contact = await prisma.contact.findUnique({
      where: { phone: phone.replace(/\D/g, '').slice(-10) }, // Normalize phone number
    });

    if (!contact) {
      contact = await prisma.contact.create({
        data: {
          phone: phone.replace(/\D/g, '').slice(-10),
          name: `Contact ${phone}`,
          isActive: true,
        },
      });
    }

    // Create incoming message record
    const message = await prisma.message.create({
      data: {
        type: type.toUpperCase(),
        direction: 'INBOUND',
        content,
        status: 'RECEIVED',
        contactId: contact.id,
        createdAt: new Date(timestamp),
      },
    });

    // Check if this is a potential lead and create lead record
    await checkAndCreateLead(contact, content);

    // Route message to appropriate handlers based on user roles
    await routeMessageToHandlers(message, contact);

    logger.info('Incoming message processed', {
      messageId: message.id,
      contactId: contact.id,
      phone,
    });
  } catch (error) {
    logger.error('Failed to handle incoming message', { phone, content, error });
    throw error;
  }
}

/**
 * Handle customer replies to campaign messages
 */
async function handleCustomerReply(
  originalMessage: any,
  replyContent: string,
  timestamp: string
) {
  try {
    // Create reply message record
    const replyMessage = await prisma.message.create({
      data: {
        type: originalMessage.type,
        direction: 'INBOUND',
        content: replyContent,
        status: 'RECEIVED',
        contactId: originalMessage.contactId,
        campaignId: originalMessage.campaignId,
        createdAt: new Date(timestamp),
      },
    });

    // Check if this reply indicates interest and create/update lead
    await checkAndCreateLead(originalMessage.contact, replyContent);

    // Route reply to appropriate handlers
    await routeMessageToHandlers(replyMessage, originalMessage.contact);

    logger.info('Customer reply processed', {
      originalMessageId: originalMessage.id,
      replyMessageId: replyMessage.id,
      contactId: originalMessage.contactId,
    });
  } catch (error) {
    logger.error('Failed to handle customer reply', { originalMessage, replyContent, error });
    throw error;
  }
}

/**
 * Check message content for lead indicators and create lead if appropriate
 */
async function checkAndCreateLead(contact: any, messageContent: string) {
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
      await prisma.lead.create({
        data: {
          name: contact.name || `Lead ${contact.phone}`,
          phone: contact.phone,
          email: contact.email,
          loanType,
          loanAmount: 0, // Will be updated when customer provides amount
          status: hasInterestKeyword ? 'INTERESTED' : 'NEW',
          priority: hasInterestKeyword ? 'HIGH' : 'MEDIUM',
          source: 'WhatsApp/SMS',
          contactId: contact.id,
          notes: `Auto-created from message: "${messageContent}"`,
        },
      });

      logger.info('Lead created from message', {
        contactId: contact.id,
        phone: contact.phone,
        loanType,
      });
    }
  }
}

/**
 * Route messages to appropriate handlers based on user roles
 * Requirements: 4.5 - Implement message routing to appropriate handlers based on user roles
 */
async function routeMessageToHandlers(message: any, contact: any) {
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