import { webSocketEventService, NotificationEvent } from './websocket/events'
import Logger, { DataSource } from './logger'

export interface NotificationPreferences {
  userId: string
  enableBrowserNotifications: boolean
  enableInAppNotifications: boolean
  enableEmailNotifications: boolean
  notificationTypes: {
    messages: boolean
    campaigns: boolean
    leads: boolean
    system: boolean
  }
  quietHours: {
    enabled: boolean
    startTime: string // HH:MM format
    endTime: string   // HH:MM format
  }
}

export interface StoredNotification extends NotificationEvent {
  isRead: boolean
  readAt?: string
  userId: string
}

class NotificationService {
  private notifications: Map<string, StoredNotification> = new Map()
  private preferences: Map<string, NotificationPreferences> = new Map()
  private readonly MAX_NOTIFICATIONS = 100

  constructor() {
    this.loadPreferences()
    this.setupCleanupInterval()
  }

  /**
   * Send notification to users
   */
  async sendNotification(notification: Omit<NotificationEvent, 'id' | 'timestamp'>): Promise<string> {
    const fullNotification: NotificationEvent = {
      ...notification,
      id: this.generateNotificationId(),
      timestamp: new Date().toISOString()
    }

    // Store notification for in-app display
    await this.storeNotification(fullNotification)

    // Send via WebSocket
    webSocketEventService.sendNotification(fullNotification)

    // Send browser notifications if enabled
    await this.sendBrowserNotifications(fullNotification)

    Logger.info(DataSource.WEBSOCKET, 'notification', `Sent notification: ${fullNotification.id}`)
    return fullNotification.id
  }

  /**
   * Send message notification
   */
  async sendMessageNotification(
    messageId: string,
    contactId: string,
    content: string,
    fromContact: boolean = true,
    targetUsers?: string[]
  ): Promise<string> {
    return this.sendNotification({
      type: 'MESSAGE',
      title: fromContact ? 'New Message Received' : 'Message Sent',
      message: `${fromContact ? 'From contact' : 'To contact'}: ${content.substring(0, 100)}${content.length > 100 ? '...' : ''}`,
      data: { messageId, contactId, fromContact },
      priority: fromContact ? 'MEDIUM' : 'LOW',
      targetUsers,
      targetRoles: fromContact ? ['ADMIN', 'EMPLOYEE'] : undefined
    })
  }

  /**
   * Send campaign notification
   */
  async sendCampaignNotification(
    campaignId: string,
    campaignName: string,
    type: 'STARTED' | 'COMPLETED' | 'FAILED',
    details?: any
  ): Promise<string> {
    const titles = {
      STARTED: 'Campaign Started',
      COMPLETED: 'Campaign Completed',
      FAILED: 'Campaign Failed'
    }

    const priorities = {
      STARTED: 'MEDIUM' as const,
      COMPLETED: 'MEDIUM' as const,
      FAILED: 'HIGH' as const
    }

    return this.sendNotification({
      type: 'CAMPAIGN',
      title: titles[type],
      message: `Campaign "${campaignName}" has ${type.toLowerCase()}`,
      data: { campaignId, campaignName, details },
      priority: priorities[type],
      targetRoles: ['ADMIN']
    })
  }

  /**
   * Send lead notification
   */
  async sendLeadNotification(
    leadId: string,
    type: 'CREATED' | 'ASSIGNED' | 'CONVERTED',
    assignedTo?: string,
    details?: any
  ): Promise<string> {
    const titles = {
      CREATED: 'New Lead Created',
      ASSIGNED: 'Lead Assigned',
      CONVERTED: 'Lead Converted'
    }

    return this.sendNotification({
      type: 'LEAD',
      title: titles[type],
      message: `Lead ${leadId} has been ${type.toLowerCase()}`,
      data: { leadId, assignedTo, details },
      priority: type === 'CONVERTED' ? 'HIGH' : 'MEDIUM',
      targetUsers: assignedTo ? [assignedTo] : undefined,
      targetRoles: ['ADMIN']
    })
  }

  /**
   * Send system notification
   */
  async sendSystemNotification(
    level: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL',
    message: string,
    details?: any
  ): Promise<string> {
    const priorities = {
      INFO: 'LOW' as const,
      WARNING: 'MEDIUM' as const,
      ERROR: 'HIGH' as const,
      CRITICAL: 'URGENT' as const
    }

    return this.sendNotification({
      type: 'SYSTEM',
      title: `System ${level}`,
      message,
      data: details,
      priority: priorities[level],
      targetRoles: ['ADMIN']
    })
  }

  /**
   * Get notifications for a user
   */
  getUserNotifications(userId: string, limit: number = 50, unreadOnly: boolean = false): StoredNotification[] {
    const userNotifications = Array.from(this.notifications.values())
      .filter(notification => 
        notification.userId === userId && 
        (!unreadOnly || !notification.isRead)
      )
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit)

    return userNotifications
  }

  /**
   * Mark notification as read
   */
  markAsRead(notificationId: string, userId: string): boolean {
    const notification = this.notifications.get(notificationId)
    if (notification && notification.userId === userId) {
      notification.isRead = true
      notification.readAt = new Date().toISOString()
      return true
    }
    return false
  }

  /**
   * Mark all notifications as read for a user
   */
  markAllAsRead(userId: string): number {
    let count = 0
    this.notifications.forEach(notification => {
      if (notification.userId === userId && !notification.isRead) {
        notification.isRead = true
        notification.readAt = new Date().toISOString()
        count++
      }
    })
    return count
  }

  /**
   * Delete notification
   */
  deleteNotification(notificationId: string, userId: string): boolean {
    const notification = this.notifications.get(notificationId)
    if (notification && notification.userId === userId) {
      this.notifications.delete(notificationId)
      return true
    }
    return false
  }

  /**
   * Get unread count for user
   */
  getUnreadCount(userId: string): number {
    return Array.from(this.notifications.values())
      .filter(notification => notification.userId === userId && !notification.isRead)
      .length
  }

  /**
   * Update user notification preferences
   */
  updatePreferences(userId: string, preferences: Partial<NotificationPreferences>): void {
    const current = this.preferences.get(userId) || this.getDefaultPreferences(userId)
    const updated = { ...current, ...preferences }
    this.preferences.set(userId, updated)
    this.savePreferences()
  }

  /**
   * Get user notification preferences
   */
  getPreferences(userId: string): NotificationPreferences {
    return this.preferences.get(userId) || this.getDefaultPreferences(userId)
  }

  /**
   * Check if user should receive notification based on preferences
   */
  private shouldSendNotification(userId: string, notification: NotificationEvent): boolean {
    const prefs = this.getPreferences(userId)

    // Check if notification type is enabled
    const typeMap = {
      MESSAGE: prefs.notificationTypes.messages,
      CAMPAIGN: prefs.notificationTypes.campaigns,
      LEAD: prefs.notificationTypes.leads,
      SYSTEM: prefs.notificationTypes.system,
      ERROR: prefs.notificationTypes.system
    }

    if (!typeMap[notification.type]) {
      return false
    }

    // Check quiet hours
    if (prefs.quietHours.enabled) {
      const now = new Date()
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
      
      if (this.isInQuietHours(currentTime, prefs.quietHours.startTime, prefs.quietHours.endTime)) {
        // Only allow urgent notifications during quiet hours
        return notification.priority === 'URGENT'
      }
    }

    return true
  }

  /**
   * Store notification for in-app display
   */
  private async storeNotification(notification: NotificationEvent): Promise<void> {
    const targetUsers = this.getTargetUsers(notification)

    targetUsers.forEach(userId => {
      if (this.shouldSendNotification(userId, notification)) {
        const storedNotification: StoredNotification = {
          ...notification,
          isRead: false,
          userId
        }

        this.notifications.set(`${notification.id}_${userId}`, storedNotification)
      }
    })

    // Cleanup old notifications
    this.cleanupOldNotifications()
  }

  /**
   * Send browser notifications
   */
  private async sendBrowserNotifications(notification: NotificationEvent): Promise<void> {
    const targetUsers = this.getTargetUsers(notification)

    targetUsers.forEach(userId => {
      const prefs = this.getPreferences(userId)
      if (prefs.enableBrowserNotifications && this.shouldSendNotification(userId, notification)) {
        // Browser notifications are handled on the client side
        // We just send the notification via WebSocket with a special flag
        webSocketEventService.sendNotification({
          ...notification,
          data: {
            ...notification.data,
            showBrowserNotification: true
          }
        })
      }
    })
  }

  /**
   * Get target users for notification
   */
  private getTargetUsers(notification: NotificationEvent): string[] {
    const users: string[] = []

    // Add specific target users
    if (notification.targetUsers) {
      users.push(...notification.targetUsers)
    }

    // Add users from target roles (this would need to be implemented with actual user data)
    // For now, we'll just return the specific users
    // In a real implementation, you'd query the database for users with the specified roles

    return users
  }

  /**
   * Check if current time is in quiet hours
   */
  private isInQuietHours(currentTime: string, startTime: string, endTime: string): boolean {
    const current = this.timeToMinutes(currentTime)
    const start = this.timeToMinutes(startTime)
    const end = this.timeToMinutes(endTime)

    if (start <= end) {
      return current >= start && current <= end
    } else {
      // Quiet hours span midnight
      return current >= start || current <= end
    }
  }

  /**
   * Convert time string to minutes since midnight
   */
  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number)
    return hours * 60 + minutes
  }

  /**
   * Generate unique notification ID
   */
  private generateNotificationId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Get default preferences for user
   */
  private getDefaultPreferences(userId: string): NotificationPreferences {
    return {
      userId,
      enableBrowserNotifications: true,
      enableInAppNotifications: true,
      enableEmailNotifications: false,
      notificationTypes: {
        messages: true,
        campaigns: true,
        leads: true,
        system: true
      },
      quietHours: {
        enabled: false,
        startTime: '22:00',
        endTime: '08:00'
      }
    }
  }

  /**
   * Load preferences from storage (in a real app, this would be from database)
   */
  private loadPreferences(): void {
    // In a real implementation, load from database
    // For now, we'll use in-memory storage
  }

  /**
   * Save preferences to storage
   */
  private savePreferences(): void {
    // In a real implementation, save to database
    // For now, we'll use in-memory storage
  }

  /**
   * Cleanup old notifications
   */
  private cleanupOldNotifications(): void {
    const notifications = Array.from(this.notifications.entries())
    if (notifications.length > this.MAX_NOTIFICATIONS) {
      // Sort by timestamp and keep only the most recent
      notifications
        .sort(([, a], [, b]) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
        .slice(0, notifications.length - this.MAX_NOTIFICATIONS)
        .forEach(([id]) => this.notifications.delete(id))
    }
  }

  /**
   * Setup cleanup interval
   */
  private setupCleanupInterval(): void {
    setInterval(() => {
      this.cleanupOldNotifications()
    }, 60000) // Cleanup every minute
  }

  /**
   * Get service statistics
   */
  getStats(): {
    totalNotifications: number
    totalUsers: number
    unreadNotifications: number
    notificationsByType: Record<string, number>
  } {
    const notifications = Array.from(this.notifications.values())
    const notificationsByType: Record<string, number> = {}

    notifications.forEach(notification => {
      notificationsByType[notification.type] = (notificationsByType[notification.type] || 0) + 1
    })

    return {
      totalNotifications: notifications.length,
      totalUsers: new Set(notifications.map(n => n.userId)).size,
      unreadNotifications: notifications.filter(n => !n.isRead).length,
      notificationsByType
    }
  }
}

// Export singleton instance
export const notificationService = new NotificationService()
export default notificationService