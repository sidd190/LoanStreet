import { PrismaClient } from '@prisma/client'
import { 
  calculateLeadScore, 
  getLeadPriority, 
  calculateAdvancedLeadScore,
  assessLeadQuality,
  generateLeadScoringReport
} from './leadScoring'

const prisma = new PrismaClient()

interface LeadProgressionRule {
  id: string
  name: string
  fromStatus: string
  toStatus: string
  conditions: {
    minScore?: number
    maxDaysInStatus?: number
    requiredActivities?: string[]
    minEngagement?: number
  }
  isActive: boolean
}

interface ScoringUpdate {
  leadId: string
  oldScore: number
  newScore: number
  oldPriority: string
  newPriority: string
  factors: string[]
  confidence: number
  updatedAt: string
}

interface LeadQualificationResult {
  leadId: string
  qualified: boolean
  score: number
  priority: string
  quality: string
  recommendations: string[]
  nextActions: string[]
  confidence: number
}

export class LeadScoringEngine {
  /**
   * Update lead score based on current data and interactions
   */
  static async updateLeadScore(leadId: string): Promise<ScoringUpdate | null> {
    try {
      // Get lead with related data
      const lead = await prisma.lead.findUnique({
        where: { id: leadId },
        include: {
          contact: true,
          activities: {
            orderBy: { createdAt: 'desc' },
            take: 10
          }
        }
      })

      if (!lead) {
        throw new Error('Lead not found')
      }

      // Get message engagement data
      const messageEngagement = await this.getMessageEngagement(lead.phone)
      
      // Calculate response time
      const responseTime = await this.calculateResponseTime(lead.phone)
      
      // Calculate profile completeness
      const profileCompleteness = this.calculateProfileCompleteness(lead)
      
      // Calculate days since last activity
      const lastActivityDays = this.calculateDaysSinceLastActivity(lead.activities)

      // Prepare scoring factors
      const scoringFactors = {
        responseTime,
        messageEngagement: messageEngagement.totalMessages,
        loanAmount: lead.loanAmount,
        loanType: lead.loanType,
        source: lead.source,
        profileCompleteness,
        lastActivityDays,
        phoneVerified: true, // Assume verified if in system
        emailVerified: !!lead.email,
        // Advanced factors
        previousInteractions: messageEngagement.totalMessages,
        socialMediaActivity: 0, // Not implemented yet
        creditScore: undefined, // Would come from external service
        employmentStatus: undefined, // Would be collected in lead form
        monthlyIncome: undefined, // Would be collected in lead form
        existingLoans: undefined, // Would be collected in lead form
        referralSource: lead.source === 'REFERRAL' ? lead.source : undefined
      }

      // Calculate new score
      const advancedResult = calculateAdvancedLeadScore(scoringFactors)
      const newScore = advancedResult.score
      const newPriority = getLeadPriority(newScore)

      // Store old values
      const oldScore = lead.priority === 'URGENT' ? 85 : 
                      lead.priority === 'HIGH' ? 70 : 
                      lead.priority === 'MEDIUM' ? 50 : 30 // Estimate from priority
      const oldPriority = lead.priority

      // Update lead if score changed significantly
      if (Math.abs(newScore - oldScore) >= 5 || newPriority !== oldPriority) {
        await prisma.lead.update({
          where: { id: leadId },
          data: {
            priority: newPriority,
            updatedAt: new Date()
          }
        })

        // Log scoring update activity
        await prisma.activity.create({
          data: {
            type: 'SCORING_UPDATE',
            title: 'Lead Score Updated',
            description: `Score updated from ${oldScore} to ${newScore} (${oldPriority} → ${newPriority}). Confidence: ${advancedResult.confidence}%`,
            leadId,
            userId: 'system'
          }
        })

        return {
          leadId,
          oldScore,
          newScore,
          oldPriority,
          newPriority,
          factors: advancedResult.factors,
          confidence: advancedResult.confidence,
          updatedAt: new Date().toISOString()
        }
      }

      return null // No significant change

    } catch (error) {
      console.error('Error updating lead score:', error)
      throw error
    }
  }

  /**
   * Bulk update lead scores for all active leads
   */
  static async bulkUpdateLeadScores(): Promise<{
    processed: number
    updated: number
    errors: string[]
    updates: ScoringUpdate[]
  }> {
    const results = {
      processed: 0,
      updated: 0,
      errors: [] as string[],
      updates: [] as ScoringUpdate[]
    }

    try {
      // Get all active leads
      const leads = await prisma.lead.findMany({
        where: {
          status: { notIn: ['CLOSED_WON', 'CLOSED_LOST'] }
        },
        select: { id: true }
      })

      for (const lead of leads) {
        results.processed++

        try {
          const update = await this.updateLeadScore(lead.id)
          if (update) {
            results.updated++
            results.updates.push(update)
          }
        } catch (error) {
          results.errors.push(`Lead ${lead.id}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }

    } catch (error) {
      results.errors.push(`Bulk update failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    return results
  }

  /**
   * Qualify lead based on score and other criteria
   */
  static async qualifyLead(leadId: string): Promise<LeadQualificationResult> {
    try {
      // Update score first
      await this.updateLeadScore(leadId)

      // Get updated lead
      const lead = await prisma.lead.findUnique({
        where: { id: leadId },
        include: {
          contact: true,
          activities: true
        }
      })

      if (!lead) {
        throw new Error('Lead not found')
      }

      // Calculate current score
      const messageEngagement = await this.getMessageEngagement(lead.phone)
      const responseTime = await this.calculateResponseTime(lead.phone)
      const profileCompleteness = this.calculateProfileCompleteness(lead)
      const lastActivityDays = this.calculateDaysSinceLastActivity(lead.activities)

      const scoringFactors = {
        responseTime,
        messageEngagement: messageEngagement.totalMessages,
        loanAmount: lead.loanAmount,
        loanType: lead.loanType,
        source: lead.source,
        profileCompleteness,
        lastActivityDays,
        phoneVerified: true,
        emailVerified: !!lead.email
      }

      const score = calculateLeadScore(scoringFactors)
      const priority = getLeadPriority(score)
      const quality = assessLeadQuality(score, 80) // Assume 80% confidence

      // Determine qualification
      const qualified = score >= 60 && 
                       lead.loanAmount > 0 && 
                       profileCompleteness >= 60 &&
                       lastActivityDays <= 7

      return {
        leadId,
        qualified,
        score,
        priority,
        quality: quality.quality,
        recommendations: [quality.recommendation],
        nextActions: quality.nextActions,
        confidence: 80
      }

    } catch (error) {
      console.error('Error qualifying lead:', error)
      throw error
    }
  }

  /**
   * Process lead progression based on rules
   */
  static async processLeadProgression(): Promise<{
    processed: number
    progressed: number
    errors: string[]
  }> {
    const results = {
      processed: 0,
      progressed: 0,
      errors: [] as string[]
    }

    try {
      // Get progression rules
      const progressionRules = await this.getProgressionRules()

      // Get leads that might need progression
      const leads = await prisma.lead.findMany({
        where: {
          status: { notIn: ['CLOSED_WON', 'CLOSED_LOST'] }
        },
        include: {
          activities: {
            orderBy: { createdAt: 'desc' },
            take: 5
          }
        }
      })

      for (const lead of leads) {
        results.processed++

        try {
          for (const rule of progressionRules) {
            if (await this.shouldProgressLead(lead, rule)) {
              await this.progressLead(lead, rule)
              results.progressed++
              break // Only apply first matching rule
            }
          }
        } catch (error) {
          results.errors.push(`Lead ${lead.id}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }

    } catch (error) {
      results.errors.push(`Progression processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    return results
  }

  /**
   * Get message engagement metrics for a phone number
   */
  private static async getMessageEngagement(phone: string): Promise<{
    totalMessages: number
    inboundMessages: number
    outboundMessages: number
    responseRate: number
  }> {
    try {
      const messages = await prisma.message.findMany({
        where: {
          contact: { phone }
        }
      })

      const inboundMessages = messages.filter(m => m.direction === 'INBOUND').length
      const outboundMessages = messages.filter(m => m.direction === 'OUTBOUND').length
      const responseRate = outboundMessages > 0 ? (inboundMessages / outboundMessages) * 100 : 0

      return {
        totalMessages: messages.length,
        inboundMessages,
        outboundMessages,
        responseRate
      }

    } catch (error) {
      console.error('Error getting message engagement:', error)
      return {
        totalMessages: 0,
        inboundMessages: 0,
        outboundMessages: 0,
        responseRate: 0
      }
    }
  }

  /**
   * Calculate average response time in minutes
   */
  private static async calculateResponseTime(phone: string): Promise<number> {
    try {
      // Get conversation pairs (outbound followed by inbound)
      const messages = await prisma.message.findMany({
        where: {
          contact: { phone }
        },
        orderBy: { createdAt: 'asc' }
      })

      const responseTimes: number[] = []
      
      for (let i = 0; i < messages.length - 1; i++) {
        const current = messages[i]
        const next = messages[i + 1]
        
        if (current.direction === 'OUTBOUND' && next.direction === 'INBOUND') {
          const responseTime = (new Date(next.createdAt).getTime() - new Date(current.createdAt).getTime()) / (1000 * 60)
          responseTimes.push(responseTime)
        }
      }

      return responseTimes.length > 0 
        ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
        : 1440 // Default to 24 hours if no responses

    } catch (error) {
      console.error('Error calculating response time:', error)
      return 1440 // Default to 24 hours
    }
  }

  /**
   * Calculate profile completeness percentage
   */
  private static calculateProfileCompleteness(lead: any): number {
    const fields = ['name', 'phone', 'email', 'loanType', 'loanAmount']
    const filledFields = fields.filter(field => {
      const value = lead[field]
      return value !== null && value !== undefined && value !== '' && value !== 0
    })
    
    return (filledFields.length / fields.length) * 100
  }

  /**
   * Calculate days since last activity
   */
  private static calculateDaysSinceLastActivity(activities: any[]): number {
    if (activities.length === 0) return 999 // Very old if no activities
    
    const lastActivity = activities[0]
    const daysSince = (Date.now() - new Date(lastActivity.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    
    return Math.floor(daysSince)
  }

  /**
   * Get progression rules
   */
  private static async getProgressionRules(): Promise<LeadProgressionRule[]> {
    // This would typically be stored in database
    return [
      {
        id: '1',
        name: 'Auto-qualify high scorers',
        fromStatus: 'NEW',
        toStatus: 'QUALIFIED',
        conditions: {
          minScore: 80,
          maxDaysInStatus: 1
        },
        isActive: true
      },
      {
        id: '2',
        name: 'Move interested to qualified',
        fromStatus: 'INTERESTED',
        toStatus: 'QUALIFIED',
        conditions: {
          minScore: 70,
          requiredActivities: ['CALL', 'EMAIL'],
          minEngagement: 2
        },
        isActive: true
      },
      {
        id: '3',
        name: 'Stale lead follow-up',
        fromStatus: 'CONTACTED',
        toStatus: 'INTERESTED',
        conditions: {
          maxDaysInStatus: 3,
          minEngagement: 1
        },
        isActive: true
      }
    ]
  }

  /**
   * Check if lead should progress based on rule
   */
  private static async shouldProgressLead(lead: any, rule: LeadProgressionRule): Promise<boolean> {
    // Check if lead is in the right status
    if (lead.status !== rule.fromStatus) {
      return false
    }

    const conditions = rule.conditions

    // Check minimum score
    if (conditions.minScore) {
      // Calculate current score
      const messageEngagement = await this.getMessageEngagement(lead.phone)
      const responseTime = await this.calculateResponseTime(lead.phone)
      const profileCompleteness = this.calculateProfileCompleteness(lead)
      const lastActivityDays = this.calculateDaysSinceLastActivity(lead.activities)

      const scoringFactors = {
        responseTime,
        messageEngagement: messageEngagement.totalMessages,
        loanAmount: lead.loanAmount,
        loanType: lead.loanType,
        source: lead.source,
        profileCompleteness,
        lastActivityDays,
        phoneVerified: true,
        emailVerified: !!lead.email
      }

      const currentScore = calculateLeadScore(scoringFactors)
      if (currentScore < conditions.minScore) {
        return false
      }
    }

    // Check days in current status
    if (conditions.maxDaysInStatus) {
      const daysInStatus = (Date.now() - new Date(lead.updatedAt).getTime()) / (1000 * 60 * 60 * 24)
      if (daysInStatus > conditions.maxDaysInStatus) {
        return false
      }
    }

    // Check required activities
    if (conditions.requiredActivities) {
      const activityTypes = lead.activities.map((a: any) => a.type)
      const hasRequiredActivities = conditions.requiredActivities.every(type => 
        activityTypes.includes(type)
      )
      if (!hasRequiredActivities) {
        return false
      }
    }

    // Check minimum engagement
    if (conditions.minEngagement) {
      const messageEngagement = await this.getMessageEngagement(lead.phone)
      if (messageEngagement.totalMessages < conditions.minEngagement) {
        return false
      }
    }

    return true
  }

  /**
   * Progress lead to next status
   */
  private static async progressLead(lead: any, rule: LeadProgressionRule): Promise<void> {
    try {
      // Update lead status
      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          status: rule.toStatus,
          updatedAt: new Date()
        }
      })

      // Log progression activity
      await prisma.activity.create({
        data: {
          type: 'PROGRESSION',
          title: 'Lead Status Progressed',
          description: `Lead automatically progressed from ${rule.fromStatus} to ${rule.toStatus} using rule: ${rule.name}`,
          leadId: lead.id,
          userId: 'system'
        }
      })

    } catch (error) {
      console.error('Error progressing lead:', error)
      throw error
    }
  }

  /**
   * Generate comprehensive scoring report
   */
  static async generateScoringReport(days: number = 30): Promise<any> {
    try {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      // Get leads for the period
      const leads = await prisma.lead.findMany({
        where: {
          createdAt: { gte: startDate }
        }
      })

      // Transform to format expected by scoring report
      const leadsForReport = leads.map(lead => ({
        id: lead.id,
        score: lead.priority === 'URGENT' ? 85 : 
               lead.priority === 'HIGH' ? 70 : 
               lead.priority === 'MEDIUM' ? 50 : 30,
        priority: lead.priority,
        loanAmount: lead.loanAmount,
        source: lead.source,
        createdAt: lead.createdAt.toISOString()
      }))

      // Generate report using existing function
      const report = generateLeadScoringReport(leadsForReport)

      // Add additional metrics
      const scoringUpdates = await prisma.activity.count({
        where: {
          type: 'SCORING_UPDATE',
          createdAt: { gte: startDate }
        }
      })

      const progressions = await prisma.activity.count({
        where: {
          type: 'PROGRESSION',
          createdAt: { gte: startDate }
        }
      })

      return {
        ...report,
        period: `${days} days`,
        scoringUpdates,
        progressions,
        generatedAt: new Date().toISOString()
      }

    } catch (error) {
      console.error('Error generating scoring report:', error)
      throw error
    }
  }

  /**
   * Get lead scoring insights for a specific lead
   */
  static async getLeadInsights(leadId: string): Promise<{
    currentScore: number
    priority: string
    quality: string
    strengths: string[]
    weaknesses: string[]
    recommendations: string[]
    nextActions: string[]
    scoreHistory: Array<{ date: string; score: number; event: string }>
  }> {
    try {
      const lead = await prisma.lead.findUnique({
        where: { id: leadId },
        include: {
          activities: {
            where: { type: 'SCORING_UPDATE' },
            orderBy: { createdAt: 'desc' },
            take: 10
          }
        }
      })

      if (!lead) {
        throw new Error('Lead not found')
      }

      // Calculate current score and insights
      const messageEngagement = await this.getMessageEngagement(lead.phone)
      const responseTime = await this.calculateResponseTime(lead.phone)
      const profileCompleteness = this.calculateProfileCompleteness(lead)
      const lastActivityDays = this.calculateDaysSinceLastActivity(lead.activities)

      const scoringFactors = {
        responseTime,
        messageEngagement: messageEngagement.totalMessages,
        loanAmount: lead.loanAmount,
        loanType: lead.loanType,
        source: lead.source,
        profileCompleteness,
        lastActivityDays,
        phoneVerified: true,
        emailVerified: !!lead.email
      }

      const currentScore = calculateLeadScore(scoringFactors)
      const priority = getLeadPriority(currentScore)
      const quality = assessLeadQuality(currentScore, 80)

      // Analyze strengths and weaknesses
      const strengths: string[] = []
      const weaknesses: string[] = []

      if (responseTime <= 60) strengths.push('Quick response time')
      else if (responseTime > 1440) weaknesses.push('Slow response time')

      if (messageEngagement.totalMessages >= 3) strengths.push('High engagement')
      else if (messageEngagement.totalMessages === 0) weaknesses.push('No message engagement')

      if (lead.loanAmount >= 500000) strengths.push('High loan amount')
      else if (lead.loanAmount === 0) weaknesses.push('No loan amount specified')

      if (profileCompleteness >= 80) strengths.push('Complete profile')
      else if (profileCompleteness < 50) weaknesses.push('Incomplete profile')

      if (lastActivityDays === 0) strengths.push('Recent activity')
      else if (lastActivityDays > 7) weaknesses.push('No recent activity')

      // Build score history from activities
      const scoreHistory = lead.activities.map(activity => ({
        date: activity.createdAt.toISOString(),
        score: parseInt(activity.description?.match(/to (\d+)/)?.[1] || '0'),
        event: activity.title
      }))

      return {
        currentScore,
        priority,
        quality: quality.quality,
        strengths,
        weaknesses,
        recommendations: [quality.recommendation],
        nextActions: quality.nextActions,
        scoreHistory
      }

    } catch (error) {
      console.error('Error getting lead insights:', error)
      throw error
    }
  }
}

export default LeadScoringEngine