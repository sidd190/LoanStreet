import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyAuth } from '@/lib/auth';
import { createSMSFreshService } from '@/lib/smsFreshService';
import { logger } from '@/lib/logger';

const prisma = new PrismaClient();

/**
 * Get message status and delivery information
 * Requirements: 4.5 - Message response handling and status tracking
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const messageId = searchParams.get('messageId');
    const contactId = searchParams.get('contactId');
    const campaignId = searchParams.get('campaignId');

    if (!messageId && !contactId && !campaignId) {
      return NextResponse.json(
        { error: 'Message ID, Contact ID, or Campaign ID is required' },
        { status: 400 }
      );
    }

    let messages = [];

    if (messageId) {
      // Get specific message status
      const message = await prisma.message.findUnique({
        where: { id: messageId },
        include: {
          contact: {
            select: { id: true, name: true, phone: true },
          },
          campaign: {
            select: { id: true, name: true },
          },
          sentBy: {
            select: { id: true, name: true },
          },
        },
      });

      if (!message) {
        return NextResponse.json({ error: 'Message not found' }, { status: 404 });
      }

      // Check if user has access to this message
      const hasAccess = await checkMessageAccess(authResult.user, message);
      if (!hasAccess) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }

      messages = [message];
    } else if (contactId) {
      // Get all messages for a contact
      const hasContactAccess = await checkContactAccess(authResult.user, contactId);
      if (!hasContactAccess) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }

      messages = await prisma.message.findMany({
        where: { contactId },
        include: {
          contact: {
            select: { id: true, name: true, phone: true },
          },
          campaign: {
            select: { id: true, name: true },
          },
          sentBy: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
    } else if (campaignId) {
      // Get all messages for a campaign
      if (authResult.user.role !== 'ADMIN') {
        return NextResponse.json(
          { error: 'Only admin users can view campaign message status' },
          { status: 403 }
        );
      }

      messages = await prisma.message.findMany({
        where: { campaignId },
        include: {
          contact: {
            select: { id: true, name: true, phone: true },
          },
          campaign: {
            select: { id: true, name: true },
          },
          sentBy: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    // Enhance messages with delivery timeline
    const enhancedMessages = messages.map(message => ({
      ...message,
      deliveryTimeline: createDeliveryTimeline(message),
      statusSummary: createStatusSummary(message),
    }));

    return NextResponse.json({
      messages: enhancedMessages,
      count: enhancedMessages.length,
    });
  } catch (error) {
    logger.error('Failed to get message status', error);
    return NextResponse.json(
      { error: 'Failed to retrieve message status' },
      { status: 500 }
    );
  }
}

/**
 * Update message status manually (for admin users)
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admin users can manually update message status
    if (authResult.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only admin users can manually update message status' },
        { status: 403 }
      );
    }

    const { messageId, status, reason } = await request.json();

    if (!messageId || !status) {
      return NextResponse.json(
        { error: 'Message ID and status are required' },
        { status: 400 }
      );
    }

    const validStatuses = ['PENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED', 'REPLIED'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status value' },
        { status: 400 }
      );
    }

    // Update message status
    const updateData: any = { 
      status,
      updatedAt: new Date(),
    };

    // Set appropriate timestamp based on status
    const now = new Date();
    switch (status) {
      case 'SENT':
        updateData.sentAt = now;
        break;
      case 'DELIVERED':
        updateData.deliveredAt = now;
        break;
      case 'READ':
        updateData.readAt = now;
        break;
      case 'REPLIED':
        updateData.repliedAt = now;
        break;
    }

    const updatedMessage = await prisma.message.update({
      where: { id: messageId },
      data: updateData,
    });

    // Create activity log for manual status update
    await prisma.activity.create({
      data: {
        type: 'SYSTEM',
        title: 'Message Status Updated Manually',
        description: `Message ${messageId} status changed to ${status}. Reason: ${reason || 'No reason provided'}`,
        userId: authResult.user.id,
      },
    });

    // Update campaign statistics if this message is part of a campaign
    if (updatedMessage.campaignId) {
      await updateCampaignStatistics(updatedMessage.campaignId);
    }

    logger.info('Message status updated manually', {
      messageId,
      newStatus: status,
      updatedBy: authResult.user.id,
      reason,
    });

    return NextResponse.json({
      success: true,
      message: 'Message status updated successfully',
      updatedMessage,
    });
  } catch (error) {
    logger.error('Failed to update message status', error);
    return NextResponse.json(
      { error: 'Failed to update message status' },
      { status: 500 }
    );
  }
}

/**
 * Sync message status with SMSFresh API
 */
export async function PUT(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { messageId } = await request.json();

    if (!messageId) {
      return NextResponse.json(
        { error: 'Message ID is required' },
        { status: 400 }
      );
    }

    const message = await prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    if (!message.smsFreshId) {
      return NextResponse.json(
        { error: 'Message does not have SMSFresh ID' },
        { status: 400 }
      );
    }

    // Check access permissions
    const hasAccess = await checkMessageAccess(authResult.user, message);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Sync with SMSFresh API
    const smsFreshService = createSMSFreshService();
    const statusResult = await smsFreshService.getMessageStatus(message.smsFreshId);

    if (!statusResult.success) {
      return NextResponse.json(
        { error: 'Failed to sync with SMSFresh API' },
        { status: 502 }
      );
    }

    // Update message status based on SMSFresh response
    const updateData: any = {};
    if (statusResult.deliveryStatus) {
      updateData.status = statusResult.deliveryStatus.toUpperCase();
      
      const now = new Date();
      switch (statusResult.deliveryStatus) {
        case 'delivered':
          updateData.deliveredAt = now;
          break;
        case 'failed':
          updateData.status = 'FAILED';
          break;
      }
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.message.update({
        where: { id: messageId },
        data: updateData,
      });
    }

    logger.info('Message status synced with SMSFresh', {
      messageId,
      smsFreshId: message.smsFreshId,
      newStatus: updateData.status,
    });

    return NextResponse.json({
      success: true,
      message: 'Message status synced successfully',
      syncedStatus: statusResult.deliveryStatus,
    });
  } catch (error) {
    logger.error('Failed to sync message status', error);
    return NextResponse.json(
      { error: 'Failed to sync message status' },
      { status: 500 }
    );
  }
}

/**
 * Check if user has access to a specific message
 */
async function checkMessageAccess(user: any, message: any): Promise<boolean> {
  if (user.role === 'ADMIN') {
    return true;
  }

  if (user.role === 'EMPLOYEE') {
    // Employee can access messages for leads assigned to them
    if (message.contactId) {
      const assignedLead = await prisma.lead.findFirst({
        where: {
          contactId: message.contactId,
          assignedToId: user.id,
        },
      });
      return !!assignedLead;
    }
  }

  return false;
}

/**
 * Check if user has access to a specific contact
 */
async function checkContactAccess(user: any, contactId: string): Promise<boolean> {
  if (user.role === 'ADMIN') {
    return true;
  }

  if (user.role === 'EMPLOYEE') {
    const assignedLead = await prisma.lead.findFirst({
      where: {
        contactId,
        assignedToId: user.id,
      },
    });
    return !!assignedLead;
  }

  return false;
}

/**
 * Create delivery timeline for a message
 */
function createDeliveryTimeline(message: any) {
  const timeline = [];

  if (message.createdAt) {
    timeline.push({
      status: 'CREATED',
      timestamp: message.createdAt,
      description: 'Message created',
    });
  }

  if (message.sentAt) {
    timeline.push({
      status: 'SENT',
      timestamp: message.sentAt,
      description: 'Message sent via SMSFresh',
    });
  }

  if (message.deliveredAt) {
    timeline.push({
      status: 'DELIVERED',
      timestamp: message.deliveredAt,
      description: 'Message delivered to recipient',
    });
  }

  if (message.readAt) {
    timeline.push({
      status: 'READ',
      timestamp: message.readAt,
      description: 'Message read by recipient',
    });
  }

  if (message.repliedAt) {
    timeline.push({
      status: 'REPLIED',
      timestamp: message.repliedAt,
      description: 'Recipient replied to message',
    });
  }

  return timeline.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

/**
 * Create status summary for a message
 */
function createStatusSummary(message: any) {
  const now = new Date();
  const createdAt = new Date(message.createdAt);
  const totalTime = now.getTime() - createdAt.getTime();

  let deliveryTime = null;
  let readTime = null;
  let responseTime = null;

  if (message.deliveredAt) {
    deliveryTime = new Date(message.deliveredAt).getTime() - createdAt.getTime();
  }

  if (message.readAt) {
    readTime = new Date(message.readAt).getTime() - createdAt.getTime();
  }

  if (message.repliedAt) {
    responseTime = new Date(message.repliedAt).getTime() - createdAt.getTime();
  }

  return {
    currentStatus: message.status,
    totalTimeElapsed: Math.floor(totalTime / 1000), // in seconds
    deliveryTime: deliveryTime ? Math.floor(deliveryTime / 1000) : null,
    readTime: readTime ? Math.floor(readTime / 1000) : null,
    responseTime: responseTime ? Math.floor(responseTime / 1000) : null,
    isDelivered: !!message.deliveredAt,
    isRead: !!message.readAt,
    hasResponse: !!message.repliedAt,
  };
}

/**
 * Update campaign statistics
 */
async function updateCampaignStatistics(campaignId: string) {
  try {
    const stats = await prisma.message.groupBy({
      by: ['status'],
      where: { campaignId },
      _count: { status: true },
    });

    const totalSent = stats.find(s => s.status === 'SENT')?._count.status || 0;
    const totalDelivered = stats.find(s => s.status === 'DELIVERED')?._count.status || 0;
    const totalReplies = stats.find(s => s.status === 'REPLIED')?._count.status || 0;
    const totalFailed = stats.find(s => s.status === 'FAILED')?._count.status || 0;

    await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        totalSent,
        totalDelivered,
        totalReplies,
        totalFailed,
      },
    });
  } catch (error) {
    logger.error('Failed to update campaign statistics', error);
  }
}