import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface LeadConversionMetrics {
  totalLeads: number
  convertedLeads: number
  conversionRate: number
  averageConversionTime: number
  conversionsByStage: Record<string, number>
  conversionTrends: Array<{
    date: string
    leads: number
    conversions: number
    rate: number
  }>
}

interface LeadSourceAnalysis {
  source: string
  totalLeads: number
  convertedLeads: number
  conversionRate: number
  averageScore: number
  averageAmount: number
  revenue: number
  costPerLead?: number
  roi?: number
}

interface LeadPipelineMetrics {
  stages: Array<{
    stage: string
    count: number
    percentage: number
    averageTimeInStage: number
    dropoffRate: number
  }>
  totalValue: number
  weightedValue: number
  velocity: number
  bottlenecks: string[]
}

interface PerformanceMetrics {
  employeeId: string
  employeeName: string
  assignedLeads: number
  convertedLeads: number
  conversionRate: number
  averageResponseTime: number
  averageScore: number
  revenue: number
  activities: number
  rank: number
}

interface LeadAnalyticsReport {
  period: string
  summary: {
    totalLeads: number
    newLeads: number
    convertedLeads: number
    lostLeads: number
    conversionRate: number
    totalRevenue: number
    averageLeadValue: number
    averageConversionTime: number
  }
  conversion: LeadConversionMetrics
  sources: LeadSourceAnalysis[]
  pipeline: LeadPipelineMetrics
  performance: PerformanceMetrics[]
  trends: {
    leadGeneration: Array<{ date: string; count: number }>
    conversionRates: Array<{ date: string; rate: number }>
    sourcePerformance: Array<{ date: string; source: string; leads: number }>
  }
  insights: string[]
  recommendations: string[]
}

export class LeadAnalyticsService {
  /**
   * Generate comprehensive lead analytics report
   */
  static async generateAnalyticsReport(
    startDate: Date,
    endDate: Date,
    filters?: {
      sources?: string[]
      loanTypes?: string[]
      employees?: string[]
      minAmount?: number
      maxAmount?: number
    }
  ): Promise<LeadAnalyticsReport> {
    try {
      // Build where clause for filtering
      const whereClause: any = {
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      }

      if (filters) {
        if (filters.sources?.length) {
          whereClause.source = { in: filters.sources }
        }
        if (filters.loanTypes?.length) {
          whereClause.loanType = { in: filters.loanTypes }
        }
        if (filters.employees?.length) {
          whereClause.assignedToId = { in: filters.employees }
        }
        if (filters.minAmount || filters.maxAmount) {
          whereClause.loanAmount = {}
          if (filters.minAmount) whereClause.loanAmount.gte = filters.minAmount
          if (filters.maxAmount) whereClause.loanAmount.lte = filters.maxAmount
        }
      }

      // Get leads data
      const leads = await prisma.lead.findMany({
        where: whereClause,
        include: {
          assignedTo: {
            select: { id: true, name: true }
          },
          activities: true
        }
      })

      // Calculate summary metrics
      const summary = await this.calculateSummaryMetrics(leads, startDate, endDate)
      
      // Calculate conversion metrics
      const conversion = await this.calculateConversionMetrics(leads, startDate, endDate)
      
      // Analyze lead sources
      const sources = await this.analyzeLeadSources(leads)
      
      // Calculate pipeline metrics
      const pipeline = await this.calculatePipelineMetrics(leads)
      
      // Calculate employee performance
      const performance = await this.calculateEmployeePerformance(leads)
      
      // Generate trends
      const trends = await this.generateTrends(startDate, endDate, whereClause)
      
      // Generate insights and recommendations
      const insights = this.generateInsights(leads, conversion, sources, pipeline)
      const recommendations = this.generateRecommendations(insights, conversion, sources, performance)

      return {
        period: `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`,
        summary,
        conversion,
        sources,
        pipeline,
        performance,
        trends,
        insights,
        recommendations
      }

    } catch (error) {
      console.error('Error generating analytics report:', error)
      throw error
    }
  }

  /**
   * Calculate summary metrics
   */
  private static async calculateSummaryMetrics(leads: any[], startDate: Date, endDate: Date) {
    const totalLeads = leads.length
    const newLeads = leads.filter(lead => lead.status === 'NEW').length
    const convertedLeads = leads.filter(lead => lead.status === 'CLOSED_WON').length
    const lostLeads = leads.filter(lead => lead.status === 'CLOSED_LOST').length
    const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0
    
    // Calculate revenue (assuming loan amount as potential revenue)
    const totalRevenue = leads
      .filter(lead => lead.status === 'CLOSED_WON')
      .reduce((sum, lead) => sum + lead.loanAmount, 0)
    
    const averageLeadValue = totalLeads > 0 
      ? leads.reduce((sum, lead) => sum + lead.loanAmount, 0) / totalLeads 
      : 0

    // Calculate average conversion time
    const convertedLeadsWithTime = leads.filter(lead => 
      lead.status === 'CLOSED_WON' && lead.updatedAt && lead.createdAt
    )
    
    const averageConversionTime = convertedLeadsWithTime.length > 0
      ? convertedLeadsWithTime.reduce((sum, lead) => {
          const days = (new Date(lead.updatedAt).getTime() - new Date(lead.createdAt).getTime()) / (1000 * 60 * 60 * 24)
          return sum + days
        }, 0) / convertedLeadsWithTime.length
      : 0

    return {
      totalLeads,
      newLeads,
      convertedLeads,
      lostLeads,
      conversionRate,
      totalRevenue,
      averageLeadValue,
      averageConversionTime
    }
  }

  /**
   * Calculate conversion metrics
   */
  private static async calculateConversionMetrics(leads: any[], startDate: Date, endDate: Date): Promise<LeadConversionMetrics> {
    const totalLeads = leads.length
    const convertedLeads = leads.filter(lead => lead.status === 'CLOSED_WON').length
    const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0

    // Calculate average conversion time
    const convertedLeadsWithTime = leads.filter(lead => 
      lead.status === 'CLOSED_WON' && lead.updatedAt && lead.createdAt
    )
    
    const averageConversionTime = convertedLeadsWithTime.length > 0
      ? convertedLeadsWithTime.reduce((sum, lead) => {
          const days = (new Date(lead.updatedAt).getTime() - new Date(lead.createdAt).getTime()) / (1000 * 60 * 60 * 24)
          return sum + days
        }, 0) / convertedLeadsWithTime.length
      : 0

    // Conversions by stage
    const conversionsByStage: Record<string, number> = {}
    const stages = ['NEW', 'CONTACTED', 'INTERESTED', 'QUALIFIED', 'PROPOSAL_SENT', 'NEGOTIATION', 'CLOSED_WON']
    
    stages.forEach(stage => {
      conversionsByStage[stage] = leads.filter(lead => lead.status === stage).length
    })

    // Generate conversion trends (daily)
    const conversionTrends = await this.generateConversionTrends(startDate, endDate)

    return {
      totalLeads,
      convertedLeads,
      conversionRate,
      averageConversionTime,
      conversionsByStage,
      conversionTrends
    }
  }

  /**
   * Analyze lead sources
   */
  private static async analyzeLeadSources(leads: any[]): Promise<LeadSourceAnalysis[]> {
    const sourceMap = new Map<string, any[]>()
    
    // Group leads by source
    leads.forEach(lead => {
      const source = lead.source || 'UNKNOWN'
      if (!sourceMap.has(source)) {
        sourceMap.set(source, [])
      }
      sourceMap.get(source)!.push(lead)
    })

    const sourceAnalysis: LeadSourceAnalysis[] = []

    for (const [source, sourceLeads] of sourceMap.entries()) {
      const totalLeads = sourceLeads.length
      const convertedLeads = sourceLeads.filter(lead => lead.status === 'CLOSED_WON').length
      const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0
      
      // Calculate average score (estimated from priority)
      const averageScore = sourceLeads.reduce((sum, lead) => {
        const score = lead.priority === 'URGENT' ? 85 : 
                     lead.priority === 'HIGH' ? 70 : 
                     lead.priority === 'MEDIUM' ? 50 : 30
        return sum + score
      }, 0) / totalLeads

      const averageAmount = totalLeads > 0 
        ? sourceLeads.reduce((sum, lead) => sum + lead.loanAmount, 0) / totalLeads 
        : 0

      const revenue = sourceLeads
        .filter(lead => lead.status === 'CLOSED_WON')
        .reduce((sum, lead) => sum + lead.loanAmount, 0)

      sourceAnalysis.push({
        source,
        totalLeads,
        convertedLeads,
        conversionRate,
        averageScore,
        averageAmount,
        revenue
      })
    }

    // Sort by conversion rate descending
    return sourceAnalysis.sort((a, b) => b.conversionRate - a.conversionRate)
  }

  /**
   * Calculate pipeline metrics
   */
  private static async calculatePipelineMetrics(leads: any[]): Promise<LeadPipelineMetrics> {
    const stages = ['NEW', 'CONTACTED', 'INTERESTED', 'QUALIFIED', 'PROPOSAL_SENT', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST']
    const totalLeads = leads.length
    
    const stageMetrics = stages.map(stage => {
      const stageLeads = leads.filter(lead => lead.status === stage)
      const count = stageLeads.length
      const percentage = totalLeads > 0 ? (count / totalLeads) * 100 : 0
      
      // Calculate average time in stage (simplified)
      const averageTimeInStage = stageLeads.length > 0
        ? stageLeads.reduce((sum, lead) => {
            const days = (Date.now() - new Date(lead.updatedAt).getTime()) / (1000 * 60 * 60 * 24)
            return sum + Math.max(0, days)
          }, 0) / stageLeads.length
        : 0

      // Calculate dropoff rate (leads that moved to CLOSED_LOST from this stage)
      const dropoffRate = 0 // This would require tracking stage transitions

      return {
        stage,
        count,
        percentage,
        averageTimeInStage,
        dropoffRate
      }
    })

    // Calculate total pipeline value
    const activeLeads = leads.filter(lead => !['CLOSED_WON', 'CLOSED_LOST'].includes(lead.status))
    const totalValue = activeLeads.reduce((sum, lead) => sum + lead.loanAmount, 0)
    
    // Calculate weighted value (based on stage probability)
    const stageWeights: Record<string, number> = {
      'NEW': 0.1,
      'CONTACTED': 0.2,
      'INTERESTED': 0.3,
      'QUALIFIED': 0.5,
      'PROPOSAL_SENT': 0.7,
      'NEGOTIATION': 0.8
    }
    
    const weightedValue = activeLeads.reduce((sum, lead) => {
      const weight = stageWeights[lead.status] || 0
      return sum + (lead.loanAmount * weight)
    }, 0)

    // Calculate velocity (leads moving through pipeline per day)
    const velocity = 0 // This would require tracking stage transitions over time

    // Identify bottlenecks
    const bottlenecks: string[] = []
    stageMetrics.forEach(stage => {
      if (stage.averageTimeInStage > 7 && stage.count > 0) {
        bottlenecks.push(`${stage.stage}: ${stage.averageTimeInStage.toFixed(1)} days average`)
      }
    })

    return {
      stages: stageMetrics,
      totalValue,
      weightedValue,
      velocity,
      bottlenecks
    }
  }

  /**
   * Calculate employee performance metrics
   */
  private static async calculateEmployeePerformance(leads: any[]): Promise<PerformanceMetrics[]> {
    const employeeMap = new Map<string, any[]>()
    
    // Group leads by assigned employee
    leads.forEach(lead => {
      if (lead.assignedTo) {
        const employeeId = lead.assignedTo.id
        if (!employeeMap.has(employeeId)) {
          employeeMap.set(employeeId, [])
        }
        employeeMap.get(employeeId)!.push(lead)
      }
    })

    const performanceMetrics: PerformanceMetrics[] = []

    for (const [employeeId, employeeLeads] of employeeMap.entries()) {
      const employee = employeeLeads[0].assignedTo
      const assignedLeads = employeeLeads.length
      const convertedLeads = employeeLeads.filter(lead => lead.status === 'CLOSED_WON').length
      const conversionRate = assignedLeads > 0 ? (convertedLeads / assignedLeads) * 100 : 0
      
      // Calculate average response time (simplified)
      const averageResponseTime = 2.5 // This would be calculated from actual message data
      
      // Calculate average score
      const averageScore = employeeLeads.reduce((sum, lead) => {
        const score = lead.priority === 'URGENT' ? 85 : 
                     lead.priority === 'HIGH' ? 70 : 
                     lead.priority === 'MEDIUM' ? 50 : 30
        return sum + score
      }, 0) / assignedLeads

      const revenue = employeeLeads
        .filter(lead => lead.status === 'CLOSED_WON')
        .reduce((sum, lead) => sum + lead.loanAmount, 0)

      const activities = employeeLeads.reduce((sum, lead) => sum + lead.activities.length, 0)

      performanceMetrics.push({
        employeeId,
        employeeName: employee.name,
        assignedLeads,
        convertedLeads,
        conversionRate,
        averageResponseTime,
        averageScore,
        revenue,
        activities,
        rank: 0 // Will be set after sorting
      })
    }

    // Sort by conversion rate and assign ranks
    performanceMetrics.sort((a, b) => b.conversionRate - a.conversionRate)
    performanceMetrics.forEach((metric, index) => {
      metric.rank = index + 1
    })

    return performanceMetrics
  }

  /**
   * Generate conversion trends
   */
  private static async generateConversionTrends(startDate: Date, endDate: Date) {
    const trends = []
    const currentDate = new Date(startDate)
    
    while (currentDate <= endDate) {
      const dayStart = new Date(currentDate)
      const dayEnd = new Date(currentDate)
      dayEnd.setHours(23, 59, 59, 999)
      
      const dayLeads = await prisma.lead.count({
        where: {
          createdAt: {
            gte: dayStart,
            lte: dayEnd
          }
        }
      })
      
      const dayConversions = await prisma.lead.count({
        where: {
          status: 'CLOSED_WON',
          updatedAt: {
            gte: dayStart,
            lte: dayEnd
          }
        }
      })
      
      const rate = dayLeads > 0 ? (dayConversions / dayLeads) * 100 : 0
      
      trends.push({
        date: currentDate.toISOString().split('T')[0],
        leads: dayLeads,
        conversions: dayConversions,
        rate
      })
      
      currentDate.setDate(currentDate.getDate() + 1)
    }
    
    return trends
  }

  /**
   * Generate trends data
   */
  private static async generateTrends(startDate: Date, endDate: Date, whereClause: any) {
    // Lead generation trend
    const leadGeneration = []
    const conversionRates = []
    const sourcePerformance = []
    
    const currentDate = new Date(startDate)
    
    while (currentDate <= endDate) {
      const dayStart = new Date(currentDate)
      const dayEnd = new Date(currentDate)
      dayEnd.setHours(23, 59, 59, 999)
      
      // Daily lead count
      const dayLeads = await prisma.lead.count({
        where: {
          ...whereClause,
          createdAt: {
            gte: dayStart,
            lte: dayEnd
          }
        }
      })
      
      leadGeneration.push({
        date: currentDate.toISOString().split('T')[0],
        count: dayLeads
      })
      
      // Daily conversion rate
      const dayConversions = await prisma.lead.count({
        where: {
          ...whereClause,
          status: 'CLOSED_WON',
          updatedAt: {
            gte: dayStart,
            lte: dayEnd
          }
        }
      })
      
      const rate = dayLeads > 0 ? (dayConversions / dayLeads) * 100 : 0
      conversionRates.push({
        date: currentDate.toISOString().split('T')[0],
        rate
      })
      
      currentDate.setDate(currentDate.getDate() + 1)
    }
    
    return {
      leadGeneration,
      conversionRates,
      sourcePerformance // Simplified for now
    }
  }

  /**
   * Generate insights from data
   */
  private static generateInsights(
    leads: any[], 
    conversion: LeadConversionMetrics, 
    sources: LeadSourceAnalysis[], 
    pipeline: LeadPipelineMetrics
  ): string[] {
    const insights: string[] = []
    
    // Conversion insights
    if (conversion.conversionRate > 15) {
      insights.push(`Excellent conversion rate of ${conversion.conversionRate.toFixed(1)}% - above industry average`)
    } else if (conversion.conversionRate < 5) {
      insights.push(`Low conversion rate of ${conversion.conversionRate.toFixed(1)}% - needs improvement`)
    }
    
    // Source insights
    const bestSource = sources[0]
    if (bestSource && bestSource.conversionRate > 20) {
      insights.push(`${bestSource.source} is your top performing source with ${bestSource.conversionRate.toFixed(1)}% conversion rate`)
    }
    
    const worstSource = sources[sources.length - 1]
    if (worstSource && worstSource.conversionRate < 5 && worstSource.totalLeads > 10) {
      insights.push(`${worstSource.source} has poor performance with only ${worstSource.conversionRate.toFixed(1)}% conversion rate`)
    }
    
    // Pipeline insights
    if (pipeline.bottlenecks.length > 0) {
      insights.push(`Pipeline bottlenecks identified: ${pipeline.bottlenecks.join(', ')}`)
    }
    
    // Lead quality insights
    const highValueLeads = leads.filter(lead => lead.loanAmount >= 1000000).length
    const totalLeads = leads.length
    if (highValueLeads / totalLeads > 0.3) {
      insights.push(`${((highValueLeads / totalLeads) * 100).toFixed(1)}% of leads are high-value (₹10L+)`)
    }
    
    return insights
  }

  /**
   * Generate recommendations based on insights
   */
  private static generateRecommendations(
    insights: string[], 
    conversion: LeadConversionMetrics, 
    sources: LeadSourceAnalysis[], 
    performance: PerformanceMetrics[]
  ): string[] {
    const recommendations: string[] = []
    
    // Conversion recommendations
    if (conversion.conversionRate < 10) {
      recommendations.push('Focus on lead qualification to improve conversion rates')
      recommendations.push('Implement lead scoring to prioritize high-quality leads')
    }
    
    if (conversion.averageConversionTime > 14) {
      recommendations.push('Reduce conversion time by implementing faster follow-up processes')
    }
    
    // Source recommendations
    const bestSource = sources[0]
    const worstSource = sources[sources.length - 1]
    
    if (bestSource && worstSource && bestSource.conversionRate > worstSource.conversionRate * 2) {
      recommendations.push(`Increase investment in ${bestSource.source} and reduce focus on ${worstSource.source}`)
    }
    
    // Performance recommendations
    if (performance.length > 1) {
      const topPerformer = performance[0]
      const avgConversion = performance.reduce((sum, p) => sum + p.conversionRate, 0) / performance.length
      
      if (topPerformer.conversionRate > avgConversion * 1.5) {
        recommendations.push(`Share best practices from top performer ${topPerformer.employeeName} with the team`)
      }
    }
    
    // General recommendations
    recommendations.push('Implement automated lead nurturing campaigns for better engagement')
    recommendations.push('Set up regular lead scoring updates to maintain data quality')
    
    return recommendations
  }

  /**
   * Get lead funnel analysis
   */
  static async getLeadFunnelAnalysis(startDate: Date, endDate: Date): Promise<{
    stages: Array<{
      stage: string
      count: number
      percentage: number
      conversionRate: number
    }>
    dropoffPoints: Array<{
      from: string
      to: string
      dropoffRate: number
      count: number
    }>
  }> {
    try {
      const leads = await prisma.lead.findMany({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        }
      })

      const stages = ['NEW', 'CONTACTED', 'INTERESTED', 'QUALIFIED', 'PROPOSAL_SENT', 'NEGOTIATION', 'CLOSED_WON']
      const totalLeads = leads.length
      
      const stageAnalysis = stages.map((stage, index) => {
        const stageLeads = leads.filter(lead => lead.status === stage)
        const count = stageLeads.length
        const percentage = totalLeads > 0 ? (count / totalLeads) * 100 : 0
        
        // Calculate conversion rate to next stage
        const nextStageLeads = index < stages.length - 1 
          ? leads.filter(lead => stages.indexOf(lead.status) > index).length
          : 0
        
        const conversionRate = count > 0 ? (nextStageLeads / count) * 100 : 0
        
        return {
          stage,
          count,
          percentage,
          conversionRate
        }
      })

      // Calculate dropoff points
      const dropoffPoints = []
      for (let i = 0; i < stages.length - 1; i++) {
        const currentStage = stageAnalysis[i]
        const nextStage = stageAnalysis[i + 1]
        
        const dropoffCount = currentStage.count - nextStage.count
        const dropoffRate = currentStage.count > 0 ? (dropoffCount / currentStage.count) * 100 : 0
        
        if (dropoffRate > 20) { // Only include significant dropoffs
          dropoffPoints.push({
            from: currentStage.stage,
            to: nextStage.stage,
            dropoffRate,
            count: dropoffCount
          })
        }
      }

      return {
        stages: stageAnalysis,
        dropoffPoints
      }

    } catch (error) {
      console.error('Error getting funnel analysis:', error)
      throw error
    }
  }

  /**
   * Get lead cohort analysis
   */
  static async getLeadCohortAnalysis(months: number = 6): Promise<{
    cohorts: Array<{
      cohort: string
      totalLeads: number
      conversions: Array<{ month: number; count: number; rate: number }>
    }>
  }> {
    try {
      const cohorts = []
      const endDate = new Date()
      
      for (let i = 0; i < months; i++) {
        const cohortDate = new Date(endDate)
        cohortDate.setMonth(cohortDate.getMonth() - i)
        cohortDate.setDate(1) // First day of month
        
        const cohortEndDate = new Date(cohortDate)
        cohortEndDate.setMonth(cohortEndDate.getMonth() + 1)
        cohortEndDate.setDate(0) // Last day of month
        
        const cohortLeads = await prisma.lead.findMany({
          where: {
            createdAt: {
              gte: cohortDate,
              lte: cohortEndDate
            }
          }
        })
        
        const totalLeads = cohortLeads.length
        const conversions = []
        
        // Track conversions for each subsequent month
        for (let month = 0; month <= i; month++) {
          const conversionDate = new Date(cohortDate)
          conversionDate.setMonth(conversionDate.getMonth() + month + 1)
          
          const convertedCount = cohortLeads.filter(lead => 
            lead.status === 'CLOSED_WON' && 
            lead.updatedAt && 
            new Date(lead.updatedAt) <= conversionDate
          ).length
          
          const rate = totalLeads > 0 ? (convertedCount / totalLeads) * 100 : 0
          
          conversions.push({
            month,
            count: convertedCount,
            rate
          })
        }
        
        cohorts.push({
          cohort: cohortDate.toISOString().substring(0, 7), // YYYY-MM format
          totalLeads,
          conversions
        })
      }
      
      return { cohorts: cohorts.reverse() } // Oldest first

    } catch (error) {
      console.error('Error getting cohort analysis:', error)
      throw error
    }
  }

  /**
   * Export analytics data to CSV
   */
  static async exportAnalyticsToCSV(
    startDate: Date,
    endDate: Date,
    type: 'leads' | 'conversions' | 'sources' | 'performance'
  ): Promise<string> {
    try {
      let csvContent = ''
      
      switch (type) {
        case 'leads':
          const leads = await prisma.lead.findMany({
            where: {
              createdAt: { gte: startDate, lte: endDate }
            },
            include: {
              assignedTo: { select: { name: true } }
            }
          })
          
          csvContent = 'ID,Name,Phone,Email,Loan Type,Loan Amount,Status,Priority,Source,Assigned To,Created At,Updated At\n'
          csvContent += leads.map(lead => 
            `${lead.id},"${lead.name}","${lead.phone}","${lead.email || ''}","${lead.loanType}",${lead.loanAmount},"${lead.status}","${lead.priority}","${lead.source}","${lead.assignedTo?.name || ''}","${lead.createdAt.toISOString()}","${lead.updatedAt.toISOString()}"`
          ).join('\n')
          break
          
        case 'conversions':
          const report = await this.generateAnalyticsReport(startDate, endDate)
          csvContent = 'Date,Leads,Conversions,Rate\n'
          csvContent += report.conversion.conversionTrends.map(trend =>
            `${trend.date},${trend.leads},${trend.conversions},${trend.rate.toFixed(2)}`
          ).join('\n')
          break
          
        case 'sources':
          const sourceReport = await this.generateAnalyticsReport(startDate, endDate)
          csvContent = 'Source,Total Leads,Converted Leads,Conversion Rate,Average Score,Average Amount,Revenue\n'
          csvContent += sourceReport.sources.map(source =>
            `"${source.source}",${source.totalLeads},${source.convertedLeads},${source.conversionRate.toFixed(2)},${source.averageScore.toFixed(1)},${source.averageAmount.toFixed(0)},${source.revenue.toFixed(0)}`
          ).join('\n')
          break
          
        case 'performance':
          const perfReport = await this.generateAnalyticsReport(startDate, endDate)
          csvContent = 'Employee,Assigned Leads,Converted Leads,Conversion Rate,Average Response Time,Average Score,Revenue,Activities,Rank\n'
          csvContent += perfReport.performance.map(perf =>
            `"${perf.employeeName}",${perf.assignedLeads},${perf.convertedLeads},${perf.conversionRate.toFixed(2)},${perf.averageResponseTime.toFixed(1)},${perf.averageScore.toFixed(1)},${perf.revenue.toFixed(0)},${perf.activities},${perf.rank}`
          ).join('\n')
          break
      }
      
      return csvContent

    } catch (error) {
      console.error('Error exporting analytics to CSV:', error)
      throw error
    }
  }
}

export default LeadAnalyticsService