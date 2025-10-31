import { PrismaClient } from '@prisma/client'
import cron from 'node-cron'
import { EventEmitter } from 'events'
import { getAutomationTriggerManager } from './automationTriggers'
import { getAutomationRetryManager, RetryPolicy } from './automationRetryManager'

const prisma = new PrismaClient()

export interface AutomationExecution {
  id: string
  automationId: string
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'
  startedAt: Date
  completedAt?: Date
  targetCount: number
  successCount: number
  failureCount: number
  errors: AutomationError[]
  logs: AutomationLog[]
}

export interface AutomationError {
  step: string
  targetId?: string
  error: string
  timestamp: Date
  retryCount: number
}

export interface AutomationLog {
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG'
  message: string
  timestamp: Date
  metadata?: Record<string, any>
}

export interface AutomationTrigger {
  type: 'time' | 'event'
  config: Record<string, any>
}

export interface AutomationCondition {
  field: string
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'not_in'
  value: any
  logicalOperator?: 'AND' | 'OR'
}

export interface AutomationAction {
  type: 'send_message' | 'update_lead_status' | 'assign_lead' | 'create_task' | 'update_tags' | 'wait'
  config: Record<string, any>
  retryPolicy?: {
    maxRetries: number
    backoffMultiplier: number
    initialDelay: number
  }
}

export interface AutomationRule {
  id: string
  name: string
  description?: string
  isActive: boolean
  trigger: AutomationTrigger
  conditions: AutomationCondition[]
  actions: AutomationAction[]
  createdAt: Date
  updatedAt: Date
}

class AutomationEngine extends EventEmitter {
  private scheduledTasks: Map<string, cron.ScheduledTask> = new Map()
  private runningExecutions: Map<string, AutomationExecution> = new Map()
  private eventListeners: Map<string, Function[]> = new Map()
  private triggerManager = getAutomationTriggerManager()
  private retryManager = getAutomationRetryManager()

  constructor() {
    super()
    this.initializeEngine()
  }

  private async initializeEngine() {
    try {
      // Initialize the trigger manager
      await this.triggerManager.initialize()

      // Listen for trigger events from the trigger manager
      this.triggerManager.on('automation:trigger', async (triggerData) => {
        await this.executeAutomation(triggerData.automationId, triggerData)
      })

      // Listen for retry events from the retry manager
      this.retryManager.on('retry:execute', async (retryData) => {
        await this.handleRetryExecution(retryData)
      })

      // Load and schedule all active automations (legacy support)
      const activeAutomations = await this.getActiveAutomations()
      
      for (const automation of activeAutomations) {
        if (automation.trigger.type === 'time') {
          await this.scheduleTimeBasedAutomation(automation)
        } else if (automation.trigger.type === 'event') {
          this.registerEventBasedAutomation(automation)
        }
      }

      console.log(`✅ Automation engine initialized with ${activeAutomations.length} active automations`)
    } catch (error) {
      console.error('❌ Failed to initialize automation engine:', error)
    }
  }

  private async getActiveAutomations(): Promise<AutomationRule[]> {
    const automations = await prisma.automation.findMany({
      where: { isActive: true }
    })

    return automations.map(automation => ({
      id: automation.id,
      name: automation.name,
      description: automation.description || undefined,
      isActive: automation.isActive,
      trigger: JSON.parse(automation.schedule), // Legacy field name
      conditions: JSON.parse(automation.conditions),
      actions: JSON.parse(automation.actions),
      createdAt: automation.createdAt,
      updatedAt: automation.updatedAt
    }))
  }

  // Time-based automation scheduling
  private async scheduleTimeBasedAutomation(automation: AutomationRule) {
    const { config } = automation.trigger
    const cronExpression = this.buildCronExpression(config)

    if (!cron.validate(cronExpression)) {
      console.error(`❌ Invalid cron expression for automation ${automation.id}: ${cronExpression}`)
      return
    }

    // Remove existing task if it exists
    if (this.scheduledTasks.has(automation.id)) {
      this.scheduledTasks.get(automation.id)?.destroy()
    }

    const task = cron.schedule(cronExpression, async () => {
      await this.executeAutomation(automation.id)
    }, {
      scheduled: false,
      timezone: 'UTC'
    })

    this.scheduledTasks.set(automation.id, task)
    task.start()

    console.log(`⏰ Scheduled automation: ${automation.name} (${cronExpression})`)
  }

  private buildCronExpression(config: any): string {
    if (config.cronExpression) {
      return config.cronExpression
    }

    const [hour, minute] = (config.time || '09:00').split(':').map(Number)

    switch (config.frequency) {
      case 'daily':
        return `${minute} ${hour} * * *`
      case 'weekly':
        const day = config.days?.[0] || 1
        return `${minute} ${hour} * * ${day}`
      case 'monthly':
        return `${minute} ${hour} 1 * *`
      default:
        return `${minute} ${hour} * * *`
    }
  }

  // Event-based automation registration
  private registerEventBasedAutomation(automation: AutomationRule) {
    const { config } = automation.trigger
    const eventType = config.event

    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, [])
    }

    const listener = async (eventData: any) => {
      // Check if event matches automation conditions
      if (this.matchesEventConditions(eventData, config.conditions)) {
        await this.executeAutomation(automation.id, eventData)
      }
    }

    this.eventListeners.get(eventType)!.push(listener)
    this.on(eventType, listener)

    console.log(`🎯 Registered event-based automation: ${automation.name} (${eventType})`)
  }

  private matchesEventConditions(eventData: any, conditions: any): boolean {
    if (!conditions) return true

    // Simple condition matching - can be extended for complex logic
    for (const [key, value] of Object.entries(conditions)) {
      if (eventData[key] !== value) {
        return false
      }
    }

    return true
  }

  // Main automation execution
  public async executeAutomation(automationId: string, triggerData?: any): Promise<string> {
    try {
      const automation = await this.getAutomationById(automationId)
      if (!automation) {
        throw new Error(`Automation ${automationId} not found`)
      }

      if (!automation.isActive) {
        throw new Error(`Automation ${automationId} is not active`)
      }

      const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      const execution: AutomationExecution = {
        id: executionId,
        automationId,
        status: 'PENDING',
        startedAt: new Date(),
        targetCount: 0,
        successCount: 0,
        failureCount: 0,
        errors: [],
        logs: []
      }

      this.runningExecutions.set(executionId, execution)
      this.emit('execution:started', { executionId, automationId })

      // Execute in background
      this.runAutomationExecution(execution, automation, triggerData)
        .catch(error => {
          console.error(`❌ Automation execution failed: ${error.message}`)
          execution.status = 'FAILED'
          execution.completedAt = new Date()
          execution.errors.push({
            step: 'execution',
            error: error.message,
            timestamp: new Date(),
            retryCount: 0
          })
          this.emit('execution:failed', { executionId, error: error.message })
        })

      return executionId
    } catch (error) {
      console.error(`❌ Failed to start automation execution: ${error}`)
      throw error
    }
  }

  private async runAutomationExecution(
    execution: AutomationExecution, 
    automation: AutomationRule, 
    triggerData?: any
  ) {
    try {
      execution.status = 'RUNNING'
      this.addLog(execution, 'INFO', `Starting automation: ${automation.name}`)

      // Get targets based on conditions
      const targets = await this.getAutomationTargets(automation.conditions, triggerData)
      execution.targetCount = targets.length

      this.addLog(execution, 'INFO', `Found ${targets.length} targets`)

      if (targets.length === 0) {
        execution.status = 'COMPLETED'
        execution.completedAt = new Date()
        this.addLog(execution, 'INFO', 'No targets found, automation completed')
        this.emit('execution:completed', { executionId: execution.id })
        return
      }

      // Execute actions for each target
      for (const target of targets) {
        try {
          await this.executeActionsForTarget(execution, automation.actions, target)
          execution.successCount++
        } catch (error) {
          execution.failureCount++
          execution.errors.push({
            step: 'target_execution',
            targetId: target.id,
            error: error instanceof Error ? error.message : String(error),
            timestamp: new Date(),
            retryCount: 0
          })
          this.addLog(execution, 'ERROR', `Failed to execute actions for target ${target.id}: ${error}`)
        }
      }

      execution.status = 'COMPLETED'
      execution.completedAt = new Date()
      
      this.addLog(execution, 'INFO', 
        `Automation completed: ${execution.successCount}/${execution.targetCount} successful`
      )

      // Update automation statistics
      await this.updateAutomationStats(automation.id, execution)

      this.emit('execution:completed', { 
        executionId: execution.id, 
        successCount: execution.successCount,
        failureCount: execution.failureCount
      })

    } catch (error) {
      execution.status = 'FAILED'
      execution.completedAt = new Date()
      execution.errors.push({
        step: 'execution',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
        retryCount: 0
      })
      this.addLog(execution, 'ERROR', `Automation execution failed: ${error}`)
      throw error
    }
  }

  private async getAutomationTargets(conditions: AutomationCondition[], triggerData?: any): Promise<any[]> {
    // Build where clause from conditions
    const whereClause: any = {}

    for (const condition of conditions) {
      const value = this.resolveConditionValue(condition.value, triggerData)
      
      switch (condition.operator) {
        case 'equals':
          whereClause[condition.field] = value
          break
        case 'not_equals':
          whereClause[condition.field] = { not: value }
          break
        case 'contains':
          whereClause[condition.field] = { contains: value }
          break
        case 'greater_than':
          whereClause[condition.field] = { gt: value }
          break
        case 'less_than':
          whereClause[condition.field] = { lt: value }
          break
        case 'in':
          whereClause[condition.field] = { in: Array.isArray(value) ? value : [value] }
          break
        case 'not_in':
          whereClause[condition.field] = { notIn: Array.isArray(value) ? value : [value] }
          break
      }
    }

    // Get leads with contacts (primary target type)
    const leads = await prisma.lead.findMany({
      where: whereClause,
      include: {
        contact: true,
        assignedTo: true
      }
    })

    return leads
  }

  private resolveConditionValue(value: any, triggerData?: any): any {
    if (typeof value === 'string' && value.startsWith('${') && value.endsWith('}')) {
      const key = value.slice(2, -1)
      return triggerData?.[key] || value
    }
    return value
  }

  private async executeActionsForTarget(
    execution: AutomationExecution, 
    actions: AutomationAction[], 
    target: any
  ) {
    for (let i = 0; i < actions.length; i++) {
      const action = actions[i]
      
      try {
        this.addLog(execution, 'INFO', 
          `Executing action ${i + 1}/${actions.length}: ${action.type} for target ${target.id}`
        )

        await this.executeAction(action, target, execution)

        // Handle wait action
        if (action.type === 'wait' && action.config.duration) {
          const waitTime = action.config.duration * 60 * 1000 // Convert minutes to milliseconds
          this.addLog(execution, 'INFO', `Waiting ${action.config.duration} minutes`)
          await new Promise(resolve => setTimeout(resolve, waitTime))
        }

      } catch (error) {
        const retryPolicy = action.retryPolicy || { maxRetries: 0, backoffMultiplier: 2, initialDelay: 1000 }
        
        if (retryPolicy.maxRetries > 0) {
          await this.retryAction(action, target, execution, retryPolicy, error)
        } else {
          throw error
        }
      }
    }
  }

  private async executeAction(action: AutomationAction, target: any, execution: AutomationExecution) {
    switch (action.type) {
      case 'send_message':
        await this.sendMessage(action.config, target)
        break
      case 'update_lead_status':
        await this.updateLeadStatus(action.config, target)
        break
      case 'assign_lead':
        await this.assignLead(action.config, target)
        break
      case 'create_task':
        await this.createTask(action.config, target)
        break
      case 'update_tags':
        await this.updateTags(action.config, target)
        break
      case 'wait':
        // Wait is handled in executeActionsForTarget
        break
      default:
        throw new Error(`Unknown action type: ${action.type}`)
    }
  }

  private async retryAction(
    action: AutomationAction, 
    target: any, 
    execution: AutomationExecution,
    retryPolicy: RetryPolicy,
    originalError: any
  ) {
    // Use the retry manager for more sophisticated retry handling
    const retryId = await this.retryManager.scheduleRetry(
      execution.id,
      execution.automationId,
      action.type,
      originalError instanceof Error ? originalError.message : String(originalError),
      retryPolicy,
      0,
      target.id
    )

    if (!retryId) {
      // Retry not scheduled (non-retryable error or max retries exceeded)
      throw originalError
    }

    // Return a promise that resolves when the retry completes
    return new Promise((resolve, reject) => {
      const successHandler = (retryData: any) => {
        if (retryData.retryId === retryId) {
          this.retryManager.off('retry:success', successHandler)
          this.retryManager.off('retry:failure', failureHandler)
          this.retryManager.off('retry:exhausted', exhaustedHandler)
          resolve(undefined)
        }
      }

      const failureHandler = (retryData: any) => {
        if (retryData.retryId === retryId) {
          this.retryManager.off('retry:success', successHandler)
          this.retryManager.off('retry:failure', failureHandler)
          this.retryManager.off('retry:exhausted', exhaustedHandler)
          reject(new Error(retryData.error))
        }
      }

      const exhaustedHandler = (retryData: any) => {
        if (retryData.executionId === execution.id && retryData.actionType === action.type) {
          this.retryManager.off('retry:success', successHandler)
          this.retryManager.off('retry:failure', failureHandler)
          this.retryManager.off('retry:exhausted', exhaustedHandler)
          reject(new Error(`All retry attempts exhausted: ${retryData.error}`))
        }
      }

      this.retryManager.on('retry:success', successHandler)
      this.retryManager.on('retry:failure', failureHandler)
      this.retryManager.on('retry:exhausted', exhaustedHandler)
    })
  }

  private async handleRetryExecution(retryData: any) {
    try {
      const execution = this.runningExecutions.get(retryData.executionId)
      if (!execution) {
        await this.retryManager.markRetryFailure(retryData.retryId, 'Execution not found')
        return
      }

      // Find the automation and action
      const automation = await this.getAutomationById(retryData.automationId)
      if (!automation) {
        await this.retryManager.markRetryFailure(retryData.retryId, 'Automation not found')
        return
      }

      const action = automation.actions.find(a => a.type === retryData.actionType)
      if (!action) {
        await this.retryManager.markRetryFailure(retryData.retryId, 'Action not found')
        return
      }

      // Find the target (simplified - in real implementation, you'd need to store target data)
      const targets = await this.getAutomationTargets(automation.conditions)
      const target = targets.find(t => t.id === retryData.targetId)
      
      if (!target) {
        await this.retryManager.markRetryFailure(retryData.retryId, 'Target not found')
        return
      }

      // Execute the action
      await this.executeAction(action, target, execution)
      
      // Mark retry as successful
      await this.retryManager.markRetrySuccess(retryData.retryId)
      
      this.addLog(execution, 'INFO', 
        `Retry attempt ${retryData.attempt} succeeded for ${retryData.actionType}`
      )

    } catch (error) {
      await this.retryManager.markRetryFailure(
        retryData.retryId, 
        error instanceof Error ? error.message : String(error)
      )
      
      const execution = this.runningExecutions.get(retryData.executionId)
      if (execution) {
        this.addLog(execution, 'ERROR', 
          `Retry attempt ${retryData.attempt} failed for ${retryData.actionType}: ${error}`
        )
      }
    }
  }

  // Action implementations
  private async sendMessage(config: any, target: any) {
    if (!target.contact?.phone) {
      throw new Error('Target has no phone number')
    }

    const message = this.personalizeMessage(config.messageTemplate, target)
    
    await prisma.message.create({
      data: {
        type: config.messageType || 'WHATSAPP',
        direction: 'OUTBOUND',
        content: message,
        contactId: target.contact.id,
        status: 'SENT',
        sentAt: new Date()
      }
    })
  }

  private personalizeMessage(template: string, target: any): string {
    return template
      .replace(/\{name\}/g, target.name || 'Customer')
      .replace(/\{loanType\}/g, target.loanType?.toLowerCase() || 'loan')
      .replace(/\{loanAmount\}/g, target.loanAmount?.toLocaleString() || '0')
      .replace(/\{phone\}/g, target.contact?.phone || '')
      .replace(/\{email\}/g, target.contact?.email || '')
  }

  private async updateLeadStatus(config: any, target: any) {
    await prisma.lead.update({
      where: { id: target.id },
      data: { 
        status: config.newStatus,
        updatedAt: new Date()
      }
    })
  }

  private async assignLead(config: any, target: any) {
    await prisma.lead.update({
      where: { id: target.id },
      data: { 
        assignedToId: config.assignToUserId,
        updatedAt: new Date()
      }
    })
  }

  private async createTask(config: any, target: any) {
    await prisma.activity.create({
      data: {
        type: 'TASK',
        title: config.taskTitle || 'Follow up required',
        description: config.taskDescription,
        leadId: target.id,
        userId: 'system'
      }
    })
  }

  private async updateTags(config: any, target: any) {
    if (!target.contact) return

    const contact = await prisma.contact.findUnique({
      where: { id: target.contact.id }
    })

    if (contact) {
      const existingTags = contact.tags ? JSON.parse(contact.tags) : []
      const newTags = config.tags || []
      const updatedTags = [...new Set([...existingTags, ...newTags])]
      
      await prisma.contact.update({
        where: { id: target.contact.id },
        data: { tags: JSON.stringify(updatedTags) }
      })
    }
  }

  // Utility methods
  private addLog(execution: AutomationExecution, level: AutomationLog['level'], message: string, metadata?: any) {
    execution.logs.push({
      level,
      message,
      timestamp: new Date(),
      metadata
    })
  }

  private async getAutomationById(id: string): Promise<AutomationRule | null> {
    const automation = await prisma.automation.findUnique({
      where: { id }
    })

    if (!automation) return null

    return {
      id: automation.id,
      name: automation.name,
      description: automation.description || undefined,
      isActive: automation.isActive,
      trigger: JSON.parse(automation.schedule),
      conditions: JSON.parse(automation.conditions),
      actions: JSON.parse(automation.actions),
      createdAt: automation.createdAt,
      updatedAt: automation.updatedAt
    }
  }

  private async updateAutomationStats(automationId: string, execution: AutomationExecution) {
    await prisma.automation.update({
      where: { id: automationId },
      data: {
        totalRuns: { increment: 1 },
        successfulRuns: { increment: execution.successCount > 0 ? 1 : 0 },
        lastRun: execution.startedAt,
        nextRun: this.calculateNextRun(automationId)
      }
    })
  }

  private async calculateNextRun(automationId: string): Promise<Date | null> {
    // Simple calculation - in production, use proper cron parser
    const now = new Date()
    return new Date(now.getTime() + 24 * 60 * 60 * 1000) // 24 hours from now
  }

  // Public API methods
  public async createAutomation(data: Omit<AutomationRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const automation = await prisma.automation.create({
      data: {
        name: data.name,
        description: data.description,
        isActive: data.isActive,
        schedule: JSON.stringify(data.trigger),
        conditions: JSON.stringify(data.conditions),
        actions: JSON.stringify(data.actions)
      }
    })

    if (automation.isActive) {
      const fullAutomation = await this.getAutomationById(automation.id)
      if (fullAutomation) {
        if (fullAutomation.trigger.type === 'time') {
          await this.scheduleTimeBasedAutomation(fullAutomation)
        } else {
          this.registerEventBasedAutomation(fullAutomation)
        }
      }
    }

    return automation.id
  }

  public async updateAutomation(id: string, updates: Partial<AutomationRule>): Promise<boolean> {
    try {
      const updateData: any = {}
      
      if (updates.name) updateData.name = updates.name
      if (updates.description !== undefined) updateData.description = updates.description
      if (updates.isActive !== undefined) updateData.isActive = updates.isActive
      if (updates.trigger) updateData.schedule = JSON.stringify(updates.trigger)
      if (updates.conditions) updateData.conditions = JSON.stringify(updates.conditions)
      if (updates.actions) updateData.actions = JSON.stringify(updates.actions)

      await prisma.automation.update({
        where: { id },
        data: updateData
      })

      // Reschedule automation
      await this.rescheduleAutomation(id)

      return true
    } catch (error) {
      console.error('Error updating automation:', error)
      return false
    }
  }

  public async deleteAutomation(id: string): Promise<boolean> {
    try {
      // Remove from scheduled tasks
      if (this.scheduledTasks.has(id)) {
        this.scheduledTasks.get(id)?.destroy()
        this.scheduledTasks.delete(id)
      }

      // Remove event listeners
      this.removeAllListeners(id)

      await prisma.automation.delete({
        where: { id }
      })

      return true
    } catch (error) {
      console.error('Error deleting automation:', error)
      return false
    }
  }

  public async toggleAutomation(id: string, isActive: boolean): Promise<boolean> {
    try {
      await prisma.automation.update({
        where: { id },
        data: { isActive }
      })

      await this.rescheduleAutomation(id)
      return true
    } catch (error) {
      console.error('Error toggling automation:', error)
      return false
    }
  }

  private async rescheduleAutomation(id: string) {
    // Remove existing schedule
    if (this.scheduledTasks.has(id)) {
      this.scheduledTasks.get(id)?.destroy()
      this.scheduledTasks.delete(id)
    }

    // Remove event listeners
    this.removeAllListeners(id)

    // Reschedule if active
    const automation = await this.getAutomationById(id)
    if (automation && automation.isActive) {
      if (automation.trigger.type === 'time') {
        await this.scheduleTimeBasedAutomation(automation)
      } else {
        this.registerEventBasedAutomation(automation)
      }
    }
  }

  public getExecutionStatus(executionId: string): AutomationExecution | null {
    return this.runningExecutions.get(executionId) || null
  }

  public getRunningExecutions(): AutomationExecution[] {
    return Array.from(this.runningExecutions.values())
  }

  public async cancelExecution(executionId: string): Promise<boolean> {
    const execution = this.runningExecutions.get(executionId)
    if (execution && execution.status === 'RUNNING') {
      execution.status = 'CANCELLED'
      execution.completedAt = new Date()
      this.addLog(execution, 'WARN', 'Execution cancelled by user')
      this.emit('execution:cancelled', { executionId })
      return true
    }
    return false
  }

  // Event triggering methods
  public triggerEvent(eventType: string, eventData: any) {
    this.emit(eventType, eventData)
  }

  public getEngineStatus() {
    return {
      scheduledAutomations: this.scheduledTasks.size,
      runningExecutions: this.runningExecutions.size,
      eventListeners: Array.from(this.eventListeners.keys())
    }
  }
}

// Singleton instance
let automationEngine: AutomationEngine | null = null

export function getAutomationEngine(): AutomationEngine {
  if (!automationEngine) {
    automationEngine = new AutomationEngine()
  }
  return automationEngine
}

// Initialize automation engine when the module is imported
if (process.env.NODE_ENV !== 'test') {
  getAutomationEngine()
}

export default AutomationEngine