/**
 * Campaign Execution Engine
 * Handles bulk messaging capabilities with SMSFresh integration and automation
 * Requirements: 2.3, 6.2, 6.3, 6.5
 */

import { PrismaClient } from '@prisma/client'
import { createSMSFreshService, SMSFreshResponse } from './smsFreshService'
import { logger } from './logger'
import { formatMessage, getTemplate } from './messageTemplates'

const prisma = new PrismaClient()

export interface CampaignExecutionResult {
  success: boolean
  totalProcessed: number
  successCount: number
  failureCount: number
  errors: string[]
  messageId?: string
  automationTriggered?: boolean
  nextDataSetId?: string
}

export interface CampaignAutomationConfig {
  markProcessedContacts: boolean
  autoProgressToNextDataSet: boolean
  generatePerformanceReport: boolean
  triggerFollowUpCampaigns: boolean
  leadScoringUpdate: boolean
}

export interface BulkMessageParams {
  campaignId: string
  contacts: Array<{
    id: string
    phone: string
    name?: string
  }>
  message: string
  type: 'SMS' | 'WHATSAPP'
  templateName?: string
  parameters?: Record<string, string>
  mediaUrl?: string
  mediaType?: 'image' | 'video' | 'document'
  userId: string
}

export class CampaignExecutor {
  private smsService
  private batchSize = 100
  private batchDelay = 1000 // 1 second between batches

  constructor() {
    this.smsService = createSMSFreshService()
  }

  /**
   * Execute a campaign by sending messages to all target contacts
   */
  async executeCampaign(campaignId: string, userId: string): Promise<CampaignExecutionResult> {
    try {
      logger.info(`Starting campaign execution: ${campaignId}`)

      // Get campaign with pending contacts
      const campaign = await prisma.campaign.findUnique({
        where: { id: campaignId },
        include: {
          contacts: {
            where: { status: 'PENDING' },
            include: { contact: true }
          }
        }
      })

      if (!campaign) {
        throw new Error('Campaign not found')
      }

      if (campaign.contacts.length === 0) {
        return {
          success: true,
          totalProcessed: 0,
          successCount: 0,
          failureCount: 0,
          errors: ['No pending contacts to process']
        }
      }

      // Update campaign status to running
      await prisma.campaign.update({
        where: { id: campaignId },
        data: {
          status: 'RUNNING',
          sentAt: campaign.sentAt || new Date()
        }
      })

      // Prepare bulk message parameters
      const bulkParams: BulkMessageParams = {
        campaignId,
        contacts: campaign.contacts.map(cc => ({
          id: cc.contactId,
          phone: cc.contact.phone,
          name: cc.contact.name || undefined
        })),
        message: campaign.message,
        type: campaign.type as 'SMS' | 'WHATSAPP',
        templateName: campaign.templateName || undefined,
        parameters: campaign.parameters ? JSON.parse(campaign.parameters) : undefined,
        mediaUrl: campaign.mediaUrl || undefined,
        mediaType: campaign.mediaType as 'image' | 'video' | 'document' | undefined,
        userId
      }

      // Execute bulk messaging
      const result = await this.sendBulkMessages(bulkParams)

      // Update campaign statistics
      await prisma.campaign.update({
        where: { id: campaignId },
        data: {
          totalSent: result.successCount,
          totalFailed: result.failureCount,
          status: result.totalProcessed === campaign.contacts.length ? 'COMPLETED' : 'RUNNING'
        }
      })

      logger.info(`Campaign execution completed: ${campaignId}, Success: ${result.successCount}, Failed: ${result.failureCount}`)

      return result
    } catch (error) {
      logger.error(`Campaign execution failed: ${campaignId}`, error)
      
      // Update campaign status to cancelled
      await prisma.campaign.update({
        where: { id: campaignId },
        data: { status: 'CANCELLED' }
      }).catch(updateError => {
        logger.error('Failed to update campaign status after error', updateError)
      })

      return {
        success: false,
        totalProcessed: 0,
        successCount: 0,
        failureCount: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      }
    }
  }

  /**
   * Send bulk messages to multiple contacts
   */
  async sendBulkMessages(params: BulkMessageParams): Promise<CampaignExecutionResult> {
    const { contacts, type, templateName, parameters, mediaUrl, mediaType, userId, campaignId } = params
    
    let successCount = 0
    let failureCount = 0
    const errors: string[] = []
    let totalProcessed = 0

    try {
      // Process contacts in batches
      for (let i = 0; i < contacts.length; i += this.batchSize) {
        const batch = contacts.slice(i, i + this.batchSize)
        const phoneNumbers = batch.map(contact => contact.phone)

        logger.info(`Processing batch ${Math.floor(i / this.batchSize) + 1}: ${batch.length} contacts`)

        try {
          let result: SMSFreshResponse

          if (type === 'WHATSAPP') {
            if (mediaUrl && mediaType) {
              // Send WhatsApp with media
              result = await this.smsService.sendWhatsAppMedia({
                phone: phoneNumbers,
                templateName: templateName || 'default_template',
                parameters: parameters ? Object.values(parameters) : [],
                mediaType,
                mediaUrl
              })
            } else {
              // Send WhatsApp text
              result = await this.smsService.sendWhatsAppText({
                phone: phoneNumbers,
                templateName: templateName || 'default_template',
                parameters: parameters ? Object.values(parameters) : []
              })
            }
          } else {
            // Send SMS
            result = await this.smsService.sendSMS({
              phone: phoneNumbers,
              templateName: templateName || 'default_template',
              parameters: parameters ? Object.values(parameters) : []
            })
          }

          if (result.success) {
            successCount += batch.length
            await this.updateContactStatuses(campaignId, batch.map(c => c.id), 'SENT', result.messageId)
            await this.createMessageRecords(batch, params, 'SENT', result.messageId, userId)
          } else {
            failureCount += batch.length
            errors.push(`Batch ${Math.floor(i / this.batchSize) + 1}: ${result.error}`)
            await this.updateContactStatuses(campaignId, batch.map(c => c.id), 'FAILED')
            await this.createMessageRecords(batch, params, 'FAILED', undefined, userId)
          }
        } catch (batchError) {
          failureCount += batch.length
          const errorMessage = batchError instanceof Error ? batchError.message : 'Unknown batch error'
          errors.push(`Batch ${Math.floor(i / this.batchSize) + 1}: ${errorMessage}`)
          logger.error(`Batch processing error:`, batchError)
          
          await this.updateContactStatuses(campaignId, batch.map(c => c.id), 'FAILED')
          await this.createMessageRecords(batch, params, 'FAILED', undefined, userId)
        }

        totalProcessed += batch.length

        // Add delay between batches to respect rate limits
        if (i + this.batchSize < contacts.length) {
          await new Promise(resolve => setTimeout(resolve, this.batchDelay))
        }
      }

      return {
        success: errors.length === 0,
        totalProcessed,
        successCount,
        failureCount,
        errors
      }
    } catch (error) {
      logger.error('Bulk messaging failed:', error)
      return {
        success: false,
        totalProcessed,
        successCount,
        failureCount,
        errors: [...errors, error instanceof Error ? error.message : 'Unknown error']
      }
    }
  }

  /**
   * Send immediate message to specific contacts (not part of a campaign)
   */
  async sendImmediateMessage(params: {
    contacts: Array<{ id: string; phone: string; name?: string }>
    message: string
    type: 'SMS' | 'WHATSAPP'
    templateId?: string
    parameters?: Record<string, string>
    mediaUrl?: string
    mediaType?: 'image' | 'video' | 'document'
    userId: string
  }): Promise<CampaignExecutionResult> {
    const { contacts, message, type, templateId, parameters, mediaUrl, mediaType, userId } = params

    try {
      // Format message if using template
      let finalMessage = message
      if (templateId && parameters) {
        const formatResult = formatMessage(templateId, parameters)
        if (formatResult.success) {
          finalMessage = formatResult.message || message
        }
      }

      const phoneNumbers = contacts.map(c => c.phone)
      let result: SMSFreshResponse

      if (type === 'WHATSAPP') {
        if (mediaUrl && mediaType) {
          result = await this.smsService.sendWhatsAppMedia({
            phone: phoneNumbers,
            templateName: templateId || 'default_template',
            parameters: parameters ? Object.values(parameters) : [],
            mediaType,
            mediaUrl
          })
        } else {
          result = await this.smsService.sendWhatsAppText({
            phone: phoneNumbers,
            templateName: templateId || 'default_template',
            parameters: parameters ? Object.values(parameters) : []
          })
        }
      } else {
        result = await this.smsService.sendSMS({
          phone: phoneNumbers,
          templateName: templateId || 'default_template',
          parameters: parameters ? Object.values(parameters) : []
        })
      }

      // Create message records
      const messageData = contacts.map(contact => ({
        type,
        direction: 'OUTBOUND' as const,
        content: finalMessage,
        status: result.success ? 'SENT' as const : 'FAILED' as const,
        contactId: contact.id,
        sentById: userId,
        smsFreshId: result.messageId,
        templateName: templateId,
        parameters: parameters ? JSON.stringify(parameters) : undefined,
        mediaUrl,
        mediaType,
        sentAt: result.success ? new Date() : undefined
      }))

      await prisma.message.createMany({
        data: messageData
      })

      return {
        success: result.success,
        totalProcessed: contacts.length,
        successCount: result.success ? contacts.length : 0,
        failureCount: result.success ? 0 : contacts.length,
        errors: result.success ? [] : [result.error || 'Unknown error'],
        messageId: result.messageId
      }
    } catch (error) {
      logger.error('Immediate message sending failed:', error)
      return {
        success: false,
        totalProcessed: contacts.length,
        successCount: 0,
        failureCount: contacts.length,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      }
    }
  }

  /**
   * Update campaign contact statuses
   */
  private async updateContactStatuses(
    campaignId: string,
    contactIds: string[],
    status: 'SENT' | 'FAILED' | 'DELIVERED' | 'READ' | 'REPLIED',
    messageId?: string
  ): Promise<void> {
    const updateData: any = {
      status,
      sentAt: status === 'SENT' ? new Date() : undefined,
      deliveredAt: status === 'DELIVERED' ? new Date() : undefined,
      readAt: status === 'READ' ? new Date() : undefined,
      repliedAt: status === 'REPLIED' ? new Date() : undefined
    }

    await prisma.campaignContact.updateMany({
      where: {
        campaignId,
        contactId: { in: contactIds }
      },
      data: updateData
    })
  }

  /**
   * Create message records for tracking
   */
  private async createMessageRecords(
    contacts: Array<{ id: string; phone: string; name?: string }>,
    params: BulkMessageParams,
    status: 'SENT' | 'FAILED',
    messageId?: string,
    userId?: string
  ): Promise<void> {
    const messageData = contacts.map(contact => ({
      type: params.type,
      direction: 'OUTBOUND' as const,
      content: params.message,
      status,
      contactId: contact.id,
      campaignId: params.campaignId,
      sentById: userId || params.userId,
      smsFreshId: messageId,
      templateName: params.templateName,
      parameters: params.parameters ? JSON.stringify(params.parameters) : undefined,
      mediaUrl: params.mediaUrl,
      mediaType: params.mediaType,
      sentAt: status === 'SENT' ? new Date() : undefined
    }))

    await prisma.message.createMany({
      data: messageData
    })
  }

  /**
   * Get campaign execution status
   */
  async getCampaignStatus(campaignId: string): Promise<{
    status: string
    totalContacts: number
    sentCount: number
    deliveredCount: number
    failedCount: number
    pendingCount: number
  }> {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        contacts: true,
        _count: {
          select: { contacts: true }
        }
      }
    })

    if (!campaign) {
      throw new Error('Campaign not found')
    }

    const sentCount = campaign.contacts.filter(cc => cc.status === 'SENT').length
    const deliveredCount = campaign.contacts.filter(cc => cc.status === 'DELIVERED').length
    const failedCount = campaign.contacts.filter(cc => cc.status === 'FAILED').length
    const pendingCount = campaign.contacts.filter(cc => cc.status === 'PENDING').length

    return {
      status: campaign.status,
      totalContacts: campaign._count.contacts,
      sentCount,
      deliveredCount,
      failedCount,
      pendingCount
    }
  }

  /**
   * Execute automated campaign with post-processing automation
   * Requirements: 6.2, 6.3, 6.5
   */
  async executeAutomatedCampaign(
    campaignId: string, 
    userId: string, 
    automationConfig: CampaignAutomationConfig = {
      markProcessedContacts: true,
      autoProgressToNextDataSet: true,
      generatePerformanceReport: true,
      triggerFollowUpCampaigns: false,
      leadScoringUpdate: true
    }
  ): Promise<CampaignExecutionResult> {
    try {
      logger.info(`Starting automated campaign execution: ${campaignId}`)

      // Execute the campaign
      const result = await this.executeCampaign(campaignId, userId)

      if (result.success && result.totalProcessed > 0) {
        // Mark processed contacts to prevent duplicates
        if (automationConfig.markProcessedContacts) {
          await this.markProcessedContacts(campaignId)
        }

        // Generate performance report
        if (automationConfig.generatePerformanceReport) {
          await this.generateCampaignReport(campaignId)
        }

        // Update lead scoring
        if (automationConfig.leadScoringUpdate) {
          await this.updateLeadScoresForCampaign(campaignId)
        }

        // Auto-progress to next data set
        let nextDataSetId: string | undefined
        if (automationConfig.autoProgressToNextDataSet) {
          nextDataSetId = await this.progressToNextDataSet(campaignId)
        }

        // Trigger follow-up campaigns if configured
        if (automationConfig.triggerFollowUpCampaigns) {
          await this.triggerFollowUpCampaigns(campaignId)
        }

        return {
          ...result,
          automationTriggered: true,
          nextDataSetId
        }
      }

      return result
    } catch (error) {
      logger.error(`Automated campaign execution failed: ${campaignId}`, error)
      return {
        success: false,
        totalProcessed: 0,
        successCount: 0,
        failureCount: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        automationTriggered: false
      }
    }
  }

  /**
   * Mark processed contact data to prevent duplicates
   * Requirement: 6.2
   */
  private async markProcessedContacts(campaignId: string): Promise<void> {
    try {
      const campaign = await prisma.campaign.findUnique({
        where: { id: campaignId },
        include: {
          contacts: {
            where: { status: { in: ['SENT', 'DELIVERED'] } },
            include: { contact: true }
          }
        }
      })

      if (!campaign) return

      // Update contacts with processed flag and campaign reference
      const contactIds = campaign.contacts.map(cc => cc.contactId)
      
      await prisma.contact.updateMany({
        where: { id: { in: contactIds } },
        data: { 
          lastContact: new Date(),
          updatedAt: new Date()
        }
      })

      // Create processing record for tracking
      await prisma.dataImport.create({
        data: {
          filename: `campaign_${campaignId}_processed`,
          totalRows: campaign.contacts.length,
          processedRows: campaign.contacts.length,
          successRows: campaign.contacts.filter(cc => cc.status === 'SENT' || cc.status === 'DELIVERED').length,
          errorRows: campaign.contacts.filter(cc => cc.status === 'FAILED').length,
          status: 'COMPLETED'
        }
      })

      logger.info(`Marked ${contactIds.length} contacts as processed for campaign ${campaignId}`)
    } catch (error) {
      logger.error(`Failed to mark processed contacts for campaign ${campaignId}:`, error)
    }
  }

  /**
   * Automatically progress to next data set after campaign completion
   * Requirement: 6.3
   */
  private async progressToNextDataSet(campaignId: string): Promise<string | undefined> {
    try {
      // Find unprocessed contacts for similar campaigns
      const campaign = await prisma.campaign.findUnique({
        where: { id: campaignId }
      })

      if (!campaign) return undefined

      // Get contacts that haven't been contacted recently (more than 7 days)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      
      const nextDataSet = await prisma.contact.findMany({
        where: {
          isActive: true,
          OR: [
            { lastContact: null },
            { lastContact: { lt: sevenDaysAgo } }
          ],
          // Exclude contacts from current campaign
          NOT: {
            campaigns: {
              some: { campaignId }
            }
          }
        },
        take: 1000, // Limit to reasonable batch size
        orderBy: { createdAt: 'asc' }
      })

      if (nextDataSet.length > 0) {
        // Create a new campaign with the next data set
        const nextCampaign = await prisma.campaign.create({
          data: {
            name: `${campaign.name} - Auto Next Set`,
            type: campaign.type,
            message: campaign.message,
            templateName: campaign.templateName,
            parameters: campaign.parameters,
            mediaUrl: campaign.mediaUrl,
            mediaType: campaign.mediaType,
            status: 'DRAFT',
            createdById: campaign.createdById
          }
        })

        // Add contacts to the new campaign
        const campaignContacts = nextDataSet.map(contact => ({
          campaignId: nextCampaign.id,
          contactId: contact.id
        }))

        await prisma.campaignContact.createMany({
          data: campaignContacts
        })

        logger.info(`Created next data set campaign ${nextCampaign.id} with ${nextDataSet.length} contacts`)
        return nextCampaign.id
      }

      return undefined
    } catch (error) {
      logger.error(`Failed to progress to next data set for campaign ${campaignId}:`, error)
      return undefined
    }
  }

  /**
   * Generate automated campaign performance report
   * Requirement: 6.5
   */
  private async generateCampaignReport(campaignId: string): Promise<void> {
    try {
      const campaign = await prisma.campaign.findUnique({
        where: { id: campaignId },
        include: {
          contacts: true,
          messages: true,
          createdBy: true
        }
      })

      if (!campaign) return

      const report = {
        campaignId,
        campaignName: campaign.name,
        executedAt: new Date().toISOString(),
        totalContacts: campaign.contacts.length,
        sentCount: campaign.totalSent,
        deliveredCount: campaign.totalDelivered,
        failedCount: campaign.totalFailed,
        replyCount: campaign.totalReplies,
        deliveryRate: campaign.totalSent > 0 ? (campaign.totalDelivered / campaign.totalSent * 100).toFixed(2) : '0',
        responseRate: campaign.totalSent > 0 ? (campaign.totalReplies / campaign.totalSent * 100).toFixed(2) : '0',
        executedBy: campaign.createdBy.name,
        type: campaign.type,
        templateUsed: campaign.templateName,
        mediaIncluded: !!campaign.mediaUrl,
        duration: campaign.sentAt && campaign.updatedAt 
          ? Math.round((campaign.updatedAt.getTime() - campaign.sentAt.getTime()) / 1000 / 60) 
          : 0,
        costEstimate: this.calculateCampaignCost(campaign.totalSent, campaign.type),
        recommendations: this.generateRecommendations(campaign)
      }

      // Store report in database (you could create a CampaignReport model)
      logger.info(`Generated performance report for campaign ${campaignId}:`, report)

      // Create activity record for the report
      await prisma.activity.create({
        data: {
          type: 'NOTE',
          title: `Campaign Report Generated`,
          description: `Performance report generated for campaign "${campaign.name}". Delivery Rate: ${report.deliveryRate}%, Response Rate: ${report.responseRate}%`,
          userId: campaign.createdById
        }
      })

    } catch (error) {
      logger.error(`Failed to generate campaign report for ${campaignId}:`, error)
    }
  }

  /**
   * Update lead scores based on campaign engagement
   */
  private async updateLeadScoresForCampaign(campaignId: string): Promise<void> {
    try {
      const campaignContacts = await prisma.campaignContact.findMany({
        where: { campaignId },
        include: {
          contact: {
            include: { leads: true }
          }
        }
      })

      for (const cc of campaignContacts) {
        if (cc.contact.leads.length > 0) {
          for (const lead of cc.contact.leads) {
            let scoreAdjustment = 0

            // Positive scoring for engagement
            if (cc.status === 'DELIVERED') scoreAdjustment += 5
            if (cc.status === 'READ') scoreAdjustment += 10
            if (cc.status === 'REPLIED') scoreAdjustment += 20

            // Negative scoring for failures
            if (cc.status === 'FAILED') scoreAdjustment -= 5

            if (scoreAdjustment !== 0) {
              // Update lead score (assuming there's a score field)
              await prisma.lead.update({
                where: { id: lead.id },
                data: { updatedAt: new Date() }
              })
            }
          }
        }
      }

      logger.info(`Updated lead scores for campaign ${campaignId}`)
    } catch (error) {
      logger.error(`Failed to update lead scores for campaign ${campaignId}:`, error)
    }
  }

  /**
   * Trigger follow-up campaigns based on engagement
   */
  private async triggerFollowUpCampaigns(campaignId: string): Promise<void> {
    try {
      const campaign = await prisma.campaign.findUnique({
        where: { id: campaignId },
        include: {
          contacts: {
            where: { status: 'REPLIED' },
            include: { contact: true }
          }
        }
      })

      if (!campaign || campaign.contacts.length === 0) return

      // Create follow-up campaign for engaged contacts
      const followUpCampaign = await prisma.campaign.create({
        data: {
          name: `${campaign.name} - Follow Up`,
          type: campaign.type,
          message: this.getFollowUpMessage(campaign.type),
          status: 'DRAFT',
          createdById: campaign.createdById
        }
      })

      // Add engaged contacts to follow-up campaign
      const followUpContacts = campaign.contacts.map(cc => ({
        campaignId: followUpCampaign.id,
        contactId: cc.contactId
      }))

      await prisma.campaignContact.createMany({
        data: followUpContacts
      })

      logger.info(`Created follow-up campaign ${followUpCampaign.id} for ${campaign.contacts.length} engaged contacts`)
    } catch (error) {
      logger.error(`Failed to trigger follow-up campaigns for ${campaignId}:`, error)
    }
  }

  /**
   * Calculate estimated campaign cost
   */
  private calculateCampaignCost(messageCount: number, type: string): number {
    // Rough cost estimates (adjust based on actual SMS/WhatsApp pricing)
    const costPerSMS = 0.05 // $0.05 per SMS
    const costPerWhatsApp = 0.03 // $0.03 per WhatsApp message
    
    return messageCount * (type === 'SMS' ? costPerSMS : costPerWhatsApp)
  }

  /**
   * Generate campaign recommendations
   */
  private generateRecommendations(campaign: any): string[] {
    const recommendations: string[] = []
    
    const deliveryRate = campaign.totalSent > 0 ? (campaign.totalDelivered / campaign.totalSent) : 0
    const responseRate = campaign.totalSent > 0 ? (campaign.totalReplies / campaign.totalSent) : 0

    if (deliveryRate < 0.8) {
      recommendations.push('Low delivery rate detected. Consider cleaning your contact list and removing invalid numbers.')
    }

    if (responseRate < 0.02) {
      recommendations.push('Low response rate. Consider A/B testing different message templates or timing.')
    }

    if (campaign.type === 'SMS' && responseRate > 0.05) {
      recommendations.push('Good SMS response rate. Consider switching to WhatsApp for richer media content.')
    }

    if (!campaign.templateName) {
      recommendations.push('Consider using message templates for better personalization and compliance.')
    }

    return recommendations
  }

  /**
   * Get follow-up message based on campaign type
   */
  private getFollowUpMessage(type: string): string {
    const messages = {
      SMS: 'Thank you for your interest! Our loan specialist will contact you within 24 hours to discuss your application.',
      WHATSAPP: 'Hi! Thanks for responding to our loan offer. We have competitive rates available. Would you like to schedule a quick call to discuss your requirements?'
    }
    
    return messages[type as keyof typeof messages] || messages.WHATSAPP
  }
}

// Singleton instance
let campaignExecutorInstance: CampaignExecutor | null = null

export function getCampaignExecutor(): CampaignExecutor {
  if (!campaignExecutorInstance) {
    campaignExecutorInstance = new CampaignExecutor()
  }
  return campaignExecutorInstance
}

/**
 * Execute automated campaign with full automation features
 * This is the main entry point for automated campaign execution
 */
export async function executeAutomatedCampaign(
  campaignId: string, 
  userId: string, 
  automationConfig?: CampaignAutomationConfig
): Promise<CampaignExecutionResult> {
  const executor = getCampaignExecutor()
  return executor.executeAutomatedCampaign(campaignId, userId, automationConfig)
}