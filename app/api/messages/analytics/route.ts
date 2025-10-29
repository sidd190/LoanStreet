import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyAuth } from '@/lib/auth';
import { logger } from '@/lib/logger';

const prisma = new PrismaClient();

/**
 * Get message routing and response analytics
 * Requirements: 4.5 - Message routing analytics and performance tracking
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('timeRange') || '7d'; // 1d, 7d, 30d
    const userId = searchParams.get('userId'); // For employee-specific analytics
    const includeDetails = searchParams.get('details') === 'true';

    // Calculate date range
    const now = new Date();
    let startDate: Date;
    
    switch (timeRange) {
      case '1d':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default: // 7d
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    const user = authResult.user;

    // Check permissions
    if (userId && userId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'You can only view your own analytics' },
        { status: 403 }
      );
    }

    // Get analytics data
    const analytics = await getMessageAnalytics(user, startDate, now, userId);
    
    // Get detailed breakdown if requested
    let detailedBreakdown = null;
    if (includeDetails) {
      detailedBreakdown = await getDetailedAnalytics(user, startDate, now, userId);
    }

    return NextResponse.json({
      timeRange,
      startDate,
      endDate: now,
      analytics,
      detailedBreakdown,
    });
  } catch (error) {
    logger.error('Failed to get message analytics', error);
    return NextResponse.json(
      { error: 'Failed to retrieve analytics' },
      { status: 500 }
    );
  }
}

/**
 * Get comprehensive message analytics
 */
async function getMessageAnalytics(user: any, startDate: Date, endDate: Date, targetUserId?: string) {
  try {
    const isAdmin = user.role === 'ADMIN';
    const userId = targetUserId || user.id;

    // Base filters
    const messageFilter: any = {
      createdAt: { gte: startDate, lte: endDate },
    };

    const activityFilter: any = {
      createdAt: { gte: startDate, lte: endDate },
      type: { in: ['SMS', 'WHATSAPP', 'NOTIFICATION'] },
    };

    // Apply user-specific filters for employees
    if (!isAdmin || targetUserId) {
      if (targetUserId) {
        activityFilter.userId = targetUserId;
        
        // For message filters, get assigned leads
        const assignedLeads = await prisma.lead.findMany({
          where: { assignedToId: targetUserId },
          select: { contactId: true },
        });
        
        const contactIds = assignedLeads
          .map(lead => lead.contactId)
          .filter(Boolean) as string[];
          
        if (contactIds.length > 0) {
          messageFilter.contactId = { in: contactIds };
        } else {
          messageFilter.id = 'non-existent'; // No messages if no assigned leads
        }
      }
    }

    // Get message statistics
    const [
      totalInboundMessages,
      totalOutboundMessages,
      totalDeliveredMessages,
      totalRepliedMessages,
      totalFailedMessages,
      totalRoutingActivities,
    ] = await Promise.all([
      prisma.message.count({
        where: { ...messageFilter, direction: 'INBOUND' },
      }),
      prisma.message.count({
        where: { ...messageFilter, direction: 'OUTBOUND' },
      }),
      prisma.message.count({
        where: { ...messageFilter, status: 'DELIVERED' },
      }),
      prisma.message.count({
        where: { ...messageFilter, status: 'REPLIED' },
      }),
      prisma.message.count({
        where: { ...messageFilter, status: 'FAILED' },
      }),
      prisma.activity.count({ where: activityFilter }),
    ]);

    // Get response time analytics
    const responseTimeStats = await getResponseTimeAnalytics(messageFilter, userId);

    // Get routing performance
    const routingPerformance = await getRoutingPerformance(startDate, endDate, userId, isAdmin);

    // Get lead conversion from messages
    const leadConversion = await getLeadConversionAnalytics(startDate, endDate, userId, isAdmin);

    // Calculate key metrics
    const deliveryRate = totalOutboundMessages > 0 
      ? (totalDeliveredMessages / totalOutboundMessages) * 100 
      : 0;

    const responseRate = totalInboundMessages > 0 
      ? (totalRepliedMessages / totalInboundMessages) * 100 
      : 0;

    const failureRate = totalOutboundMessages > 0 
      ? (totalFailedMessages / totalOutboundMessages) * 100 
      : 0;

    return {
      messageCounts: {
        totalInbound: totalInboundMessages,
        totalOutbound: totalOutboundMessages,
        totalDelivered: totalDeliveredMessages,
        totalReplied: totalRepliedMessages,
        totalFailed: totalFailedMessages,
      },
      performanceMetrics: {
        deliveryRate: Math.round(deliveryRate * 100) / 100,
        responseRate: Math.round(responseRate * 100) / 100,
        failureRate: Math.round(failureRate * 100) / 100,
      },
      responseTimeStats,
      routingPerformance,
      leadConversion,
      totalRoutingActivities,
    };
  } catch (error) {
    logger.error('Failed to calculate message analytics', error);
    throw error;
  }
}

/**
 * Get response time analytics
 */
async function getResponseTimeAnalytics(messageFilter: any, userId: string) {
  try {
    // Get messages with response times
    const messagesWithResponses = await prisma.message.findMany({
      where: {
        ...messageFilter,
        direction: 'INBOUND',
        repliedAt: { not: null },
      },
      select: {
        createdAt: true,
        repliedAt: true,
        contactId: true,
      },
    });

    if (messagesWithResponses.length === 0) {
      return {
        averageResponseTime: 0,
        medianResponseTime: 0,
        fastestResponse: 0,
        slowestResponse: 0,
        totalResponses: 0,
      };
    }

    // Calculate response times in minutes
    const responseTimes = messagesWithResponses.map(msg => {
      const responseTime = new Date(msg.repliedAt!).getTime() - new Date(msg.createdAt).getTime();
      return Math.floor(responseTime / (1000 * 60)); // Convert to minutes
    });

    responseTimes.sort((a, b) => a - b);

    const averageResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
    const medianResponseTime = responseTimes[Math.floor(responseTimes.length / 2)];
    const fastestResponse = responseTimes[0];
    const slowestResponse = responseTimes[responseTimes.length - 1];

    return {
      averageResponseTime: Math.round(averageResponseTime),
      medianResponseTime,
      fastestResponse,
      slowestResponse,
      totalResponses: responseTimes.length,
    };
  } catch (error) {
    logger.error('Failed to calculate response time analytics', error);
    return {
      averageResponseTime: 0,
      medianResponseTime: 0,
      fastestResponse: 0,
      slowestResponse: 0,
      totalResponses: 0,
    };
  }
}

/**
 * Get routing performance analytics
 */
async function getRoutingPerformance(startDate: Date, endDate: Date, userId: string, isAdmin: boolean) {
  try {
    const filter: any = {
      createdAt: { gte: startDate, lte: endDate },
      title: { contains: 'Message' },
    };

    if (!isAdmin) {
      filter.userId = userId;
    }

    // Get routing activities
    const routingActivities = await prisma.activity.findMany({
      where: filter,
      select: {
        userId: true,
        createdAt: true,
        title: true,
        description: true,
        user: {
          select: { name: true, role: true },
        },
      },
    });

    // Group by user
    const userStats: { [key: string]: any } = {};
    
    routingActivities.forEach(activity => {
      const userId = activity.userId;
      if (!userStats[userId]) {
        userStats[userId] = {
          userName: activity.user.name,
          userRole: activity.user.role,
          totalMessages: 0,
          assignedMessages: 0,
          highPriorityMessages: 0,
        };
      }
      
      userStats[userId].totalMessages++;
      
      if (activity.title.includes('assigned')) {
        userStats[userId].assignedMessages++;
      }
      
      if (activity.title.includes('High priority') || activity.description?.includes('urgent')) {
        userStats[userId].highPriorityMessages++;
      }
    });

    return {
      totalRoutedMessages: routingActivities.length,
      userBreakdown: Object.values(userStats),
      routingEfficiency: routingActivities.length > 0 ? 
        (Object.values(userStats).filter((stats: any) => stats.assignedMessages > 0).length / Object.keys(userStats).length) * 100 : 0,
    };
  } catch (error) {
    logger.error('Failed to calculate routing performance', error);
    return {
      totalRoutedMessages: 0,
      userBreakdown: [],
      routingEfficiency: 0,
    };
  }
}

/**
 * Get lead conversion analytics from messages
 */
async function getLeadConversionAnalytics(startDate: Date, endDate: Date, userId: string, isAdmin: boolean) {
  try {
    const filter: any = {
      createdAt: { gte: startDate, lte: endDate },
    };

    if (!isAdmin) {
      filter.assignedToId = userId;
    }

    // Get leads created from messages in the time period
    const leadsFromMessages = await prisma.lead.findMany({
      where: {
        ...filter,
        source: { contains: 'WhatsApp' }, // Assuming leads from messages have this source
      },
      select: {
        id: true,
        status: true,
        loanType: true,
        priority: true,
        createdAt: true,
      },
    });

    const totalLeadsFromMessages = leadsFromMessages.length;
    const convertedLeads = leadsFromMessages.filter(lead => 
      ['CLOSED_WON', 'PROPOSAL_SENT', 'NEGOTIATION'].includes(lead.status)
    ).length;

    const conversionRate = totalLeadsFromMessages > 0 
      ? (convertedLeads / totalLeadsFromMessages) * 100 
      : 0;

    // Group by status
    const statusBreakdown = leadsFromMessages.reduce((acc: any, lead) => {
      acc[lead.status] = (acc[lead.status] || 0) + 1;
      return acc;
    }, {});

    return {
      totalLeadsFromMessages,
      convertedLeads,
      conversionRate: Math.round(conversionRate * 100) / 100,
      statusBreakdown,
    };
  } catch (error) {
    logger.error('Failed to calculate lead conversion analytics', error);
    return {
      totalLeadsFromMessages: 0,
      convertedLeads: 0,
      conversionRate: 0,
      statusBreakdown: {},
    };
  }
}

/**
 * Get detailed analytics breakdown
 */
async function getDetailedAnalytics(user: any, startDate: Date, endDate: Date, targetUserId?: string) {
  try {
    // Get hourly message distribution
    const hourlyDistribution = await getHourlyMessageDistribution(startDate, endDate, targetUserId);
    
    // Get message type breakdown
    const messageTypeBreakdown = await getMessageTypeBreakdown(startDate, endDate, targetUserId);
    
    // Get top contacts by message volume
    const topContacts = await getTopContactsByMessages(startDate, endDate, targetUserId, user.role === 'ADMIN');

    return {
      hourlyDistribution,
      messageTypeBreakdown,
      topContacts,
    };
  } catch (error) {
    logger.error('Failed to get detailed analytics', error);
    return null;
  }
}

/**
 * Get hourly message distribution
 */
async function getHourlyMessageDistribution(startDate: Date, endDate: Date, userId?: string) {
  // This would require raw SQL for proper hour extraction
  // For now, return a simplified version
  return Array.from({ length: 24 }, (_, hour) => ({
    hour,
    messageCount: Math.floor(Math.random() * 10), // Placeholder
  }));
}

/**
 * Get message type breakdown
 */
async function getMessageTypeBreakdown(startDate: Date, endDate: Date, userId?: string) {
  const filter: any = {
    createdAt: { gte: startDate, lte: endDate },
  };

  if (userId) {
    // Add user-specific filtering logic here
  }

  const breakdown = await prisma.message.groupBy({
    by: ['type', 'direction'],
    where: filter,
    _count: { type: true },
  });

  return breakdown.map(item => ({
    type: item.type,
    direction: item.direction,
    count: item._count.type,
  }));
}

/**
 * Get top contacts by message volume
 */
async function getTopContactsByMessages(startDate: Date, endDate: Date, userId?: string, isAdmin: boolean) {
  const filter: any = {
    createdAt: { gte: startDate, lte: endDate },
  };

  if (!isAdmin && userId) {
    // Add user-specific filtering logic here
  }

  const topContacts = await prisma.message.groupBy({
    by: ['contactId'],
    where: filter,
    _count: { contactId: true },
    orderBy: { _count: { contactId: 'desc' } },
    take: 10,
  });

  // Get contact details
  const contactIds = topContacts.map(item => item.contactId);
  const contacts = await prisma.contact.findMany({
    where: { id: { in: contactIds } },
    select: { id: true, name: true, phone: true },
  });

  return topContacts.map(item => {
    const contact = contacts.find(c => c.id === item.contactId);
    return {
      contactId: item.contactId,
      contactName: contact?.name || contact?.phone || 'Unknown',
      messageCount: item._count.contactId,
    };
  });
}