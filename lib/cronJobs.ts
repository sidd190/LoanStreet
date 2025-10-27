import cron from 'node-cron'
import { PrismaClient } from '@prisma/client'
import { updateLeadScoresFromDatabase } from './leadScoring'

const prisma = new PrismaClient()

interface CronJobConfig {
  id: string
  name: string
  schedule: string
  handler: () => Promise<void>
  isActive: boolean
}

class CronJobManager {
  private jobs: Map<string, cron.ScheduledTask> = new Map()
  private configs: CronJobConfig[] = []

  constructor() {
    this.initializeJobs()
  }

  private async initializeJobs() {
    // Define all cron jobs
    this.configs = [
      {
        id: 'lead-scoring-update',
        name: 'Update Lead Scores',
        schedule: '0 2 * * *', // Daily at 2 AM
        handler: this.updateLeadScores,
        isActive: true
      },
      {
        id: 'welcome-message-automation',
        name: 'Send Welcome Messages',
        schedule: '*/5 * * * *', // Every 5 minutes
        handler: this.sendWelcomeMessages,
        isActive: true
      },
      {
        id: 'followup-automation',
        name: 'Send Follow-up Messages',
        schedule: '0 10 * * *', // Daily at 10 AM
        handler: this.sendFollowupMessages,
        isActive: true
      },
      {
        id: 'data-cleanup',
        name: 'Clean Old Data',
        schedule: '0 1 * * 0', // Weekly on Sunday at 1 AM
        handler: this.cleanupOldData,
        isActive: true
      },
      {
        id: 'campaign-status-update',
        name: 'Update Campaign Status',
        schedule: '*/10 * * * *', // Every 10 minutes
        handler: this.updateCampaignStatus,
        isActive: true
      }
    ]

    // Load job states from database
    await this.loadJobStatesFromDB()
    
    // Start active jobs
    this.startActiveJobs()
  }

  private async loadJobStatesFromDB() {
    try {
      const dbJobs = await prisma.cronJob.findMany()
      
      for (const config of this.configs) {
        const dbJob = dbJobs.find(job => job.name === config.name)
        if (dbJob) {
          config.isActive = dbJob.isActive
        } else {
          // Create job in database if it doesn't exist
          await prisma.cronJob.create({
            data: {
              name: config.name,
              schedule: config.schedule,
              isActive: config.isActive,
              status: 'IDLE'
            }
          })
        }
      }
    } catch (error) {
      console.error('Error loading job states from database:', error)
    }
  }

  private startActiveJobs() {
    for (const config of this.configs) {
      if (config.isActive) {
        this.startJob(config)
      }
    }
  }

  private startJob(config: CronJobConfig) {
    if (this.jobs.has(config.id)) {
      this.jobs.get(config.id)?.destroy()
    }

    const task = cron.schedule(config.schedule, async () => {
      await this.executeJob(config)
    }, {
      scheduled: false
    })

    this.jobs.set(config.id, task)
    task.start()
    
    console.log(`Started cron job: ${config.name} (${config.schedule})`)
  }

  private async executeJob(config: CronJobConfig) {
    try {
      // Update job status to running
      await prisma.cronJob.updateMany({
        where: { name: config.name },
        data: {
          status: 'RUNNING',
          lastRun: new Date()
        }
      })

      console.log(`Executing job: ${config.name}`)
      await config.handler()

      // Update job status to completed
      await prisma.cronJob.updateMany({
        where: { name: config.name },
        data: {
          status: 'COMPLETED',
          nextRun: this.getNextRunTime(config.schedule)
        }
      })

      console.log(`Completed job: ${config.name}`)
    } catch (error) {
      console.error(`Error executing job ${config.name}:`, error)
      
      // Update job status to failed
      await prisma.cronJob.updateMany({
        where: { name: config.name },
        data: {
          status: 'FAILED'
        }
      })
    }
  }

  private getNextRunTime(schedule: string): Date {
    // Simple next run calculation - in production use a proper cron parser
    const now = new Date()
    const nextRun = new Date(now.getTime() + 24 * 60 * 60 * 1000) // Default to 24 hours
    return nextRun
  }

  // Job Handlers
  private async updateLeadScores() {
    console.log('Running lead scoring update...')
    const result = await updateLeadScoresFromDatabase()
    console.log('Lead scoring update completed:', result)
  }

  private async sendWelcomeMessages() {
    console.log('Checking for new leads to send welcome messages...')
    
    try {
      // Find leads created in the last 5 minutes without welcome message
      const newLeads = await prisma.lead.findMany({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 5 * 60 * 1000) // Last 5 minutes
          },
          // Add condition to check if welcome message was already sent
        },
        include: {
          contact: true
        }
      })

      for (const lead of newLeads) {
        if (lead.contact?.phone) {
          // Send welcome message via WhatsApp/SMS
          await this.sendMessage(
            lead.contact.phone,
            `Welcome to QuickLoan! We received your ${lead.loanType.toLowerCase()} loan inquiry for ₹${lead.loanAmount.toLocaleString()}. Our expert will contact you shortly.`,
            'WHATSAPP'
          )
          
          console.log(`Sent welcome message to ${lead.name} (${lead.contact.phone})`)
        }
      }

      console.log(`Processed ${newLeads.length} new leads for welcome messages`)
    } catch (error) {
      console.error('Error sending welcome messages:', error)
    }
  }

  private async sendFollowupMessages() {
    console.log('Checking for leads needing follow-up...')
    
    try {
      // Find leads that haven't been contacted in 3 days
      const followupLeads = await prisma.lead.findMany({
        where: {
          updatedAt: {
            lte: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // 3 days ago
          },
          status: {
            in: ['NEW', 'CONTACTED', 'INTERESTED']
          }
        },
        include: {
          contact: true
        }
      })

      for (const lead of followupLeads) {
        if (lead.contact?.phone) {
          const message = this.getFollowupMessage(lead)
          await this.sendMessage(lead.contact.phone, message, 'WHATSAPP')
          
          // Update lead's updatedAt to avoid sending multiple follow-ups
          await prisma.lead.update({
            where: { id: lead.id },
            data: { updatedAt: new Date() }
          })
          
          console.log(`Sent follow-up message to ${lead.name}`)
        }
      }

      console.log(`Sent follow-up messages to ${followupLeads.length} leads`)
    } catch (error) {
      console.error('Error sending follow-up messages:', error)
    }
  }

  private getFollowupMessage(lead: any): string {
    const messages = [
      `Hi ${lead.name}! We noticed you haven't completed your ${lead.loanType.toLowerCase()} loan application. Need any help? Reply HELP for assistance.`,
      `Hello ${lead.name}, your ${lead.loanType.toLowerCase()} loan application is still pending. Our team is ready to assist you. Call us at +91-98765-43210.`,
      `Hi ${lead.name}! Don't miss out on competitive rates for your ${lead.loanType.toLowerCase()} loan. Complete your application today!`
    ]
    
    return messages[Math.floor(Math.random() * messages.length)]
  }

  private async sendMessage(phone: string, message: string, type: 'SMS' | 'WHATSAPP') {
    // This would integrate with actual SMS/WhatsApp API
    console.log(`Sending ${type} to ${phone}: ${message}`)
    
    // Create message record
    const contact = await prisma.contact.findFirst({
      where: { phone }
    })

    if (contact) {
      await prisma.message.create({
        data: {
          type,
          direction: 'OUTBOUND',
          content: message,
          contactId: contact.id,
          status: 'SENT',
          sentAt: new Date()
        }
      })
    }
  }

  private async updateCampaignStatus() {
    console.log('Updating campaign statuses...')
    
    try {
      // Update scheduled campaigns that should be running
      const scheduledCampaigns = await prisma.campaign.findMany({
        where: {
          status: 'SCHEDULED',
          scheduledAt: {
            lte: new Date()
          }
        }
      })

      for (const campaign of scheduledCampaigns) {
        await prisma.campaign.update({
          where: { id: campaign.id },
          data: { 
            status: 'RUNNING',
            sentAt: new Date()
          }
        })
        
        console.log(`Started campaign: ${campaign.name}`)
      }

      // Check for completed campaigns
      const runningCampaigns = await prisma.campaign.findMany({
        where: { status: 'RUNNING' },
        include: {
          contacts: true
        }
      })

      for (const campaign of runningCampaigns) {
        const totalContacts = campaign.contacts.length
        const completedContacts = campaign.contacts.filter(
          c => ['SENT', 'DELIVERED', 'FAILED'].includes(c.status)
        ).length

        if (completedContacts === totalContacts) {
          await prisma.campaign.update({
            where: { id: campaign.id },
            data: { status: 'COMPLETED' }
          })
          
          console.log(`Completed campaign: ${campaign.name}`)
        }
      }
    } catch (error) {
      console.error('Error updating campaign status:', error)
    }
  }

  private async cleanupOldData() {
    console.log('Cleaning up old data...')
    
    try {
      // Delete old messages (older than 6 months)
      const sixMonthsAgo = new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000)
      
      const deletedMessages = await prisma.message.deleteMany({
        where: {
          createdAt: {
            lt: sixMonthsAgo
          },
          direction: 'OUTBOUND'
        }
      })

      // Delete old activities (older than 1 year)
      const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
      
      const deletedActivities = await prisma.activity.deleteMany({
        where: {
          createdAt: {
            lt: oneYearAgo
          }
        }
      })

      console.log(`Cleaned up ${deletedMessages.count} old messages and ${deletedActivities.count} old activities`)
    } catch (error) {
      console.error('Error cleaning up old data:', error)
    }
  }

  // Public methods for job management
  public async toggleJob(jobName: string, isActive: boolean) {
    const config = this.configs.find(c => c.name === jobName)
    if (!config) return false

    config.isActive = isActive

    // Update database
    await prisma.cronJob.updateMany({
      where: { name: jobName },
      data: { isActive }
    })

    if (isActive) {
      this.startJob(config)
    } else {
      const task = this.jobs.get(config.id)
      if (task) {
        task.destroy()
        this.jobs.delete(config.id)
      }
    }

    return true
  }

  public getJobStatus() {
    return this.configs.map(config => ({
      id: config.id,
      name: config.name,
      schedule: config.schedule,
      isActive: config.isActive,
      isRunning: this.jobs.has(config.id)
    }))
  }
}

// Singleton instance
let cronManager: CronJobManager | null = null

export function getCronManager(): CronJobManager {
  if (!cronManager) {
    cronManager = new CronJobManager()
  }
  return cronManager
}

// Initialize cron jobs when the module is imported
if (process.env.NODE_ENV !== 'test') {
  getCronManager()
}