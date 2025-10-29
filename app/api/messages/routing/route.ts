import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyAuth } from '@/lib/auth';
import { logger } from '@/lib/logger';

const prisma = new PrismaClient();

/**
 * Get message routing rules and preferences
 * Requirements: 4.5 - Message routing to appropriate handlers based on user roles
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = authResult.user;

    // Get routing statistics for the user
    const routingStats = await getRoutingStatistics(user.id, user.role);

    // Get user's assigned leads (for employees)
    let assignedLeads = [];
    if (user.role === 'EMPLOYEE') {
      assignedLeads = await prisma.lead.findMany({
        where: { assignedToId: user.id },
        include: {
          contact: {
            select: { id: true, name: true, phone: true },
          },
        },
        orderBy: { updatedAt: 'desc' },
        take: 20,
      });
    }

    // Get recent routing activities
    const recentActivities = await prisma.activity.findMany({
      where: {
        userId: user.id,
        type: { in: ['SMS', 'WHATSAPP', 'NOTIFICATION'] },
      },
      include: {
        lead: {
          select: { id: true, name: true, phone: true, status: true, priority: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return NextResponse.json({
      routingStats,
      assignedLeads,
      recentActivities,
      userRole: user.role,
      permissions: user.permissions,
    });
  } catch (error) {
    logger.error('Failed to get message routing data', error);
    return NextResponse.json(
      { error: 'Failed to retrieve routing data' },
      { status: 500 }
    );
  }
}

/**
 * Update message routing preferences (for admin users)
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admin users can modify routing rules
    if (authResult.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only admin users can modify routing rules' },
        { status: 403 }
      );
    }

    const {
      autoAssignHighPriority,
      employeeWorkloadLimit,
      routingStrategy, // 'round_robin', 'least_loaded', 'manual'
      notificationSettings,
    } = await request.json();

    // For now, we'll store these preferences in the database as a system configuration
    // In a real implementation, you might want a dedicated RoutingConfig model
    
    // Create or update system configuration
    const configData = {
      autoAssignHighPriority: autoAssignHighPriority ?? true,
      employeeWorkloadLimit: employeeWorkloadLimit ?? 10,
      routingStrategy: routingStrategy ?? 'least_loaded',
      notificationSettings: notificationSettings ?? {
        emailNotifications: true,
        smsNotifications: false,
        pushNotifications: true,
      },
      updatedBy: authResult.user.id,
      updatedAt: new Date(),
    };

    // Store configuration as a system activity for now
    await prisma.activity.create({
      data: {
        type: 'SYSTEM',
        title: 'Routing Configuration Updated',
        description: `Routing rules updated: ${JSON.stringify(configData)}`,
        userId: authResult.user.id,
      },
    });

    logger.info('Message routing configuration updated', {
      updatedBy: authResult.user.id,
      config: configData,
    });

    return NextResponse.json({
      success: true,
      message: 'Routing configuration updated successfully',
      config: configData,
    });
  } catch (error) {
    logger.error('Failed to update routing configuration', error);
    return NextResponse.json(
      { error: 'Failed to update routing configuration' },
      { status: 500 }
    );
  }
}

/**
 * Get routing statistics for a user
 */
async function getRoutingStatistics(userId: string, userRole: string) {
  try {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    if (userRole === 'ADMIN') {
      // Admin sees system-wide statistics
      const [
        totalMessages24h,
        totalMessages7d,
        totalLeads,
        activeEmployees,
        unassignedLeads,
      ] = await Promise.all([
        prisma.message.count({
          where: {
            direction: 'INBOUND',
            createdAt: { gte: last24Hours },
          },
        }),
        prisma.message.count({
          where: {
            direction: 'INBOUND',
            createdAt: { gte: last7Days },
          },
        }),
        prisma.lead.count(),
        prisma.user.count({
          where: { role: 'EMPLOYEE', isActive: true },
        }),
        prisma.lead.count({
          where: { assignedToId: null },
        }),
      ]);

      return {
        totalMessages24h,
        totalMessages7d,
        totalLeads,
        activeEmployees,
        unassignedLeads,
        userType: 'admin',
      };
    } else {
      // Employee sees their own statistics
      const assignedLeads = await prisma.lead.findMany({
        where: { assignedToId: userId },
        select: { contactId: true },
      });

      const contactIds = assignedLeads
        .map(lead => lead.contactId)
        .filter(Boolean) as string[];

      const [
        assignedMessages24h,
        assignedMessages7d,
        totalAssignedLeads,
        respondedMessages24h,
      ] = await Promise.all([
        prisma.message.count({
          where: {
            direction: 'INBOUND',
            contactId: { in: contactIds },
            createdAt: { gte: last24Hours },
          },
        }),
        prisma.message.count({
          where: {
            direction: 'INBOUND',
            contactId: { in: contactIds },
            createdAt: { gte: last7Days },
          },
        }),
        prisma.lead.count({
          where: { assignedToId: userId },
        }),
        prisma.message.count({
          where: {
            direction: 'OUTBOUND',
            sentById: userId,
            createdAt: { gte: last24Hours },
          },
        }),
      ]);

      return {
        assignedMessages24h,
        assignedMessages7d,
        totalAssignedLeads,
        respondedMessages24h,
        userType: 'employee',
      };
    }
  } catch (error) {
    logger.error('Failed to get routing statistics', error);
    return {
      error: 'Failed to calculate statistics',
      userType: userRole.toLowerCase(),
    };
  }
}