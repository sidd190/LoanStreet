import { PrismaClient } from '@prisma/client'
import cron from 'node-cron'
import { getCronManager } from './cronJobs'
import { executeAutomatedCampaign } from './campaignExecutor'
import { updateLeadScoresFromDatabase } from './leadScoring'

const prisma = new PrismaClient()

export interface AutomationSchedule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'custom'
  time?: string // HH:MM format
  days?: number[] // Days of week (0-6, 0 = Sunday)
  cronExpression?: string // For custom schedules
}

export interface AutomationConditions {
  leadStatus?: string[]
  loanTypes?: string[]
  dateRange?: {
    field: 'createdAt' | 'updatedAt' | 'lastContact'
    operator: 'gt' | 'lt' | 'gte' | 'lte' | 'eq'
    value: string
  }
  contactTags?: string[]
  responseRate?: {
    operator: 'gt' | 'lt' | 'gte' | 'lte'
    value: number
  }
}

export interface AutomationAction {
  type: 'send_message' | 'update_lead_status' | 'assign_lead' | 'create_task' | 'update_contact_tags'
  config: {
    messageTemplate?: string
    messageType?: 'SMS' | 'WHATSAPP'
    newStatus?: string
    assignToUserId?: string
    taskTitle?: string
    taskDescription?: string
    tags?: string[]
  }
}

export interface AutomationRule {
  id: string
  name: string
  description?: string
  type: 'campaign' | 'followup' | 'data_processing' | 'lead_scoring'
  status: 'active' | 'paused' | 'draft'
  schedule: AutomationSchedule
  conditions: AutomationConditions
  actions: AutomationAction[]
  stats: {
    totalRuns: number
    successfulRuns: number
    lastRun?: string
    nextRun?: string
  }
  createdAt: string
  updatedAt: string
}

class AutomationService {
  private cronManager = getCronManager()
  private activeAutomations: Map<string, cron.ScheduledTask> = new Map()

  constructor() {
    this.initializeAutomations()
  }

  private async initializeAutomations() {
    try {
      const automations = await prisma.automation.findMany({
        where: { isActive: true }
      })

      for (const automation of automations) {
        await this.scheduleAutomation(automation)
      }

      console.log(`Initialized ${automations.length} active automations`)
    } catch (error) {
      console.error('Error initializing automations:', error)
    }
  }

  private async scheduleAutomation(automation: any) {
    const schedule = JSON.parse(automation.schedule) as AutomationSchedule
    const cronExpression = this.getCronExpression(schedule)

    if (!cron.validate(cronExpression)) {
      console.error(`Invalid cron expression for automation ${automation.id}: ${cronExpression}`)
      return
    }

    // Remove existing task if it exists
    if (this.activeAutomations.has(automation.id)) {
      this.activeAutomations.get(automation.id)?.destroy()
    }

    const task = cron.schedule(cronExpression, async () => {
      await this.executeAutomation(automation.id)
    }, {
      scheduled: false
    })

    this.activeAutomations.set(automation.id, task)
    task.start()

    // Update next run time
    await prisma.automation.update({
      where: { id: automation.id },
      data: { nextRun: this.getNextRunTime(cronExpression) }
    })

    console.log(`Scheduled automation: ${automation.name} (${cronExpression})`)
  }

  private getCronExpression(schedule: AutomationSchedule): string {
    if (schedule.cronExpression) {
      return schedule.cronExpression
    }

    const [hour, minute] = (schedule.time || '09:00').split(':').map(Number)

    switch (schedule.frequency) {
      case 'daily':
        return `${minute} ${hour} * * *`
      case 'weekly':
        const day = schedule.days?.[0] || 1 // Default to Monday
        return `${minute} ${hour} * * ${day}`
      case 'monthly':
        return `${minute} ${hour} 1 * *` // First day of month
      default:
        return `${minute} ${hour} * * *` // Default to daily
    }
  }

  private getNextRunTime(cronExpression: string): Date {
    // Simple next run calculation - in production use a proper cron parser
    const now = new Date()
    const nextRun = new Date(now.getTime() + 24 * 60 * 60 * 1000) // Default to 24 hours
    return nextRun
  }

  public async executeAutomation(automationId: string): Promise<boolean> {
    try {
      const automation = await prisma.automation.findUnique({
        where: { id: automationId }
      })

      if (!automation || !automation.isActive) {
        console.log(`Automation ${automationId} not found or inactive`)
        return false
      }

      // Update automation status to running
      await prisma.automation.update({
        where: { id: automationId },
        data: {
          totalRuns: { increment: 1 },
          lastRun: new Date()
        }
      })

      console.log(`Executing automation: ${automation.name}`)

      const conditions = JSON.parse(automation.conditions) as AutomationConditions
      const actions = JSON.parse(automation.actions) as AutomationAction[]

      // Get targets based on conditions
      const targets = await this.getAutomationTargets(conditions)
      console.log(`Found ${targets.length} targets for automation ${automation.name}`)

      // Execute actions for each target
      let successCount = 0
      for (const target of targets) {
        try {
          await this.executeAutomationActions(target, actions, automation.type)
          successCount++
        } catch (error) {
          console.error(`Error executing actions for target ${target.id}:`, error)
        }
      }

      // Update successful runs
      await prisma.automation.update({
        where: { id: automationId },
        data: {
          successfulRuns: { increment: successCount > 0 ? 1 : 0 },
          nextRun: this.getNextRunTime(this.getCronExpression(JSON.parse(automation.schedule)))
        }
      })

      console.log(`Completed automation ${automation.name}: ${successCount}/${targets.length} successful`)
      return true
    } catch (error) {
      console.error(`Error executing automation ${automationId}:`, error)
      return false
    }
  }

  private async getAutomationTargets(conditions: AutomationConditions) {
    const whereClause: any = {}

    // Lead status filter
    if (conditions.leadStatus && conditions.leadStatus.length > 0) {
      whereClause.status = { in: conditions.leadStatus }
    }

    // Loan type filter
    if (conditions.loanTypes && conditions.loanTypes.length > 0) {
      whereClause.loanType = { in: conditions.loanTypes }
    }

    // Date range filter
    if (conditions.dateRange) {
      const { field, operator, value } = conditions.dateRange
      const date = new Date(value)
      
      switch (operator) {
        case 'gt':
          whereClause[field] = { gt: date }
          break
        case 'lt':
          whereClause[field] = { lt: date }
          break
        case 'gte':
          whereClause[field] = { gte: date }
          break
        case 'lte':
          whereClause[field] = { lte: date }
          break
        case 'eq':
          whereClause[field] = date
          break
      }
    }

    // Get leads with contacts
    const leads = await prisma.lead.findMany({
      where: whereClause,
      include: {
        contact: true,
        assignedTo: true
      }
    })

    // Filter by contact tags if specified
    if (conditions.contactTags && conditions.contactTags.length > 0) {
      return leads.filter(lead => {
        if (!lead.contact?.tags) return false
        const contactTags = JSON.parse(lead.contact.tags) as string[]
        return conditions.contactTags!.some(tag => contactTags.includes(tag))
      })
    }

    return leads
  }

  private async executeAutomationActions(target: any, actions: AutomationAction[], automationType: string) {
    for (const action of actions) {
      try {
        switch (action.type) {
          case 'send_message':
            await this.sendAutomatedMessage(target, action.config)
            break
          case 'update_lead_status':
            await this.updateLeadStatus(target.id, action.config.newStatus!)
            break
          case 'assign_lead':
            await this.assignLead(target.id, action.config.assignToUserId!)
            break
          case 'create_task':
            await this.createTask(target.id, action.config)
            break
          case 'update_contact_tags':
            await this.updateContactTags(target.contactId, action.config.tags!)
            break
        }
      } catch (error) {
        console.error(`Error executing action ${action.type} for target ${target.id}:`, error)
      }
    }
  }

  private async sendAutomatedMessage(target: any, config: any) {
    if (!target.contact?.phone) return

    const message = this.personalizeMessage(config.messageTemplate, target)
    
    // Create message record
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

    console.log(`Sent automated message to ${target.name} (${target.contact.phone})`)
  }

  private personalizeMessage(template: string, target: any): string {
    return template
      .replace(/\{name\}/g, target.name || 'Customer')
      .replace(/\{loanType\}/g, target.loanType?.toLowerCase() || 'loan')
      .replace(/\{loanAmount\}/g, target.loanAmount?.toLocaleString() || '0')
      .replace(/\{phone\}/g, target.contact?.phone || '')
  }

  private async updateLeadStatus(leadId: string, newStatus: string) {
    await prisma.lead.update({
      where: { id: leadId },
      data: { status: newStatus, updatedAt: new Date() }
    })
  }

  private async assignLead(leadId: string, userId: string) {
    await prisma.lead.update({
      where: { id: leadId },
      data: { assignedToId: userId, updatedAt: new Date() }
    })
  }

  private async createTask(leadId: string, config: any) {
    await prisma.activity.create({
      data: {
        type: 'TASK',
        title: config.taskTitle || 'Follow up required',
        description: config.taskDescription,
        leadId: leadId,
        userId: 'system' // System-generated task
      }
    })
  }

  private async updateContactTags(contactId: string, newTags: string[]) {
    const contact = await prisma.contact.findUnique({
      where: { id: contactId }
    })

    if (contact) {
      const existingTags = contact.tags ? JSON.parse(contact.tags) : []
      const updatedTags = [...new Set([...existingTags, ...newTags])]
      
      await prisma.contact.update({
        where: { id: contactId },
        data: { tags: JSON.stringify(updatedTags) }
      })
    }
  }

  // Public methods for automation management
  public async createAutomation(data: Omit<AutomationRule, 'id' | 'stats' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const automation = await prisma.automation.create({
      data: {
        name: data.name,
        description: data.description,
        type: data.type,
        isActive: data.status === 'active',
        schedule: JSON.stringify(data.schedule),
        conditions: JSON.stringify(data.conditions),
        actions: JSON.stringify(data.actions)
      }
    })

    if (automation.isActive) {
      await this.scheduleAutomation(automation)
    }

    return automation.id
  }

  public async updateAutomation(id: string, data: Partial<AutomationRule>): Promise<boolean> {
    try {
      const updateData: any = {}
      
      if (data.name) updateData.name = data.name
      if (data.description !== undefined) updateData.description = data.description
      if (data.type) updateData.type = data.type
      if (data.status) updateData.isActive = data.status === 'active'
      if (data.schedule) updateData.schedule = JSON.stringify(data.schedule)
      if (data.conditions) updateData.conditions = JSON.stringify(data.conditions)
      if (data.actions) updateData.actions = JSON.stringify(data.actions)

      const automation = await prisma.automation.update({
        where: { id },
        data: updateData
      })

      // Reschedule if active
      if (automation.isActive) {
        await this.scheduleAutomation(automation)
      } else {
        // Remove from active automations
        if (this.activeAutomations.has(id)) {
          this.activeAutomations.get(id)?.destroy()
          this.activeAutomations.delete(id)
        }
      }

      return true
    } catch (error) {
      console.error('Error updating automation:', error)
      return false
    }
  }

  public async deleteAutomation(id: string): Promise<boolean> {
    try {
      // Remove from active automations
      if (this.activeAutomations.has(id)) {
        this.activeAutomations.get(id)?.destroy()
        this.activeAutomations.delete(id)
      }

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
      const automation = await prisma.automation.update({
        where: { id },
        data: { isActive }
      })

      if (isActive) {
        await this.scheduleAutomation(automation)
      } else {
        if (this.activeAutomations.has(id)) {
          this.activeAutomations.get(id)?.destroy()
          this.activeAutomations.delete(id)
        }
      }

      return true
    } catch (error) {
      console.error('Error toggling automation:', error)
      return false
    }
  }

  public async getAutomations(): Promise<AutomationRule[]> {
    const automations = await prisma.automation.findMany({
      orderBy: { createdAt: 'desc' }
    })

    return automations.map(automation => ({
      id: automation.id,
      name: automation.name,
      description: automation.description || '',
      type: automation.type as any,
      status: automation.isActive ? 'active' : 'paused',
      schedule: JSON.parse(automation.schedule),
      conditions: JSON.parse(automation.conditions),
      actions: JSON.parse(automation.actions),
      stats: {
        totalRuns: automation.totalRuns,
        successfulRuns: automation.successfulRuns,
        lastRun: automation.lastRun?.toISOString(),
        nextRun: automation.nextRun?.toISOString()
      },
      createdAt: automation.createdAt.toISOString(),
      updatedAt: automation.updatedAt.toISOString()
    }))
  }

  public getAutomationStatus() {
    return {
      totalAutomations: this.activeAutomations.size,
      activeAutomations: Array.from(this.activeAutomations.keys())
    }
  }
}

// Singleton instance
let automationService: AutomationService | null = null

export function getAutomationService(): AutomationService {
  if (!automationService) {
    automationService = new AutomationService()
  }
  return automationService
}

// Initialize automation service when the module is imported
if (process.env.NODE_ENV !== 'test') {
  getAutomationService()
}