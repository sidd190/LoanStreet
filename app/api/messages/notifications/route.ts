import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyAuth } from '@/lib/middleware/auth';
import { logger } from '@/lib/logger';

const prisma = new PrismaClient();

/**
 * Get message notifications and activities for the current user
 * Requirements: 4.5 - Message routing to appropriate handlers based on user roles
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const type = searchParams.get('type'); // 'messages', 'notifications', 'all'
    const unreadOnly = searchParams.get('unread') === 'true';

    const user = authResult.user;

    // Build where clause based on user role and filters
    const where: any = { userId: user.id };
    
    if (type && type !== 'all') {
      if (type === 'messages') {
        where.type = { in: ['SMS', 'WHATSAPP'] };
      } else if (type === 'notifications') {
        where.type = 'NOTIFICATION';
      }
    }

    // Get activities (which include message notifications)
    const [activities, totalCount] = await Promise.all([
      prisma.activity.findMany({
        where,
        include: {
          lead: {
            select: {
              id: true,
              name: true,
              phone: true,
              status: true,
              priority: true,
              loanType: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.activity.count({ where }),
    ]);

    // Get recent messages for context
    const messageWhere: any = {};
    
    if (user.role === 'EMPLOYEE') {
      // Employee can only see messages for leads assigned to them
      const assignedLeads = await prisma.lead.findMany({
        where: { assignedToId: user.id },
        select: { contactId: true },
      });

      const contactIds = assignedLeads
        .map(lead => lead.contactId)
        .filter(Boolean) as string[];

      if (contactIds.length > 0) {
        messageWhere.contactId = { in: contactIds };
      } else {
        // No assigned leads, return empty messages
        messageWhere.id = 'non-existent';
      }
    }

    const recentMessages = await prisma.message.findMany({
      where: {
        ...messageWhere,
        direction: 'INBOUND',
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        },
      },
      include: {
        contact: {
          select: { id: true, name: true, phone: true },
        },
        campaign: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    // Get unread message count
    const unreadCount = await prisma.activity.count({
      where: {
        userId: user.id,
        type: { in: ['SMS', 'WHATSAPP', 'NOTIFICATION'] },
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        },
      },
    });

    return NextResponse.json({
      activities,
      recentMessages,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount,
      },
      unreadCount,
    });
  } catch (error) {
    logger.error('Failed to get message notifications', error);
    return NextResponse.json(
      { error: 'Failed to retrieve notifications' },
      { status: 500 }
    );
  }
}

/**
 * Mark notifications as read
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { activityIds } = await request.json();

    if (!Array.isArray(activityIds)) {
      return NextResponse.json({ error: 'Invalid activity IDs' }, { status: 400 });
    }

    // Mark activities as read (we can add a 'readAt' field to the Activity model later)
    // For now, we'll delete notification-type activities to mark them as "read"
    await prisma.activity.deleteMany({
      where: {
        id: { in: activityIds },
        userId: authResult.user.id,
        type: 'NOTIFICATION',
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Failed to mark notifications as read', error);
    return NextResponse.json(
      { error: 'Failed to mark notifications as read' },
      { status: 500 }
    );
  }
}