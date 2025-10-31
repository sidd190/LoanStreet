import { EventEmitter } from 'events'
import cron from 'node-cron'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export interface TriggerEvent {
  type: string
  data: any
  timestamp: Date
  source: string
}

export interface TimeBasedTrigger {
  id: string
  automationId: string
  frequency: 'daily' | 'weekly' | 'monthly' | 'custom'
  time?: string // HH:MM format
  days?: number[] // Days of week (0-6, 0 = Sunday)
  cronExpression?: string
  timezone: string
  isActive: boolean
  nextRun?: Date
}

export interface EventBasedTrigger {
  id: string
  automationId: string
  eventType: 'new_lead' | 'message_received' | 'campaign_completed' | 'lead_status_changed' | 'contact_updated'
  conditions?: Record<string, any>
  isActive: boolean
}

export interface TriggerCondition {
  field: string
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'not_in' | 'exists' | 'not_exists'
  value?: any
  logicalOperator?: 'AND' | 'OR'
}

class AutomationTriggerManager extends EventEmitter {
  private scheduledTasks: Map<string, cron.ScheduledTask> = new Map()
  private eventTriggers: Map<string, EventBasedTrigger[]> = new Map()
  private isInitialized = false

  constructor() {
    super()
    this.setMaxListeners(100) // Increase listener limit for multiple automations
  }

  async initialize() {
    if (this.isInitialized) return

    try {
      await this.loadTimeBasedTriggers()
      await this.loadEventBasedTriggers()
      this.setupSystemEventListeners()
      
      this.isInitialized = true
      console.log('✅ Automation trigger manager initialized')
    } catch (error) {
      console.error('❌ Failed to initialize trigger manager:', error)
      throw error
    }
  }

  // Time-based trigger management
  private async loadTimeBasedTriggers() {
    const automations = await prisma.automation.findMany({
      where: { 
        isActive: true,
        schedule: { contains: '"type":"time"' }
      }
    })

    for (const automation of automations) {
      try {
        const trigger = JSON.parse(automation.schedule)
        if (trigger.type === 'time') {
          await this.scheduleTimeBasedTrigger({
            id: `time_${automation.id}`,
            automationId: automation.id,
            ...trigger.config,
            timezone: trigger.config.timezone || 'UTC',
            isActive: true
          })
        }
      } catch (error) {
        console.error(`Failed to load time trigger for automation ${automation.id}:`, error)
      }
    }
  }

  async scheduleTimeBasedTrigger(trigger: TimeBasedTrigger) {
    const cronExpression = this.buildCronExpression(trigger)
    
    if (!cron.validate(cronExpression)) {
      throw new Error(`Invalid cron expression: ${cronExpression}`)
    }

    // Remove existing task if it exists
    if (this.scheduledTasks.has(trigger.id)) {
      this.scheduledTasks.get(trigger.id)?.destroy()
    }

    const task = cron.schedule(cronExpression, async () => {
      try {
        console.log(`⏰ Time trigger fired: ${trigger.id}`)
        await this.fireTrigger('time_based', {
          triggerId: trigger.id,
          automationId: trigger.automationId,
          scheduledTime: new Date(),
          triggerConfig: trigger
        })
      } catch (error) {
        console.error(`Error executing time trigger ${trigger.id}:`, error)
      }
    }, {
      scheduled: false,
      timezone: trigger.timezone
    })

    this.scheduledTasks.set(trigger.id, task)
    
    if (trigger.isActive) {
      task.start()
      console.log(`⏰ Scheduled time trigger: ${trigger.id} (${cronExpression})`)
    }

    // Calculate and store next run time
    trigger.nextRun = this.calculateNextRun(cronExpression, trigger.timezone)
  }

  private buildCronExpression(trigger: TimeBasedTrigger): string {
    if (trigger.cronExpression) {
      return trigger.cronExpression
    }

    const [hour, minute] = (trigger.time || '09:00').split(':').map(Number)

    switch (trigger.frequency) {
      case 'daily':
        return `${minute} ${hour} * * *`
      case 'weekly':
        const days = trigger.days?.join(',') || '1' // Default to Monday
        return `${minute} ${hour} * * ${days}`
      case 'monthly':
        return `${minute} ${hour} 1 * *` // First day of month
      default:
        return `${minute} ${hour} * * *`
    }
  }

  private calculateNextRun(cronExpression: string, timezone: string): Date {
    // Simple next run calculation - in production use a proper cron parser like 'cron-parser'
    const now = new Date()
    
    // For now, just add appropriate intervals based on common patterns
    if (cronExpression.includes('* * *')) { // Daily
      return new Date(now.getTime() + 24 * 60 * 60 * 1000)
    } else if (cronExpression.includes('* * 1')) { // Weekly (assuming Monday)
      const daysUntilMonday = (8 - now.getDay()) % 7 || 7
      return new Date(now.getTime() + daysUntilMonday * 24 * 60 * 60 * 1000)
    } else if (cronExpression.includes('1 * *')) { // Monthly
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
      return nextMonth
    }
    
    return new Date(now.getTime() + 24 * 60 * 60 * 1000) // Default to 24 hours
  }

  // Event-based trigger management
  private async loadEventBasedTriggers() {
    const automations = await prisma.automation.findMany({
      where: { 
        isActive: true,
        schedule: { contains: '"type":"event"' }
      }
    })

    for (const automation of automations) {
      try {
        const trigger = JSON.parse(automation.schedule)
        if (trigger.type === 'event') {
          await this.registerEventBasedTrigger({
            id: `event_${automation.id}`,
            automationId: automation.id,
            eventType: trigger.config.event,
            conditions: trigger.config.conditions,
            isActive: true
          })
        }
      } catch (error) {
        console.error(`Failed to load event trigger for automation ${automation.id}:`, error)
      }
    }
  }

  async registerEventBasedTrigger(trigger: EventBasedTrigger) {
    if (!this.eventTriggers.has(trigger.eventType)) {
      this.eventTriggers.set(trigger.eventType, [])
    }

    const triggers = this.eventTriggers.get(trigger.eventType)!
    
    // Remove existing trigger with same ID
    const existingIndex = triggers.findIndex(t => t.id === trigger.id)
    if (existingIndex >= 0) {
      triggers.splice(existingIndex, 1)
    }

    if (trigger.isActive) {
      triggers.push(trigger)
      console.log(`🎯 Registered event trigger: ${trigger.id} for ${trigger.eventType}`)
    }
  }

  // System event listeners
  private setupSystemEventListeners() {
    // Listen for database changes that should trigger events
    this.setupLeadEventListeners()
    this.setupMessageEventListeners()
    this.setupCampaignEventListeners()
    this.setupContactEventListeners()
  }

  private setupLeadEventListeners() {
    // In a real implementation, you'd use database triggers or change streams
    // For now, we'll provide methods that should be called when these events occur
    
    this.on('lead:created', async (leadData) => {
      await this.processEventTriggers('new_lead', leadData)
    })

    this.on('lead:status_changed', async (leadData) => {
      await this.processEventTriggers('lead_status_changed', leadData)
    })
  }

  private setupMessageEventListeners() {
    this.on('message:received', async (messageData) => {
      await this.processEventTriggers('message_received', messageData)
    })

    this.on('message:sent', async (messageData) => {
      await this.processEventTriggers('message_sent', messageData)
    })
  }

  private setupCampaignEventListeners() {
    this.on('campaign:completed', async (campaignData) => {
      await this.processEventTriggers('campaign_completed', campaignData)
    })

    this.on('campaign:started', async (campaignData) => {
      await this.processEventTriggers('campaign_started', campaignData)
    })
  }

  private setupContactEventListeners() {
    this.on('contact:updated', async (contactData) => {
      await this.processEventTriggers('contact_updated', contactData)
    })

    this.on('contact:created', async (contactData) => {
      await this.processEventTriggers('contact_created', contactData)
    })
  }

  // Event processing
  private async processEventTriggers(eventType: string, eventData: any) {
    const triggers = this.eventTriggers.get(eventType) || []
    
    for (const trigger of triggers) {
      try {
        if (await this.evaluateEventConditions(trigger, eventData)) {
          console.log(`🎯 Event trigger fired: ${trigger.id} for ${eventType}`)
          await this.fireTrigger('event_based', {
            triggerId: trigger.id,
            automationId: trigger.automationId,
            eventType,
            eventData,
            triggerConfig: trigger
          })
        }
      } catch (error) {
        console.error(`Error processing event trigger ${trigger.id}:`, error)
      }
    }
  }

  private async evaluateEventConditions(trigger: EventBasedTrigger, eventData: any): Promise<boolean> {
    if (!trigger.conditions) return true

    // Simple condition evaluation - can be extended for complex logic
    for (const [field, condition] of Object.entries(trigger.conditions)) {
      if (!this.evaluateCondition(eventData[field], condition)) {
        return false
      }
    }

    return true
  }

  private evaluateCondition(value: any, condition: any): boolean {
    if (typeof condition === 'object' && condition !== null) {
      // Handle operators like { $gt: 100 }, { $in: ['value1', 'value2'] }
      for (const [operator, operand] of Object.entries(condition)) {
        switch (operator) {
          case '$eq':
            return value === operand
          case '$ne':
            return value !== operand
          case '$gt':
            return value > operand
          case '$gte':
            return value >= operand
          case '$lt':
            return value < operand
          case '$lte':
            return value <= operand
          case '$in':
            return Array.isArray(operand) && operand.includes(value)
          case '$nin':
            return Array.isArray(operand) && !operand.includes(value)
          case '$exists':
            return operand ? value !== undefined : value === undefined
          case '$regex':
            return new RegExp(operand).test(String(value))
          default:
            return false
        }
      }
    } else {
      // Simple equality check
      return value === condition
    }

    return false
  }

  // Trigger firing
  private async fireTrigger(triggerType: 'time_based' | 'event_based', triggerData: any) {
    try {
      // Emit the trigger event for the automation engine to handle
      this.emit('automation:trigger', {
        type: triggerType,
        ...triggerData,
        timestamp: new Date()
      })

      // Log the trigger event
      await this.logTriggerEvent(triggerData)
    } catch (error) {
      console.error('Error firing trigger:', error)
    }
  }

  private async logTriggerEvent(triggerData: any) {
    try {
      // In a real implementation, you'd log to a triggers table
      console.log(`📝 Trigger logged:`, {
        triggerId: triggerData.triggerId,
        automationId: triggerData.automationId,
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      console.error('Error logging trigger event:', error)
    }
  }

  // Public API methods
  async createTimeBasedTrigger(trigger: Omit<TimeBasedTrigger, 'id'>): Promise<string> {
    const id = `time_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const fullTrigger: TimeBasedTrigger = { id, ...trigger }
    
    await this.scheduleTimeBasedTrigger(fullTrigger)
    return id
  }

  async createEventBasedTrigger(trigger: Omit<EventBasedTrigger, 'id'>): Promise<string> {
    const id = `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const fullTrigger: EventBasedTrigger = { id, ...trigger }
    
    await this.registerEventBasedTrigger(fullTrigger)
    return id
  }

  async updateTimeBasedTrigger(id: string, updates: Partial<TimeBasedTrigger>): Promise<boolean> {
    try {
      // Remove existing trigger
      if (this.scheduledTasks.has(id)) {
        this.scheduledTasks.get(id)?.destroy()
        this.scheduledTasks.delete(id)
      }

      // Get current trigger data (in real implementation, fetch from database)
      const currentTrigger = await this.getTimeBasedTrigger(id)
      if (!currentTrigger) return false

      const updatedTrigger = { ...currentTrigger, ...updates }
      await this.scheduleTimeBasedTrigger(updatedTrigger)
      
      return true
    } catch (error) {
      console.error('Error updating time-based trigger:', error)
      return false
    }
  }

  async updateEventBasedTrigger(id: string, updates: Partial<EventBasedTrigger>): Promise<boolean> {
    try {
      // Find and update the trigger in the event triggers map
      for (const [eventType, triggers] of this.eventTriggers.entries()) {
        const triggerIndex = triggers.findIndex(t => t.id === id)
        if (triggerIndex >= 0) {
          const updatedTrigger = { ...triggers[triggerIndex], ...updates }
          triggers[triggerIndex] = updatedTrigger
          return true
        }
      }
      return false
    } catch (error) {
      console.error('Error updating event-based trigger:', error)
      return false
    }
  }

  async deleteTrigger(id: string): Promise<boolean> {
    try {
      // Remove from scheduled tasks
      if (this.scheduledTasks.has(id)) {
        this.scheduledTasks.get(id)?.destroy()
        this.scheduledTasks.delete(id)
        return true
      }

      // Remove from event triggers
      for (const [eventType, triggers] of this.eventTriggers.entries()) {
        const triggerIndex = triggers.findIndex(t => t.id === id)
        if (triggerIndex >= 0) {
          triggers.splice(triggerIndex, 1)
          return true
        }
      }

      return false
    } catch (error) {
      console.error('Error deleting trigger:', error)
      return false
    }
  }

  async toggleTrigger(id: string, isActive: boolean): Promise<boolean> {
    try {
      // Handle time-based triggers
      if (this.scheduledTasks.has(id)) {
        const task = this.scheduledTasks.get(id)!
        if (isActive) {
          task.start()
        } else {
          task.stop()
        }
        return true
      }

      // Handle event-based triggers
      for (const [eventType, triggers] of this.eventTriggers.entries()) {
        const trigger = triggers.find(t => t.id === id)
        if (trigger) {
          trigger.isActive = isActive
          return true
        }
      }

      return false
    } catch (error) {
      console.error('Error toggling trigger:', error)
      return false
    }
  }

  // Utility methods
  private async getTimeBasedTrigger(id: string): Promise<TimeBasedTrigger | null> {
    // In real implementation, fetch from database
    // For now, return null as we don't have persistence for individual triggers
    return null
  }

  getScheduledTriggers(): string[] {
    return Array.from(this.scheduledTasks.keys())
  }

  getEventTriggers(): Record<string, EventBasedTrigger[]> {
    const result: Record<string, EventBasedTrigger[]> = {}
    for (const [eventType, triggers] of this.eventTriggers.entries()) {
      result[eventType] = [...triggers]
    }
    return result
  }

  getTriggerStatus() {
    return {
      scheduledTriggers: this.scheduledTasks.size,
      eventTriggers: Array.from(this.eventTriggers.values()).reduce((sum, triggers) => sum + triggers.length, 0),
      isInitialized: this.isInitialized
    }
  }

  // Event emission methods for external use
  async emitLeadCreated(leadData: any) {
    this.emit('lead:created', leadData)
  }

  async emitLeadStatusChanged(leadData: any) {
    this.emit('lead:status_changed', leadData)
  }

  async emitMessageReceived(messageData: any) {
    this.emit('message:received', messageData)
  }

  async emitMessageSent(messageData: any) {
    this.emit('message:sent', messageData)
  }

  async emitCampaignCompleted(campaignData: any) {
    this.emit('campaign:completed', campaignData)
  }

  async emitCampaignStarted(campaignData: any) {
    this.emit('campaign:started', campaignData)
  }

  async emitContactUpdated(contactData: any) {
    this.emit('contact:updated', contactData)
  }

  async emitContactCreated(contactData: any) {
    this.emit('contact:created', contactData)
  }
}

// Singleton instance
let triggerManager: AutomationTriggerManager | null = null

export function getAutomationTriggerManager(): AutomationTriggerManager {
  if (!triggerManager) {
    triggerManager = new AutomationTriggerManager()
  }
  return triggerManager
}

// Initialize trigger manager when the module is imported
if (process.env.NODE_ENV !== 'test') {
  const manager = getAutomationTriggerManager()
  manager.initialize().catch(console.error)
}

export default AutomationTriggerManager