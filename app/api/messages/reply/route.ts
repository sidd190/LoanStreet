import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyAuth } from '@/lib/middleware/auth';
import { createMessageProcessor } from '@/lib/messageProcessor';
import { logger } from '@/lib/logger';

const prisma = new PrismaClient();

/**
 * Send reply message to a contact
 * Requirements: 4.5 - Message routing and response handling based on user roles
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      contactId,
      message,
      type = 'WHATSAPP',
      templateName,
      parameters,
      mediaUrl,
      mediaType,
      originalMessageId,
    } = await request.json();

    // Validate required fields
    if (!contactId || !message) {
      return NextResponse.json(
        { error: 'Contact ID and message are required' },
        { status: 400 }
      );
    }

    const user = authResult.user;

    // Check if user has permission to reply to this contact
    const hasPermission = await checkReplyPermission(user.id, user.role, contactId);
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'You do not have permission to reply to this contact' },
        { status: 403 }
      );
    }

    // Get contact information
    const contact = await prisma.contact.findUnique({
      where: { id: contactId },
    });

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    // Send the reply message
    const messageProcessor = createMessageProcessor();
    const result = await messageProcessor.sendMessage({
      contactId,
      message,
      type: type as 'SMS' | 'WHATSAPP',
      templateName,
      parameters,
      mediaUrl,
      mediaType: mediaType as 'image' | 'video' | 'document',
      sentById: user.id,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to send message' },
        { status: 500 }
      );
    }

    // Create activity record for the reply
    await prisma.activity.create({
      data: {
        type: type,
        title: `Replied to ${contact.name || contact.phone}`,
        description: `Sent ${type.toLowerCase()} message: ${message.substring(0, 200)}`,
        userId: user.id,
        leadId: await getLeadIdForContact(contactId),
      },
    });

    // Update lead status if this is the first response
    await updateLeadStatusOnReply(contactId, user.id);

    // If this is a reply to a specific message, link them
    if (originalMessageId) {
      await linkReplyToOriginalMessage(result.messageId!, originalMessageId);
    }

    logger.info('Reply message sent successfully', {
      messageId: result.messageId,
      contactId,
      sentById: user.id,
      type,
    });

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      message: 'Reply sent successfully',
    });
  } catch (error) {
    logger.error('Failed to send reply message', error);
    return NextResponse.json(
      { error: 'Failed to send reply message' },
      { status: 500 }
    );
  }
}

/**
 * Check if user has permission to reply to a specific contact
 */
async function checkReplyPermission(
  userId: string,
  userRole: string,
  contactId: string
): Promise<boolean> {
  // Admin users can reply to any contact
  if (userRole === 'ADMIN') {
    return true;
  }

  // Employee users can only reply to contacts with leads assigned to them
  if (userRole === 'EMPLOYEE') {
    const assignedLead = await prisma.lead.findFirst({
      where: {
        contactId,
        assignedToId: userId,
      },
    });

    return !!assignedLead;
  }

  return false;
}

/**
 * Get lead ID associated with a contact
 */
async function getLeadIdForContact(contactId: string): Promise<string | undefined> {
  const lead = await prisma.lead.findFirst({
    where: { contactId },
    select: { id: true },
  });

  return lead?.id;
}

/**
 * Update lead status when user replies for the first time
 */
async function updateLeadStatusOnReply(contactId: string, userId: string) {
  try {
    const lead = await prisma.lead.findFirst({
      where: { contactId },
    });

    if (lead && lead.status === 'NEW') {
      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          status: 'CONTACTED',
          assignedToId: lead.assignedToId || userId, // Assign to replying user if unassigned
          updatedAt: new Date(),
        },
      });

      logger.info('Lead status updated on reply', {
        leadId: lead.id,
        newStatus: 'CONTACTED',
        assignedToId: lead.assignedToId || userId,
      });
    }
  } catch (error) {
    logger.error('Failed to update lead status on reply', error);
    // Don't throw error as this is not critical for message sending
  }
}

/**
 * Link reply message to original message for conversation threading
 */
async function linkReplyToOriginalMessage(replyMessageId: string, originalMessageId: string) {
  try {
    // We could add a 'replyToId' field to the Message model for proper threading
    // For now, we'll add this information to the message content or create an activity
    await prisma.activity.create({
      data: {
        type: 'NOTE',
        title: 'Message Reply Link',
        description: `Reply message ${replyMessageId} is in response to message ${originalMessageId}`,
        userId: 'system', // System-generated activity
      },
    });
  } catch (error) {
    logger.error('Failed to link reply to original message', error);
    // Don't throw error as this is not critical
  }
}