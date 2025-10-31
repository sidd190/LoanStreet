import { EventEmitter } from 'events'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export interface RetryPolicy {
  maxRetries: number
  backoffStrategy: 'linear' | 'exponential' | 'fixed'
  initialDelay: number // milliseconds
  maxDelay: number // milliseconds
  backoffMultiplier: number
  retryableErrors: string[] // Error patterns that should trigger retries
}

export interface RetryAttempt {
  id: string
  executionId: string
  automationId: string
  actionType: string
  targetId?: string
  attempt: number
  error: string
  scheduledAt: Date
  executedAt?: Date
  success: boolean
  nextRetryAt?: Date
}

export interface FailureNotification {
  id: string
  executionId: string
  automationId: string
  automationName: string
  type: 'execution_failed' | 'action_failed' | 'retry_exhausted' | 'system_error'
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  details: Record<string, any>
  createdAt: Date
  acknowledged: boolean
  acknowledgedBy?: string
  acknowledgedAt?: Date
}

class AutomationRetryManager extends EventEmitter {
  private retryQueue: Map<string, RetryAttempt> = new Map()
  private retryTimers: Map<string, NodeJS.Timeout> = new Map()
  private notifications: Map<string, FailureNotification> = new Map()

  constructor() {
    super()
    this.initializeRetryManager()
  }

  private async initializeRetryManager() {
    // Load pending retries from database (if persisted)
    // For now, we'll keep retries in memory
    console.log('✅ Automation retry manager initialized')
  }

  // Retry management
  async scheduleRetry(
    executionId: string,
    automationId: string,
    actionType: string,
    error: string,
    retryPolicy: RetryPolicy,
    currentAttempt: number = 0,
    targetId?: string
  ): Promise<string | null> {
    if (currentAttempt >= retryPolicy.maxRetries) {
      await this.handleRetryExhausted(executionId, automationId, actionType, error, targetId)
      return null
    }

    // Check if error is retryable
    if (!this.isRetryableError(error, retryPolicy.retryableErrors)) {
      await this.createFailureNotification({
        executionId,
        automationId,
        type: 'action_failed',
        severity: 'medium',
        message: `Non-retryable error in ${actionType}`,
        details: { error, targetId, actionType }
      })
      return null
    }

    const retryId = `retry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const delay = this.calculateRetryDelay(retryPolicy, currentAttempt)
    const scheduledAt = new Date(Date.now() + delay)

    const retryAttempt: RetryAttempt = {
      id: retryId,
      executionId,
      automationId,
      actionType,
      targetId,
      attempt: currentAttempt + 1,
      error,
      scheduledAt,
      success: false,
      nextRetryAt: currentAttempt + 1 < retryPolicy.maxRetries 
        ? new Date(scheduledAt.getTime() + this.calculateRetryDelay(retryPolicy, currentAttempt + 1))
        : undefined
    }

    this.retryQueue.set(retryId, retryAttempt)

    // Schedule the retry
    const timer = setTimeout(async () => {
      await this.executeRetry(retryId)
    }, delay)

    this.retryTimers.set(retryId, timer)

    console.log(`⏳ Scheduled retry ${retryAttempt.attempt}/${retryPolicy.maxRetries} for ${actionType} in ${delay}ms`)

    return retryId
  }

  private calculateRetryDelay(retryPolicy: RetryPolicy, attempt: number): number {
    let delay: number

    switch (retryPolicy.backoffStrategy) {
      case 'linear':
        delay = retryPolicy.initialDelay + (attempt * retryPolicy.initialDelay)
        break
      case 'exponential':
        delay = retryPolicy.initialDelay * Math.pow(retryPolicy.backoffMultiplier, attempt)
        break
      case 'fixed':
      default:
        delay = retryPolicy.initialDelay
        break
    }

    return Math.min(delay, retryPolicy.maxDelay)
  }

  private isRetryableError(error: string, retryableErrors: string[]): boolean {
    if (retryableErrors.length === 0) return true // Retry all errors if no specific patterns

    return retryableErrors.some(pattern => {
      try {
        const regex = new RegExp(pattern, 'i')
        return regex.test(error)
      } catch {
        // If pattern is not a valid regex, do simple string matching
        return error.toLowerCase().includes(pattern.toLowerCase())
      }
    })
  }

  private async executeRetry(retryId: string) {
    const retryAttempt = this.retryQueue.get(retryId)
    if (!retryAttempt) return

    try {
      retryAttempt.executedAt = new Date()
      
      console.log(`🔄 Executing retry ${retryAttempt.attempt} for ${retryAttempt.actionType}`)

      // Emit retry event for the automation engine to handle
      this.emit('retry:execute', {
        retryId,
        executionId: retryAttempt.executionId,
        automationId: retryAttempt.automationId,
        actionType: retryAttempt.actionType,
        targetId: retryAttempt.targetId,
        attempt: retryAttempt.attempt
      })

      // The automation engine should call markRetrySuccess or markRetryFailure
      
    } catch (error) {
      console.error(`❌ Error executing retry ${retryId}:`, error)
      await this.markRetryFailure(retryId, error instanceof Error ? error.message : String(error))
    } finally {
      // Clean up timer
      this.retryTimers.delete(retryId)
    }
  }

  async markRetrySuccess(retryId: string) {
    const retryAttempt = this.retryQueue.get(retryId)
    if (!retryAttempt) return

    retryAttempt.success = true
    console.log(`✅ Retry ${retryAttempt.attempt} succeeded for ${retryAttempt.actionType}`)

    // Remove from queue
    this.retryQueue.delete(retryId)

    // Emit success event
    this.emit('retry:success', {
      retryId,
      executionId: retryAttempt.executionId,
      automationId: retryAttempt.automationId,
      actionType: retryAttempt.actionType,
      attempt: retryAttempt.attempt
    })
  }

  async markRetryFailure(retryId: string, error: string) {
    const retryAttempt = this.retryQueue.get(retryId)
    if (!retryAttempt) return

    console.log(`❌ Retry ${retryAttempt.attempt} failed for ${retryAttempt.actionType}: ${error}`)

    // Remove from queue
    this.retryQueue.delete(retryId)

    // Emit failure event
    this.emit('retry:failure', {
      retryId,
      executionId: retryAttempt.executionId,
      automationId: retryAttempt.automationId,
      actionType: retryAttempt.actionType,
      attempt: retryAttempt.attempt,
      error
    })

    // Create failure notification
    await this.createFailureNotification({
      executionId: retryAttempt.executionId,
      automationId: retryAttempt.automationId,
      type: 'action_failed',
      severity: 'medium',
      message: `Retry ${retryAttempt.attempt} failed for ${retryAttempt.actionType}`,
      details: { error, targetId: retryAttempt.targetId, actionType: retryAttempt.actionType }
    })
  }

  private async handleRetryExhausted(
    executionId: string,
    automationId: string,
    actionType: string,
    error: string,
    targetId?: string
  ) {
    console.log(`🚫 Retry exhausted for ${actionType} in execution ${executionId}`)

    await this.createFailureNotification({
      executionId,
      automationId,
      type: 'retry_exhausted',
      severity: 'high',
      message: `All retry attempts exhausted for ${actionType}`,
      details: { error, targetId, actionType }
    })

    this.emit('retry:exhausted', {
      executionId,
      automationId,
      actionType,
      targetId,
      error
    })
  }

  // Failure notification management
  private async createFailureNotification(data: {
    executionId: string
    automationId: string
    type: FailureNotification['type']
    severity: FailureNotification['severity']
    message: string
    details: Record<string, any>
  }): Promise<string> {
    // Get automation name
    let automationName = 'Unknown Automation'
    try {
      const automation = await prisma.automation.findUnique({
        where: { id: data.automationId }
      })
      if (automation) {
        automationName = automation.name
      }
    } catch (error) {
      console.error('Error fetching automation name:', error)
    }

    const notificationId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const notification: FailureNotification = {
      id: notificationId,
      executionId: data.executionId,
      automationId: data.automationId,
      automationName,
      type: data.type,
      severity: data.severity,
      message: data.message,
      details: data.details,
      createdAt: new Date(),
      acknowledged: false
    }

    this.notifications.set(notificationId, notification)

    // Emit notification event
    this.emit('notification:created', notification)

    // Send alerts for high/critical severity
    if (data.severity === 'high' || data.severity === 'critical') {
      await this.sendAlert(notification)
    }

    console.log(`🔔 Created ${data.severity} notification: ${data.message}`)

    return notificationId
  }

  private async sendAlert(notification: FailureNotification) {
    try {
      // In a real implementation, you would send emails, Slack messages, etc.
      console.log(`🚨 ALERT [${notification.severity.toUpperCase()}]: ${notification.message}`)
      
      // Example: Send to admin users
      // await this.sendEmailAlert(notification)
      // await this.sendSlackAlert(notification)
      
      // For now, just emit an event that the UI can listen to
      this.emit('alert:sent', notification)
    } catch (error) {
      console.error('Error sending alert:', error)
    }
  }

  // Public API methods
  async cancelRetry(retryId: string): Promise<boolean> {
    const timer = this.retryTimers.get(retryId)
    if (timer) {
      clearTimeout(timer)
      this.retryTimers.delete(retryId)
    }

    const retryAttempt = this.retryQueue.get(retryId)
    if (retryAttempt) {
      this.retryQueue.delete(retryId)
      console.log(`❌ Cancelled retry ${retryAttempt.attempt} for ${retryAttempt.actionType}`)
      return true
    }

    return false
  }

  async acknowledgeNotification(notificationId: string, acknowledgedBy: string): Promise<boolean> {
    const notification = this.notifications.get(notificationId)
    if (!notification) return false

    notification.acknowledged = true
    notification.acknowledgedBy = acknowledgedBy
    notification.acknowledgedAt = new Date()

    this.emit('notification:acknowledged', notification)
    
    console.log(`✅ Notification ${notificationId} acknowledged by ${acknowledgedBy}`)
    return true
  }

  async dismissNotification(notificationId: string): Promise<boolean> {
    const notification = this.notifications.get(notificationId)
    if (!notification) return false

    this.notifications.delete(notificationId)
    this.emit('notification:dismissed', notification)
    
    console.log(`🗑️ Notification ${notificationId} dismissed`)
    return true
  }

  // Getters
  getPendingRetries(): RetryAttempt[] {
    return Array.from(this.retryQueue.values())
  }

  getActiveNotifications(): FailureNotification[] {
    return Array.from(this.notifications.values())
      .filter(notif => !notif.acknowledged)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }

  getAllNotifications(): FailureNotification[] {
    return Array.from(this.notifications.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }

  getRetryStats() {
    const pendingRetries = this.getPendingRetries()
    const notifications = this.getAllNotifications()
    
    return {
      pendingRetries: pendingRetries.length,
      activeNotifications: this.getActiveNotifications().length,
      totalNotifications: notifications.length,
      criticalAlerts: notifications.filter(n => n.severity === 'critical' && !n.acknowledged).length,
      highPriorityAlerts: notifications.filter(n => n.severity === 'high' && !n.acknowledged).length
    }
  }

  // Cleanup methods
  async cleanup() {
    // Clear all timers
    for (const timer of this.retryTimers.values()) {
      clearTimeout(timer)
    }
    this.retryTimers.clear()

    // Clear old notifications (keep last 1000)
    const allNotifications = this.getAllNotifications()
    if (allNotifications.length > 1000) {
      const toKeep = allNotifications.slice(0, 1000)
      this.notifications.clear()
      toKeep.forEach(notif => this.notifications.set(notif.id, notif))
    }

    console.log('🧹 Retry manager cleanup completed')
  }
}

// Singleton instance
let retryManager: AutomationRetryManager | null = null

export function getAutomationRetryManager(): AutomationRetryManager {
  if (!retryManager) {
    retryManager = new AutomationRetryManager()
  }
  return retryManager
}

// Initialize retry manager when the module is imported
if (process.env.NODE_ENV !== 'test') {
  getAutomationRetryManager()
}

export default AutomationRetryManager