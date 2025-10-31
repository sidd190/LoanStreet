import { webSocketEventService } from './websocket/events'
import { notificationService } from './notificationService'
import dashboardStatsService from './dashboardStatsService'
import Logger, { DataSource } from './logger'

export interface DataSyncEvent {
  type: 'STATS_UPDATE' | 'MESSAGE_UPDATE' | 'CAMPAIGN_UPDATE' | 'LEAD_UPDATE' | 'CONTACT_UPDATE'
  entityId?: string
  data: any
  timestamp: string
  userId?: string
}

export interface StatsUpdate {
  totalContacts: number
  totalCampaigns: number
  totalMessages: number
  totalLeads: number
  activeUsers: number
  responseRate: number
  conversionRate: number
  recentActivity: any[]
}

export interface MessageUpdate {
  messageId: string
  contactId: string
  status: 'PENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED'
  content?: string
  timestamp: string
}

export interface CampaignUpdate {
  campaignId: string
  status: 'DRAFT' | 'SCHEDULED' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'FAILED'
  progress?: {
    total: number
    sent: number
    delivered: number
    failed: number
    percentage: number
  }
  timestamp: string
}

export interface LeadUpdate {
  leadId: string
  status: 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'CONVERTED' | 'LOST'
  assignedTo?: string
  score?: number
  timestamp: string
}

class LiveDataSyncService {
  private syncInterval: NodeJS.Timeout | null = null
  private isRunning = false
  private readonly SYNC_INTERVAL = 30000 // 30 seconds

  constructor() {
    this.setupEventHandlers()
  }

  /**
   * Start live data synchronization
   */
  start(): void {
    if (this.isRunning) {
      Logger.warn(DataSource.WEBSOCKET, 'live_sync', 'Live data sync already running')
      return
    }

    this.isRunning = true
    Logger.info(DataSource.WEBSOCKET, 'live_sync', 'Starting live data synchronization')

    // Start periodic stats updates
    this.syncInterval = setInterval(() => {
      this.syncDashboardStats()
    }, this.SYNC_INTERVAL)

    // Initial sync
    setTimeout(() => this.syncDashboardStats(), 1000)
  }

  /**
   * Stop live data synchronization
   */
  stop(): void {
    if (!this.isRunning) return

    this.isRunning = false
    Logger.info(DataSource.WEBSOCKET, 'live_sync', 'Stopping live data synchronization')

    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
    }
  }

  /**
   * Sync dashboard statistics
   */
  async syncDashboardStats(): Promise<void> {
    try {
      Logger.info(DataSource.WEBSOCKET, 'live_sync', 'Syncing dashboard statistics')

      // Get fresh stats
      const stats = await dashboardStatsService.getStats(false) // Force fresh data

      // Broadcast stats update
      webSocketEventService.broadcastStatsUpdate({
        type: 'STATS_UPDATE',
        data: stats,
        timestamp: new Date().toISOString()
      })

      Logger.success(DataSource.WEBSOCKET, 'live_sync', 'Dashboard stats synced successfully')
    } catch (error) {
      Logger.error(DataSource.WEBSOCKET, 'live_sync', 'Failed to sync dashboard stats', error)
    }
  }

  /**
   * Sync message status update
   */
  async syncMessageUpdate(messageUpdate: MessageUpdate): Promise<void> {
    try {
      Logger.info(DataSource.WEBSOCKET, 'live_sync', `Syncing message update: ${messageUpdate.messageId}`)

      // Broadcast message status update
      webSocketEventService.broadcastMessageEvent({
        type: 'MESSAGE_STATUS_UPDATE',
        messageId: messageUpdate.messageId,
        contactId: messageUpdate.contactId,
        status: messageUpdate.status,
        timestamp: messageUpdate.timestamp
      })

      // Send notification for failed messages
      if (messageUpdate.status === 'FAILED') {
        await notificationService.sendSystemNotification(
          'ERROR',
          `Message delivery failed for contact ${messageUpdate.contactId}`,
          { messageId: messageUpdate.messageId, contactId: messageUpdate.contactId }
        )
      }

      // Trigger stats update for message count changes
      this.triggerStatsUpdate()

      Logger.success(DataSource.WEBSOCKET, 'live_sync', `Message update synced: ${messageUpdate.messageId}`)
    } catch (error) {
      Logger.error(DataSource.WEBSOCKET, 'live_sync', 'Failed to sync message update', error)
    }
  }

  /**
   * Sync new message received
   */
  async syncNewMessage(messageId: string, contactId: string, content: string, fromContact: boolean = true): Promise<void> {
    try {
      Logger.info(DataSource.WEBSOCKET, 'live_sync', `Syncing new message: ${messageId}`)

      // Broadcast new message event
      webSocketEventService.broadcastMessageEvent({
        type: 'MESSAGE_RECEIVED',
        messageId,
        contactId,
        content,
        timestamp: new Date().toISOString()
      })

      // Send notification for incoming messages
      if (fromContact) {
        await notificationService.sendMessageNotification(
          messageId,
          contactId,
          content,
          true
        )
      }

      // Trigger stats update
      this.triggerStatsUpdate()

      Logger.success(DataSource.WEBSOCKET, 'live_sync', `New message synced: ${messageId}`)
    } catch (error) {
      Logger.error(DataSource.WEBSOCKET, 'live_sync', 'Failed to sync new message', error)
    }
  }

  /**
   * Sync campaign progress update
   */
  async syncCampaignUpdate(campaignUpdate: CampaignUpdate): Promise<void> {
    try {
      Logger.info(DataSource.WEBSOCKET, 'live_sync', `Syncing campaign update: ${campaignUpdate.campaignId}`)

      // Broadcast campaign event
      webSocketEventService.broadcastCampaignEvent({
        type: 'CAMPAIGN_PROGRESS',
        campaignId: campaignUpdate.campaignId,
        campaignName: `Campaign ${campaignUpdate.campaignId}`, // In real app, get actual name
        progress: campaignUpdate.progress,
        timestamp: campaignUpdate.timestamp
      })

      // Send notifications for campaign status changes
      if (campaignUpdate.status === 'COMPLETED') {
        await notificationService.sendCampaignNotification(
          campaignUpdate.campaignId,
          `Campaign ${campaignUpdate.campaignId}`,
          'COMPLETED',
          campaignUpdate.progress
        )
      } else if (campaignUpdate.status === 'FAILED') {
        await notificationService.sendCampaignNotification(
          campaignUpdate.campaignId,
          `Campaign ${campaignUpdate.campaignId}`,
          'FAILED',
          campaignUpdate.progress
        )
      }

      // Trigger stats update
      this.triggerStatsUpdate()

      Logger.success(DataSource.WEBSOCKET, 'live_sync', `Campaign update synced: ${campaignUpdate.campaignId}`)
    } catch (error) {
      Logger.error(DataSource.WEBSOCKET, 'live_sync', 'Failed to sync campaign update', error)
    }
  }

  /**
   * Sync lead update
   */
  async syncLeadUpdate(leadUpdate: LeadUpdate): Promise<void> {
    try {
      Logger.info(DataSource.WEBSOCKET, 'live_sync', `Syncing lead update: ${leadUpdate.leadId}`)

      // Broadcast lead event
      webSocketEventService.broadcastLeadEvent({
        type: 'LEAD_UPDATED',
        leadId: leadUpdate.leadId,
        assignedTo: leadUpdate.assignedTo,
        status: leadUpdate.status,
        score: leadUpdate.score,
        timestamp: leadUpdate.timestamp
      })

      // Send notifications for important lead changes
      if (leadUpdate.status === 'CONVERTED') {
        await notificationService.sendLeadNotification(
          leadUpdate.leadId,
          'CONVERTED',
          leadUpdate.assignedTo,
          { score: leadUpdate.score }
        )
      } else if (leadUpdate.assignedTo) {
        await notificationService.sendLeadNotification(
          leadUpdate.leadId,
          'ASSIGNED',
          leadUpdate.assignedTo,
          { status: leadUpdate.status, score: leadUpdate.score }
        )
      }

      // Trigger stats update
      this.triggerStatsUpdate()

      Logger.success(DataSource.WEBSOCKET, 'live_sync', `Lead update synced: ${leadUpdate.leadId}`)
    } catch (error) {
      Logger.error(DataSource.WEBSOCKET, 'live_sync', 'Failed to sync lead update', error)
    }
  }

  /**
   * Sync contact update
   */
  async syncContactUpdate(contactId: string, changes: any): Promise<void> {
    try {
      Logger.info(DataSource.WEBSOCKET, 'live_sync', `Syncing contact update: ${contactId}`)

      // Broadcast contact update to relevant users
      webSocketEventService.broadcastToRole('ADMIN', {
        type: 'CONTACT_UPDATED',
        data: {
          contactId,
          changes,
          timestamp: new Date().toISOString()
        }
      })

      // Trigger stats update if contact count might have changed
      if (changes.status || changes.isActive !== undefined) {
        this.triggerStatsUpdate()
      }

      Logger.success(DataSource.WEBSOCKET, 'live_sync', `Contact update synced: ${contactId}`)
    } catch (error) {
      Logger.error(DataSource.WEBSOCKET, 'live_sync', 'Failed to sync contact update', error)
    }
  }

  /**
   * Trigger immediate stats update
   */
  async triggerStatsUpdate(): Promise<void> {
    try {
      // Clear cache and sync fresh stats
      dashboardStatsService.clearCache()
      await this.syncDashboardStats()
    } catch (error) {
      Logger.error(DataSource.WEBSOCKET, 'live_sync', 'Failed to trigger stats update', error)
    }
  }

  /**
   * Setup event handlers for automatic syncing
   */
  private setupEventHandlers(): void {
    // In a real application, these would be triggered by database changes,
    // API calls, or other system events. For now, we'll provide the methods
    // that can be called when these events occur.
    
    Logger.info(DataSource.WEBSOCKET, 'live_sync', 'Event handlers set up for live data sync')
  }

  /**
   * Handle system events that require data sync
   */
  async handleSystemEvent(event: string, data: any): Promise<void> {
    try {
      switch (event) {
        case 'message_sent':
          await this.syncMessageUpdate({
            messageId: data.messageId,
            contactId: data.contactId,
            status: 'SENT',
            timestamp: new Date().toISOString()
          })
          break

        case 'message_received':
          await this.syncNewMessage(
            data.messageId,
            data.contactId,
            data.content,
            true
          )
          break

        case 'campaign_started':
          await this.syncCampaignUpdate({
            campaignId: data.campaignId,
            status: 'RUNNING',
            timestamp: new Date().toISOString()
          })
          break

        case 'campaign_progress':
          await this.syncCampaignUpdate({
            campaignId: data.campaignId,
            status: 'RUNNING',
            progress: data.progress,
            timestamp: new Date().toISOString()
          })
          break

        case 'lead_created':
          await this.syncLeadUpdate({
            leadId: data.leadId,
            status: 'NEW',
            timestamp: new Date().toISOString()
          })
          break

        case 'lead_assigned':
          await this.syncLeadUpdate({
            leadId: data.leadId,
            status: data.status || 'CONTACTED',
            assignedTo: data.assignedTo,
            timestamp: new Date().toISOString()
          })
          break

        case 'contact_updated':
          await this.syncContactUpdate(data.contactId, data.changes)
          break

        default:
          Logger.warn(DataSource.WEBSOCKET, 'live_sync', `Unknown system event: ${event}`)
      }
    } catch (error) {
      Logger.error(DataSource.WEBSOCKET, 'live_sync', `Failed to handle system event: ${event}`, error)
    }
  }

  /**
   * Get sync service status
   */
  getStatus(): {
    isRunning: boolean
    syncInterval: number
    lastSync: string
  } {
    return {
      isRunning: this.isRunning,
      syncInterval: this.SYNC_INTERVAL,
      lastSync: new Date().toISOString()
    }
  }
}

// Export singleton instance
export const liveDataSyncService = new LiveDataSyncService()
export default liveDataSyncService