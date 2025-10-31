import { webSocketManager, WebSocketMessage } from './server'
import Logger, { DataSource } from '../logger'

export interface NotificationEvent {
  id: string
  type: 'MESSAGE' | 'CAMPAIGN' | 'LEAD' | 'SYSTEM' | 'ERROR'
  title: string
  message: string
  data?: any
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  targetUsers?: string[]
  targetRoles?: string[]
  timestamp: string
  expiresAt?: string
}

export interface MessageEvent {
  type: 'MESSAGE_RECEIVED' | 'MESSAGE_SENT' | 'MESSAGE_STATUS_UPDATE'
  messageId: string
  contactId: string
  content?: string
  status?: string
  timestamp: string
}

export interface CampaignEvent {
  type: 'CAMPAIGN_STARTED' | 'CAMPAIGN_PROGRESS' | 'CAMPAIGN_COMPLETED' | 'CAMPAIGN_FAILED'
  campaignId: string
  campaignName: string
  progress?: {
    total: number
    sent: number
    delivered: number
    failed: number
    percentage: number
  }
  timestamp: string
}

export interface LeadEvent {
  type: 'LEAD_CREATED' | 'LEAD_UPDATED' | 'LEAD_ASSIGNED' | 'LEAD_CONVERTED'
  leadId: string
  contactId?: string
  assignedTo?: string
  status?: string
  score?: number
  timestamp: string
}

export interface SystemEvent {
  type: 'SYSTEM_ALERT' | 'SYSTEM_MAINTENANCE' | 'SYSTEM_ERROR'
  level: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL'
  message: string
  details?: any
  timestamp: string
}

export interface StatsUpdateEvent {
  type: 'STATS_UPDATE'
  data: {
    totalContacts: number
    totalCampaigns: number
    totalMessages: number
    totalLeads: number
    activeUsers: number
    responseRate: number
    conversionRate: number
  }
  timestamp: string
}

class WebSocketEventService {
  /**
   * Send notification to specific users or roles
   */
  sendNotification(notification: NotificationEvent): void {
    const message: WebSocketMessage = {
      type: 'NOTIFICATION',
      data: notification,
      timestamp: notification.timestamp
    }

    let sentCount = 0

    // Send to specific users if specified
    if (notification.targetUsers && notification.targetUsers.length > 0) {
      sentCount += webSocketManager.broadcastToUsers(notification.targetUsers, message)
    }

    // Send to specific roles if specified
    if (notification.targetRoles && notification.targetRoles.length > 0) {
      notification.targetRoles.forEach(role => {
        sentCount += webSocketManager.broadcastToRole(role, message)
      })
    }

    // If no specific targets, send to all admins for system notifications
    if (!notification.targetUsers && !notification.targetRoles && notification.type === 'SYSTEM') {
      sentCount += webSocketManager.broadcastToRole('ADMIN', message)
    }

    Logger.info(DataSource.WEBSOCKET, 'notification', `Sent notification ${notification.id} to ${sentCount} connections`)
  }

  /**
   * Broadcast message event
   */
  broadcastMessageEvent(event: MessageEvent): void {
    const message: WebSocketMessage = {
      type: event.type,
      data: event,
      timestamp: event.timestamp
    }

    // Broadcast to contact-specific room
    const sentCount = webSocketManager.broadcastToRoom(`contact:${event.contactId}`, message)
    
    Logger.info(DataSource.WEBSOCKET, 'message_event', `Broadcasted ${event.type} for contact ${event.contactId} to ${sentCount} connections`)
  }

  /**
   * Broadcast campaign event
   */
  broadcastCampaignEvent(event: CampaignEvent): void {
    const message: WebSocketMessage = {
      type: event.type,
      data: event,
      timestamp: event.timestamp
    }

    // Broadcast to all admin users
    const sentCount = webSocketManager.broadcastToRole('ADMIN', message)
    
    Logger.info(DataSource.WEBSOCKET, 'campaign_event', `Broadcasted ${event.type} for campaign ${event.campaignId} to ${sentCount} connections`)
  }

  /**
   * Broadcast lead event
   */
  broadcastLeadEvent(event: LeadEvent): void {
    const message: WebSocketMessage = {
      type: event.type,
      data: event,
      timestamp: event.timestamp
    }

    let sentCount = 0

    // Send to assigned user if specified
    if (event.assignedTo) {
      sentCount += webSocketManager.broadcastToUsers([event.assignedTo], message)
    }

    // Also send to all admins
    sentCount += webSocketManager.broadcastToRole('ADMIN', message)
    
    Logger.info(DataSource.WEBSOCKET, 'lead_event', `Broadcasted ${event.type} for lead ${event.leadId} to ${sentCount} connections`)
  }

  /**
   * Broadcast system event
   */
  broadcastSystemEvent(event: SystemEvent): void {
    const message: WebSocketMessage = {
      type: event.type,
      data: event,
      timestamp: event.timestamp
    }

    // Send system events to all admin users
    const sentCount = webSocketManager.broadcastToRole('ADMIN', message)
    
    Logger.info(DataSource.WEBSOCKET, 'system_event', `Broadcasted ${event.type} to ${sentCount} admin connections`)
  }

  /**
   * Broadcast dashboard stats update
   */
  broadcastStatsUpdate(event: StatsUpdateEvent): void {
    const message: WebSocketMessage = {
      type: 'STATS_UPDATE',
      data: event.data,
      timestamp: event.timestamp
    }

    // Send to all connected users
    const sentCount = webSocketManager.broadcastToAll(message)
    
    Logger.info(DataSource.WEBSOCKET, 'stats_update', `Broadcasted stats update to ${sentCount} connections`)
  }

  /**
   * Send typing indicator
   */
  sendTypingIndicator(contactId: string, userId: string, userName: string, isTyping: boolean): void {
    const message: WebSocketMessage = {
      type: isTyping ? 'TYPING_START' : 'TYPING_STOP',
      data: {
        contactId,
        userId,
        userName,
        isTyping
      },
      timestamp: new Date().toISOString()
    }

    // Broadcast to contact-specific room, excluding the sender
    const userConnections = Array.from(webSocketManager.getStats().roomStats)
      .find(room => room.room === `user:${userId}`)

    webSocketManager.broadcastToRoom(`contact:${contactId}`, message, 
      userConnections ? [`user:${userId}`] : [])
  }

  /**
   * Send real-time message status update
   */
  sendMessageStatusUpdate(messageId: string, contactId: string, status: string): void {
    const event: MessageEvent = {
      type: 'MESSAGE_STATUS_UPDATE',
      messageId,
      contactId,
      status,
      timestamp: new Date().toISOString()
    }

    this.broadcastMessageEvent(event)
  }

  /**
   * Send new message notification
   */
  sendNewMessageNotification(messageId: string, contactId: string, content: string, fromContact: boolean = true): void {
    const event: MessageEvent = {
      type: 'MESSAGE_RECEIVED',
      messageId,
      contactId,
      content,
      timestamp: new Date().toISOString()
    }

    this.broadcastMessageEvent(event)

    // Also send as notification if from contact
    if (fromContact) {
      const notification: NotificationEvent = {
        id: `msg_${messageId}`,
        type: 'MESSAGE',
        title: 'New Message',
        message: `New message from contact: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`,
        data: { messageId, contactId },
        priority: 'MEDIUM',
        targetRoles: ['ADMIN', 'EMPLOYEE'],
        timestamp: new Date().toISOString()
      }

      this.sendNotification(notification)
    }
  }

  /**
   * Send campaign progress update
   */
  sendCampaignProgress(campaignId: string, campaignName: string, progress: CampaignEvent['progress']): void {
    const event: CampaignEvent = {
      type: 'CAMPAIGN_PROGRESS',
      campaignId,
      campaignName,
      progress,
      timestamp: new Date().toISOString()
    }

    this.broadcastCampaignEvent(event)
  }

  /**
   * Send lead assignment notification
   */
  sendLeadAssignment(leadId: string, assignedTo: string, contactId?: string): void {
    const event: LeadEvent = {
      type: 'LEAD_ASSIGNED',
      leadId,
      contactId,
      assignedTo,
      timestamp: new Date().toISOString()
    }

    this.broadcastLeadEvent(event)

    // Send notification to assigned user
    const notification: NotificationEvent = {
      id: `lead_assign_${leadId}`,
      type: 'LEAD',
      title: 'Lead Assigned',
      message: `A new lead has been assigned to you`,
      data: { leadId, contactId },
      priority: 'HIGH',
      targetUsers: [assignedTo],
      timestamp: new Date().toISOString()
    }

    this.sendNotification(notification)
  }

  /**
   * Send system alert
   */
  sendSystemAlert(level: SystemEvent['level'], message: string, details?: any): void {
    const event: SystemEvent = {
      type: 'SYSTEM_ALERT',
      level,
      message,
      details,
      timestamp: new Date().toISOString()
    }

    this.broadcastSystemEvent(event)

    // Also send as notification for warnings and errors
    if (level === 'WARNING' || level === 'ERROR' || level === 'CRITICAL') {
      const notification: NotificationEvent = {
        id: `system_${Date.now()}`,
        type: 'SYSTEM',
        title: `System ${level}`,
        message,
        data: details,
        priority: level === 'CRITICAL' ? 'URGENT' : level === 'ERROR' ? 'HIGH' : 'MEDIUM',
        targetRoles: ['ADMIN'],
        timestamp: new Date().toISOString()
      }

      this.sendNotification(notification)
    }
  }

  /**
   * Get event service statistics
   */
  getStats(): {
    webSocketStats: any
    timestamp: string
  } {
    return {
      webSocketStats: webSocketManager.getStats(),
      timestamp: new Date().toISOString()
    }
  }
}

// Export singleton instance
export const webSocketEventService = new WebSocketEventService()
export default webSocketEventService