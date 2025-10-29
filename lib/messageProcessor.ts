import { PrismaClient } from '@prisma/client';
import { createSMSFreshService, SMSFreshTextParams, SMSFreshMediaParams } from './smsFreshService';
import { logger } from './logger';

const prisma = new PrismaClient();

export interface MessageProcessingResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface BulkMessageParams {
  contactIds: string[];
  message: string;
  type: 'SMS' | 'WHATSAPP';
  templateName?: string;
  parameters?: string[];
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'document';
  campaignId?: string;
  sentById: string;
}

export interface MessageFilter {
  userId?: string;
  contactId?: string;
  campaignId?: string;
  type?: 'SMS' | 'WHATSAPP';
  direction?: 'INBOUND' | 'OUTBOUND';
  status?: string;
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
  offset?: number;
}

/**
 * Message Processing Service
 * Handles message sending, receiving, and routing logic
 */
export class MessageProcessor {
  private smsFreshService;

  constructor() {
    this.smsFreshService = createSMSFreshService();
  }

  /**
   * Send individual message to a contact
   */
  async sendMessage(params: {
    contactId: string;
    message: string;
    type: 'SMS' | 'WHATSAPP';
    templateName?: string;
    parameters?: string[];
    mediaUrl?: string;
    mediaType?: 'image' | 'video' | 'document';
    sentById: string;
    campaignId?: string;
  }): Promise<MessageProcessingResult> {
    try {
      // Get contact information
      const contact = await prisma.contact.findUnique({
        where: { id: params.contactId },
      });

      if (!contact) {
        return { success: false, error: 'Contact not found' };
      }

      // Create message record in database
      const message = await prisma.message.create({
        data: {
          type: params.type,
          direction: 'OUTBOUND',
          content: params.message,
          status: 'PENDING',
          contactId: params.contactId,
          campaignId: params.campaignId,
          sentById: params.sentById,
          templateName: params.templateName,
          parameters: params.parameters ? JSON.stringify(params.parameters) : null,
          mediaUrl: params.mediaUrl,
          mediaType: params.mediaType,
        },
      });

      // Send message via SMSFresh
      let result;
      if (params.mediaUrl && params.mediaType) {
        // Send media message
        result = await this.smsFreshService.sendWhatsAppMedia({
          phone: [contact.phone],
          templateName: params.templateName || 'default_template',
          parameters: params.parameters,
          mediaType: params.mediaType,
          mediaUrl: params.mediaUrl,
        });
      } else if (params.type === 'WHATSAPP') {
        // Send WhatsApp text message
        result = await this.smsFreshService.sendWhatsAppText({
          phone: [contact.phone],
          templateName: params.templateName || 'default_template',
          parameters: params.parameters,
        });
      } else {
        // Send SMS message
        result = await this.smsFreshService.sendSMS({
          phone: [contact.phone],
          templateName: params.templateName || 'default_template',
          parameters: params.parameters,
        });
      }

      // Update message with SMSFresh response
      await prisma.message.update({
        where: { id: message.id },
        data: {
          status: result.success ? 'SENT' : 'FAILED',
          smsFreshId: result.messageId,
          sentAt: result.success ? new Date() : null,
        },
      });

      if (result.success) {
        logger.info('Message sent successfully', {
          messageId: message.id,
          contactId: params.contactId,
          type: params.type,
        });
      } else {
        logger.error('Message sending failed', {
          messageId: message.id,
          contactId: params.contactId,
          error: result.error,
        });
      }

      return {
        success: result.success,
        messageId: message.id,
        error: result.error,
      };
    } catch (error) {
      logger.error('Message processing failed', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send bulk messages to multiple contacts
   */
  async sendBulkMessages(params: BulkMessageParams): Promise<MessageProcessingResult[]> {
    const results: MessageProcessingResult[] = [];

    try {
      // Get all contacts
      const contacts = await prisma.contact.findMany({
        where: {
          id: { in: params.contactIds },
          isActive: true,
        },
      });

      if (contacts.length === 0) {
        return [{ success: false, error: 'No active contacts found' }];
      }

      // Process messages in batches to avoid overwhelming the API
      const batchSize = 10;
      for (let i = 0; i < contacts.length; i += batchSize) {
        const batch = contacts.slice(i, i + batchSize);
        const batchPromises = batch.map(contact =>
          this.sendMessage({
            contactId: contact.id,
            message: params.message,
            type: params.type,
            templateName: params.templateName,
            parameters: params.parameters,
            mediaUrl: params.mediaUrl,
            mediaType: params.mediaType,
            sentById: params.sentById,
            campaignId: params.campaignId,
          })
        );

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);

        // Add delay between batches to respect rate limits
        if (i + batchSize < contacts.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      // Update campaign statistics if this is part of a campaign
      if (params.campaignId) {
        await this.updateCampaignStatistics(params.campaignId);
      }

      logger.info('Bulk messages processed', {
        campaignId: params.campaignId,
        totalContacts: contacts.length,
        successCount: results.filter(r => r.success).length,
        failureCount: results.filter(r => !r.success).length,
      });

      return results;
    } catch (error) {
      logger.error('Bulk message processing failed', error);
      return [{ success: false, error: error instanceof Error ? error.message : 'Unknown error' }];
    }
  }

  /**
   * Get messages with filtering and pagination
   */
  async getMessages(filter: MessageFilter = {}) {
    try {
      const where: any = {};

      // Apply filters
      if (filter.contactId) where.contactId = filter.contactId;
      if (filter.campaignId) where.campaignId = filter.campaignId;
      if (filter.type) where.type = filter.type;
      if (filter.direction) where.direction = filter.direction;
      if (filter.status) where.status = filter.status;
      
      if (filter.dateFrom || filter.dateTo) {
        where.createdAt = {};
        if (filter.dateFrom) where.createdAt.gte = filter.dateFrom;
        if (filter.dateTo) where.createdAt.lte = filter.dateTo;
      }

      // For employee users, only show messages they have access to
      if (filter.userId) {
        const user = await prisma.user.findUnique({
          where: { id: filter.userId },
        });

        if (user?.role === 'EMPLOYEE') {
          // Employee can only see messages for leads assigned to them or unassigned high-priority messages
          const assignedLeads = await prisma.lead.findMany({
            where: { assignedToId: filter.userId },
            select: { contactId: true },
          });

          const unassignedHighPriorityLeads = await prisma.lead.findMany({
            where: { 
              assignedToId: null,
              priority: { in: ['HIGH', 'URGENT'] },
            },
            select: { contactId: true },
          });

          const contactIds = [
            ...assignedLeads.map(lead => lead.contactId),
            ...unassignedHighPriorityLeads.map(lead => lead.contactId),
          ].filter(Boolean) as string[];

          if (contactIds.length > 0) {
            where.contactId = { in: [...new Set(contactIds)] }; // Remove duplicates
          } else {
            // No accessible messages, return empty result
            return { messages: [], total: 0 };
          }
        }
      }

      const [messages, total] = await Promise.all([
        prisma.message.findMany({
          where,
          include: {
            contact: {
              select: { id: true, name: true, phone: true, email: true },
            },
            campaign: {
              select: { id: true, name: true, type: true },
            },
            sentBy: {
              select: { id: true, name: true, email: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: filter.limit || 50,
          skip: filter.offset || 0,
        }),
        prisma.message.count({ where }),
      ]);

      return { messages, total };
    } catch (error) {
      logger.error('Failed to get messages', error);
      throw error;
    }
  }

  /**
   * Get message statistics for dashboard
   */
  async getMessageStatistics(userId?: string) {
    try {
      const where: any = {};

      // For employee users, only count messages they have access to
      if (userId) {
        const user = await prisma.user.findUnique({
          where: { id: userId },
        });

        if (user?.role === 'EMPLOYEE') {
          const assignedLeads = await prisma.lead.findMany({
            where: { assignedToId: userId },
            select: { contactId: true },
          });

          const contactIds = assignedLeads
            .map(lead => lead.contactId)
            .filter(Boolean) as string[];

          if (contactIds.length > 0) {
            where.contactId = { in: contactIds };
          } else {
            return {
              totalMessages: 0,
              sentMessages: 0,
              deliveredMessages: 0,
              repliedMessages: 0,
              failedMessages: 0,
              inboundMessages: 0,
              outboundMessages: 0,
            };
          }
        }
      }

      const [
        totalMessages,
        sentMessages,
        deliveredMessages,
        repliedMessages,
        failedMessages,
        inboundMessages,
        outboundMessages,
      ] = await Promise.all([
        prisma.message.count({ where }),
        prisma.message.count({ where: { ...where, status: 'SENT' } }),
        prisma.message.count({ where: { ...where, status: 'DELIVERED' } }),
        prisma.message.count({ where: { ...where, status: 'REPLIED' } }),
        prisma.message.count({ where: { ...where, status: 'FAILED' } }),
        prisma.message.count({ where: { ...where, direction: 'INBOUND' } }),
        prisma.message.count({ where: { ...where, direction: 'OUTBOUND' } }),
      ]);

      return {
        totalMessages,
        sentMessages,
        deliveredMessages,
        repliedMessages,
        failedMessages,
        inboundMessages,
        outboundMessages,
      };
    } catch (error) {
      logger.error('Failed to get message statistics', error);
      throw error;
    }
  }

  /**
   * Send OTP message for authentication
   */
  async sendOTP(phone: string, otp: string): Promise<MessageProcessingResult> {
    try {
      const result = await this.smsFreshService.sendAuthOTP({
        phone: [phone],
        templateName: 'otp_template',
        otp,
      });

      // Create message record for OTP
      if (result.success) {
        await prisma.message.create({
          data: {
            type: 'WHATSAPP',
            direction: 'OUTBOUND',
            content: `Your OTP is: ${otp}`,
            status: 'SENT',
            contactId: await this.getOrCreateContactId(phone),
            smsFreshId: result.messageId,
            templateName: 'otp_template',
            sentAt: new Date(),
          },
        });
      }

      return {
        success: result.success,
        error: result.error,
      };
    } catch (error) {
      logger.error('OTP sending failed', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Update campaign statistics based on current message statuses
   */
  private async updateCampaignStatistics(campaignId: string) {
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

  /**
   * Get conversation thread for a contact
   */
  async getConversationThread(contactId: string, userId?: string, limit: number = 50) {
    try {
      // Check if user has access to this contact's messages
      if (userId) {
        const user = await prisma.user.findUnique({
          where: { id: userId },
        });

        if (user?.role === 'EMPLOYEE') {
          const hasAccess = await this.checkEmployeeContactAccess(userId, contactId);
          if (!hasAccess) {
            return { messages: [], contact: null };
          }
        }
      }

      const [messages, contact] = await Promise.all([
        prisma.message.findMany({
          where: { contactId },
          include: {
            sentBy: {
              select: { id: true, name: true, email: true },
            },
            campaign: {
              select: { id: true, name: true },
            },
          },
          orderBy: { createdAt: 'asc' },
          take: limit,
        }),
        prisma.contact.findUnique({
          where: { id: contactId },
          include: {
            leads: {
              select: {
                id: true,
                name: true,
                status: true,
                priority: true,
                loanType: true,
                assignedTo: {
                  select: { id: true, name: true },
                },
              },
            },
          },
        }),
      ]);

      return { messages, contact };
    } catch (error) {
      logger.error('Failed to get conversation thread', error);
      throw error;
    }
  }

  /**
   * Check if employee has access to a specific contact
   */
  private async checkEmployeeContactAccess(userId: string, contactId: string): Promise<boolean> {
    const assignedLead = await prisma.lead.findFirst({
      where: {
        contactId,
        assignedToId: userId,
      },
    });

    if (assignedLead) return true;

    // Check if this is an unassigned high-priority lead
    const unassignedHighPriorityLead = await prisma.lead.findFirst({
      where: {
        contactId,
        assignedToId: null,
        priority: { in: ['HIGH', 'URGENT'] },
      },
    });

    return !!unassignedHighPriorityLead;
  }

  /**
   * Get or create contact ID for a phone number
   */
  private async getOrCreateContactId(phone: string): Promise<string> {
    const normalizedPhone = phone.replace(/\D/g, '').slice(-10);
    
    let contact = await prisma.contact.findUnique({
      where: { phone: normalizedPhone },
    });

    if (!contact) {
      contact = await prisma.contact.create({
        data: {
          phone: normalizedPhone,
          name: `Contact ${normalizedPhone}`,
          isActive: true,
        },
      });
    }

    return contact.id;
  }
}

// Singleton instance
let messageProcessorInstance: MessageProcessor | null = null;

export function createMessageProcessor(): MessageProcessor {
  if (!messageProcessorInstance) {
    messageProcessorInstance = new MessageProcessor();
  }
  return messageProcessorInstance;
}