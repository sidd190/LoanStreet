import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface AssignmentRule {
  id: string
  name: string
  priority: number
  conditions: {
    loanType?: string[]
    loanAmountMin?: number
    loanAmountMax?: number
    leadSource?: string[]
    leadPriority?: string[]
    timeOfDay?: { start: string; end: string }
    dayOfWeek?: string[]
  }
  assignmentStrategy: 'ROUND_ROBIN' | 'WORKLOAD_BASED' | 'SKILL_BASED' | 'MANUAL'
  targetUsers?: string[]
  isActive: boolean
  createdAt: string
  updatedAt: string
}

interface EmployeeWorkload {
  userId: string
  userName: string
  email: string
  role: string
  activeLeads: number
  maxCapacity: number
  skills: string[]
  availability: {
    isAvailable: boolean
    lastActive: string
    workingHours: { start: string; end: string }
    workingDays: string[]
  }
  performance: {
    conversionRate: number
    averageResponseTime: number
    totalLeadsHandled: number
    successfulClosures: number
  }
}

interface AssignmentResult {
  success: boolean
  assignedTo?: {
    id: string
    name: string
    email: string
  }
  reason: string
  confidence: number
  alternativeOptions?: Array<{
    id: string
    name: string
    reason: string
  }>
}

interface EscalationRule {
  id: string
  name: string
  conditions: {
    noResponseHours?: number
    leadAge?: number
    priority?: string[]
    status?: string[]
  }
  escalationActions: Array<{
    type: 'REASSIGN' | 'NOTIFY_MANAGER' | 'INCREASE_PRIORITY' | 'ADD_TO_CAMPAIGN'
    targetUserId?: string
    notificationMessage?: string
    campaignId?: string
  }>
  isActive: boolean
}

export class LeadAssignmentService {
  /**
   * Assign lead to the most appropriate employee based on rules and workload
   */
  static async assignLead(leadId: string, manualAssigneeId?: string): Promise<AssignmentResult> {
    try {
      // Get lead details
      const lead = await prisma.lead.findUnique({
        where: { id: leadId },
        include: {
          contact: true,
          assignedTo: true
        }
      })

      if (!lead) {
        return {
          success: false,
          reason: 'Lead not found',
          confidence: 0
        }
      }

      // If manual assignment is specified
      if (manualAssigneeId) {
        return await this.manualAssignment(lead, manualAssigneeId)
      }

      // Get assignment rules
      const assignmentRules = await this.getActiveAssignmentRules()
      
      // Find matching rule
      const matchingRule = this.findMatchingRule(lead, assignmentRules)
      
      if (!matchingRule) {
        // Use default assignment strategy
        return await this.defaultAssignment(lead)
      }

      // Apply the matching rule
      return await this.applyAssignmentRule(lead, matchingRule)

    } catch (error) {
      console.error('Error in lead assignment:', error)
      return {
        success: false,
        reason: `Assignment failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        confidence: 0
      }
    }
  }

  /**
   * Manual assignment of lead to specific user
   */
  private static async manualAssignment(lead: any, assigneeId: string): Promise<AssignmentResult> {
    try {
      // Validate assignee
      const assignee = await prisma.user.findUnique({
        where: { id: assigneeId, isActive: true }
      })

      if (!assignee) {
        return {
          success: false,
          reason: 'Assignee not found or inactive',
          confidence: 0
        }
      }

      // Check workload capacity
      const workload = await this.getEmployeeWorkload(assigneeId)
      if (workload.activeLeads >= workload.maxCapacity) {
        return {
          success: false,
          reason: `Employee ${assignee.name} is at maximum capacity (${workload.activeLeads}/${workload.maxCapacity})`,
          confidence: 0,
          alternativeOptions: await this.getAlternativeAssignees(lead)
        }
      }

      // Perform assignment
      await this.performAssignment(lead.id, assigneeId, 'MANUAL', 100)

      return {
        success: true,
        assignedTo: {
          id: assignee.id,
          name: assignee.name,
          email: assignee.email
        },
        reason: 'Manual assignment by admin',
        confidence: 100
      }

    } catch (error) {
      console.error('Error in manual assignment:', error)
      return {
        success: false,
        reason: `Manual assignment failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        confidence: 0
      }
    }
  }

  /**
   * Default assignment strategy when no rules match
   */
  private static async defaultAssignment(lead: any): Promise<AssignmentResult> {
    try {
      // Get all available employees
      const employees = await this.getAvailableEmployees()
      
      if (employees.length === 0) {
        return {
          success: false,
          reason: 'No available employees for assignment',
          confidence: 0
        }
      }

      // Use workload-based assignment as default
      const bestEmployee = employees.reduce((best, current) => {
        const bestUtilization = best.activeLeads / best.maxCapacity
        const currentUtilization = current.activeLeads / current.maxCapacity
        
        // Prefer employee with lower utilization
        if (currentUtilization < bestUtilization) return current
        
        // If utilization is same, prefer better performance
        if (currentUtilization === bestUtilization) {
          return current.performance.conversionRate > best.performance.conversionRate ? current : best
        }
        
        return best
      })

      // Perform assignment
      await this.performAssignment(lead.id, bestEmployee.userId, 'WORKLOAD_BASED', 80)

      return {
        success: true,
        assignedTo: {
          id: bestEmployee.userId,
          name: bestEmployee.userName,
          email: bestEmployee.email
        },
        reason: `Assigned based on workload (${bestEmployee.activeLeads}/${bestEmployee.maxCapacity}) and performance`,
        confidence: 80
      }

    } catch (error) {
      console.error('Error in default assignment:', error)
      return {
        success: false,
        reason: `Default assignment failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        confidence: 0
      }
    }
  }

  /**
   * Apply specific assignment rule
   */
  private static async applyAssignmentRule(lead: any, rule: AssignmentRule): Promise<AssignmentResult> {
    try {
      let assignedEmployee: EmployeeWorkload | null = null
      let confidence = 90
      let reason = `Assigned using rule: ${rule.name}`

      switch (rule.assignmentStrategy) {
        case 'ROUND_ROBIN':
          assignedEmployee = await this.roundRobinAssignment(rule.targetUsers || [])
          break
          
        case 'WORKLOAD_BASED':
          assignedEmployee = await this.workloadBasedAssignment(rule.targetUsers || [])
          break
          
        case 'SKILL_BASED':
          assignedEmployee = await this.skillBasedAssignment(lead, rule.targetUsers || [])
          confidence = 95
          break
          
        case 'MANUAL':
          return {
            success: false,
            reason: 'Manual assignment rule requires explicit assignee selection',
            confidence: 0
          }
      }

      if (!assignedEmployee) {
        return {
          success: false,
          reason: `No suitable employee found using ${rule.assignmentStrategy} strategy`,
          confidence: 0,
          alternativeOptions: await this.getAlternativeAssignees(lead)
        }
      }

      // Perform assignment
      await this.performAssignment(lead.id, assignedEmployee.userId, rule.assignmentStrategy, confidence)

      return {
        success: true,
        assignedTo: {
          id: assignedEmployee.userId,
          name: assignedEmployee.userName,
          email: assignedEmployee.email
        },
        reason,
        confidence
      }

    } catch (error) {
      console.error('Error applying assignment rule:', error)
      return {
        success: false,
        reason: `Rule application failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        confidence: 0
      }
    }
  }

  /**
   * Round robin assignment strategy
   */
  private static async roundRobinAssignment(targetUserIds: string[]): Promise<EmployeeWorkload | null> {
    try {
      const employees = await this.getAvailableEmployees(targetUserIds)
      if (employees.length === 0) return null

      // Get last assignment to determine next in rotation
      const lastAssignment = await prisma.lead.findFirst({
        where: {
          assignedToId: { in: targetUserIds },
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
        },
        orderBy: { createdAt: 'desc' },
        include: { assignedTo: true }
      })

      if (!lastAssignment) {
        return employees[0] // First employee if no recent assignments
      }

      // Find next employee in rotation
      const lastAssigneeIndex = employees.findIndex(emp => emp.userId === lastAssignment.assignedToId)
      const nextIndex = (lastAssigneeIndex + 1) % employees.length
      
      return employees[nextIndex]

    } catch (error) {
      console.error('Error in round robin assignment:', error)
      return null
    }
  }

  /**
   * Workload-based assignment strategy
   */
  private static async workloadBasedAssignment(targetUserIds: string[]): Promise<EmployeeWorkload | null> {
    try {
      const employees = await this.getAvailableEmployees(targetUserIds)
      if (employees.length === 0) return null

      // Find employee with lowest workload percentage
      return employees.reduce((best, current) => {
        const bestUtilization = best.activeLeads / best.maxCapacity
        const currentUtilization = current.activeLeads / current.maxCapacity
        return currentUtilization < bestUtilization ? current : best
      })

    } catch (error) {
      console.error('Error in workload-based assignment:', error)
      return null
    }
  }

  /**
   * Skill-based assignment strategy
   */
  private static async skillBasedAssignment(lead: any, targetUserIds: string[]): Promise<EmployeeWorkload | null> {
    try {
      const employees = await this.getAvailableEmployees(targetUserIds)
      if (employees.length === 0) return null

      // Score employees based on skills matching lead requirements
      const scoredEmployees = employees.map(employee => {
        let score = 0

        // Loan type expertise
        if (employee.skills.includes(lead.loanType)) score += 40
        if (employee.skills.includes('ALL_LOANS')) score += 30

        // Amount range expertise
        if (lead.loanAmount >= 1000000 && employee.skills.includes('HIGH_VALUE')) score += 20
        if (lead.loanAmount < 500000 && employee.skills.includes('RETAIL')) score += 20

        // Performance bonus
        if (employee.performance.conversionRate > 15) score += 15
        if (employee.performance.averageResponseTime < 2) score += 10

        // Workload penalty
        const utilization = employee.activeLeads / employee.maxCapacity
        score -= utilization * 20

        return { employee, score }
      })

      // Return employee with highest score
      const bestMatch = scoredEmployees.reduce((best, current) => 
        current.score > best.score ? current : best
      )

      return bestMatch.employee

    } catch (error) {
      console.error('Error in skill-based assignment:', error)
      return null
    }
  }

  /**
   * Get available employees for assignment
   */
  private static async getAvailableEmployees(targetUserIds?: string[]): Promise<EmployeeWorkload[]> {
    try {
      const whereClause: any = {
        isActive: true,
        role: 'EMPLOYEE'
      }

      if (targetUserIds && targetUserIds.length > 0) {
        whereClause.id = { in: targetUserIds }
      }

      const users = await prisma.user.findMany({
        where: whereClause,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          lastLogin: true
        }
      })

      const employeeWorkloads: EmployeeWorkload[] = []

      for (const user of users) {
        const workload = await this.getEmployeeWorkload(user.id)
        
        // Only include if under capacity and available
        if (workload.activeLeads < workload.maxCapacity && workload.availability.isAvailable) {
          employeeWorkloads.push(workload)
        }
      }

      return employeeWorkloads

    } catch (error) {
      console.error('Error getting available employees:', error)
      return []
    }
  }

  /**
   * Get employee workload and performance metrics
   */
  private static async getEmployeeWorkload(userId: string): Promise<EmployeeWorkload> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          lastLogin: true
        }
      })

      if (!user) {
        throw new Error('User not found')
      }

      // Count active leads
      const activeLeads = await prisma.lead.count({
        where: {
          assignedToId: userId,
          status: { notIn: ['CLOSED_WON', 'CLOSED_LOST'] }
        }
      })

      // Get performance metrics
      const totalLeads = await prisma.lead.count({
        where: { assignedToId: userId }
      })

      const successfulClosures = await prisma.lead.count({
        where: {
          assignedToId: userId,
          status: 'CLOSED_WON'
        }
      })

      const conversionRate = totalLeads > 0 ? (successfulClosures / totalLeads) * 100 : 0

      // Calculate average response time (simplified)
      const averageResponseTime = 2.5 // This would be calculated from actual message response times

      // Determine availability
      const isRecentlyActive = user.lastLogin && 
        (Date.now() - new Date(user.lastLogin).getTime()) < 4 * 60 * 60 * 1000 // 4 hours

      return {
        userId: user.id,
        userName: user.name,
        email: user.email,
        role: user.role,
        activeLeads,
        maxCapacity: 10, // This could be configurable per employee
        skills: await this.getEmployeeSkills(userId),
        availability: {
          isAvailable: isRecentlyActive || true, // Allow assignment even if not recently active
          lastActive: user.lastLogin?.toISOString() || '',
          workingHours: { start: '09:00', end: '18:00' },
          workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
        },
        performance: {
          conversionRate,
          averageResponseTime,
          totalLeadsHandled: totalLeads,
          successfulClosures
        }
      }

    } catch (error) {
      console.error('Error getting employee workload:', error)
      throw error
    }
  }

  /**
   * Get employee skills (this could be stored in database or configuration)
   */
  private static async getEmployeeSkills(userId: string): Promise<string[]> {
    // This is a simplified implementation
    // In a real system, skills would be stored in the database
    const defaultSkills = ['PERSONAL', 'BUSINESS', 'RETAIL']
    
    // You could extend this to read from a skills table or user profile
    return defaultSkills
  }

  /**
   * Perform the actual assignment
   */
  private static async performAssignment(
    leadId: string, 
    assigneeId: string, 
    strategy: string, 
    confidence: number
  ): Promise<void> {
    try {
      // Update lead assignment
      await prisma.lead.update({
        where: { id: leadId },
        data: {
          assignedToId: assigneeId,
          status: 'CONTACTED',
          updatedAt: new Date()
        }
      })

      // Log assignment activity
      await prisma.activity.create({
        data: {
          type: 'ASSIGNMENT',
          title: 'Lead Assigned',
          description: `Lead assigned using ${strategy} strategy with ${confidence}% confidence`,
          leadId,
          userId: assigneeId
        }
      })

    } catch (error) {
      console.error('Error performing assignment:', error)
      throw error
    }
  }

  /**
   * Get alternative assignee options
   */
  private static async getAlternativeAssignees(lead: any): Promise<Array<{ id: string; name: string; reason: string }>> {
    try {
      const employees = await this.getAvailableEmployees()
      
      return employees.slice(0, 3).map(emp => ({
        id: emp.userId,
        name: emp.userName,
        reason: `Available (${emp.activeLeads}/${emp.maxCapacity} leads, ${emp.performance.conversionRate.toFixed(1)}% conversion)`
      }))

    } catch (error) {
      console.error('Error getting alternative assignees:', error)
      return []
    }
  }

  /**
   * Get active assignment rules
   */
  private static async getActiveAssignmentRules(): Promise<AssignmentRule[]> {
    // This is a simplified implementation
    // In a real system, rules would be stored in the database
    return [
      {
        id: '1',
        name: 'High Value Loans',
        priority: 1,
        conditions: {
          loanAmountMin: 1000000,
          leadPriority: ['HIGH', 'URGENT']
        },
        assignmentStrategy: 'SKILL_BASED',
        targetUsers: [], // All skilled employees
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: '2',
        name: 'Business Loans',
        priority: 2,
        conditions: {
          loanType: ['BUSINESS']
        },
        assignmentStrategy: 'SKILL_BASED',
        targetUsers: [],
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: '3',
        name: 'Round Robin Default',
        priority: 999,
        conditions: {},
        assignmentStrategy: 'ROUND_ROBIN',
        targetUsers: [],
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ]
  }

  /**
   * Find matching assignment rule for lead
   */
  private static findMatchingRule(lead: any, rules: AssignmentRule[]): AssignmentRule | null {
    // Sort rules by priority
    const sortedRules = rules.filter(rule => rule.isActive).sort((a, b) => a.priority - b.priority)

    for (const rule of sortedRules) {
      if (this.doesLeadMatchRule(lead, rule)) {
        return rule
      }
    }

    return null
  }

  /**
   * Check if lead matches rule conditions
   */
  private static doesLeadMatchRule(lead: any, rule: AssignmentRule): boolean {
    const conditions = rule.conditions

    // Check loan type
    if (conditions.loanType && !conditions.loanType.includes(lead.loanType)) {
      return false
    }

    // Check loan amount range
    if (conditions.loanAmountMin && lead.loanAmount < conditions.loanAmountMin) {
      return false
    }
    if (conditions.loanAmountMax && lead.loanAmount > conditions.loanAmountMax) {
      return false
    }

    // Check lead priority
    if (conditions.leadPriority && !conditions.leadPriority.includes(lead.priority)) {
      return false
    }

    // Check lead source
    if (conditions.leadSource && !conditions.leadSource.includes(lead.source)) {
      return false
    }

    // Check time of day (if specified)
    if (conditions.timeOfDay) {
      const now = new Date()
      const currentHour = now.getHours()
      const startHour = parseInt(conditions.timeOfDay.start.split(':')[0])
      const endHour = parseInt(conditions.timeOfDay.end.split(':')[0])
      
      if (currentHour < startHour || currentHour > endHour) {
        return false
      }
    }

    // Check day of week (if specified)
    if (conditions.dayOfWeek) {
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      const currentDay = dayNames[new Date().getDay()]
      
      if (!conditions.dayOfWeek.includes(currentDay)) {
        return false
      }
    }

    return true
  }

  /**
   * Transfer lead from one employee to another
   */
  static async transferLead(
    leadId: string, 
    fromUserId: string, 
    toUserId: string, 
    reason: string
  ): Promise<AssignmentResult> {
    try {
      // Validate users
      const [fromUser, toUser] = await Promise.all([
        prisma.user.findUnique({ where: { id: fromUserId } }),
        prisma.user.findUnique({ where: { id: toUserId, isActive: true } })
      ])

      if (!fromUser || !toUser) {
        return {
          success: false,
          reason: 'Invalid user(s) for transfer',
          confidence: 0
        }
      }

      // Check target user capacity
      const workload = await this.getEmployeeWorkload(toUserId)
      if (workload.activeLeads >= workload.maxCapacity) {
        return {
          success: false,
          reason: `Target employee ${toUser.name} is at maximum capacity`,
          confidence: 0
        }
      }

      // Perform transfer
      await prisma.lead.update({
        where: { id: leadId },
        data: {
          assignedToId: toUserId,
          updatedAt: new Date()
        }
      })

      // Log transfer activity
      await prisma.activity.create({
        data: {
          type: 'TRANSFER',
          title: 'Lead Transferred',
          description: `Lead transferred from ${fromUser.name} to ${toUser.name}. Reason: ${reason}`,
          leadId,
          userId: toUserId
        }
      })

      return {
        success: true,
        assignedTo: {
          id: toUser.id,
          name: toUser.name,
          email: toUser.email
        },
        reason: `Transferred: ${reason}`,
        confidence: 100
      }

    } catch (error) {
      console.error('Error transferring lead:', error)
      return {
        success: false,
        reason: `Transfer failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        confidence: 0
      }
    }
  }

  /**
   * Process lead escalations based on rules
   */
  static async processEscalations(): Promise<{
    processed: number
    escalated: number
    errors: string[]
  }> {
    const results = {
      processed: 0,
      escalated: 0,
      errors: [] as string[]
    }

    try {
      // Get escalation rules
      const escalationRules = await this.getActiveEscalationRules()

      // Get leads that might need escalation
      const leadsToCheck = await prisma.lead.findMany({
        where: {
          status: { notIn: ['CLOSED_WON', 'CLOSED_LOST'] },
          assignedToId: { not: null }
        },
        include: {
          assignedTo: true,
          activities: {
            orderBy: { createdAt: 'desc' },
            take: 1
          }
        }
      })

      for (const lead of leadsToCheck) {
        results.processed++

        try {
          for (const rule of escalationRules) {
            if (await this.shouldEscalateLead(lead, rule)) {
              await this.executeEscalation(lead, rule)
              results.escalated++
              break // Only apply first matching rule
            }
          }
        } catch (error) {
          results.errors.push(`Lead ${lead.id}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }

    } catch (error) {
      results.errors.push(`Escalation processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    return results
  }

  /**
   * Check if lead should be escalated based on rule
   */
  private static async shouldEscalateLead(lead: any, rule: EscalationRule): Promise<boolean> {
    const conditions = rule.conditions

    // Check no response time
    if (conditions.noResponseHours) {
      const lastActivity = lead.activities[0]
      if (lastActivity) {
        const hoursSinceLastActivity = (Date.now() - new Date(lastActivity.createdAt).getTime()) / (1000 * 60 * 60)
        if (hoursSinceLastActivity < conditions.noResponseHours) {
          return false
        }
      }
    }

    // Check lead age
    if (conditions.leadAge) {
      const leadAgeHours = (Date.now() - new Date(lead.createdAt).getTime()) / (1000 * 60 * 60)
      if (leadAgeHours < conditions.leadAge) {
        return false
      }
    }

    // Check priority
    if (conditions.priority && !conditions.priority.includes(lead.priority)) {
      return false
    }

    // Check status
    if (conditions.status && !conditions.status.includes(lead.status)) {
      return false
    }

    return true
  }

  /**
   * Execute escalation actions
   */
  private static async executeEscalation(lead: any, rule: EscalationRule): Promise<void> {
    for (const action of rule.escalationActions) {
      try {
        switch (action.type) {
          case 'REASSIGN':
            if (action.targetUserId) {
              await this.transferLead(lead.id, lead.assignedToId, action.targetUserId, `Escalation: ${rule.name}`)
            }
            break

          case 'NOTIFY_MANAGER':
            // Find manager (admin users)
            const managers = await prisma.user.findMany({
              where: { role: 'ADMIN', isActive: true }
            })
            
            for (const manager of managers) {
              await prisma.activity.create({
                data: {
                  type: 'NOTIFICATION',
                  title: 'Lead Escalation Alert',
                  description: action.notificationMessage || `Lead ${lead.name} requires attention`,
                  leadId: lead.id,
                  userId: manager.id
                }
              })
            }
            break

          case 'INCREASE_PRIORITY':
            const newPriority = lead.priority === 'LOW' ? 'MEDIUM' : 
                              lead.priority === 'MEDIUM' ? 'HIGH' : 'URGENT'
            
            await prisma.lead.update({
              where: { id: lead.id },
              data: { priority: newPriority }
            })
            break

          case 'ADD_TO_CAMPAIGN':
            if (action.campaignId) {
              // Add lead to follow-up campaign
              // This would integrate with campaign system
            }
            break
        }
      } catch (error) {
        console.error(`Error executing escalation action ${action.type}:`, error)
      }
    }

    // Log escalation
    await prisma.activity.create({
      data: {
        type: 'ESCALATION',
        title: 'Lead Escalated',
        description: `Lead escalated using rule: ${rule.name}`,
        leadId: lead.id,
        userId: lead.assignedToId
      }
    })
  }

  /**
   * Get active escalation rules
   */
  private static async getActiveEscalationRules(): Promise<EscalationRule[]> {
    // This is a simplified implementation
    // In a real system, rules would be stored in the database
    return [
      {
        id: '1',
        name: 'No Response 24 Hours',
        conditions: {
          noResponseHours: 24,
          priority: ['HIGH', 'URGENT']
        },
        escalationActions: [
          {
            type: 'NOTIFY_MANAGER',
            notificationMessage: 'High priority lead has not been contacted in 24 hours'
          }
        ],
        isActive: true
      },
      {
        id: '2',
        name: 'Stale Lead 72 Hours',
        conditions: {
          leadAge: 72,
          status: ['NEW', 'CONTACTED']
        },
        escalationActions: [
          {
            type: 'INCREASE_PRIORITY'
          },
          {
            type: 'NOTIFY_MANAGER',
            notificationMessage: 'Lead is stale and needs attention'
          }
        ],
        isActive: true
      }
    ]
  }

  /**
   * Get assignment statistics
   */
  static async getAssignmentStats(days: number = 30): Promise<{
    totalAssignments: number
    averageAssignmentTime: number
    assignmentsByStrategy: Record<string, number>
    employeeWorkloads: EmployeeWorkload[]
    escalations: number
  }> {
    try {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      // Get assignment activities
      const assignments = await prisma.activity.findMany({
        where: {
          type: 'ASSIGNMENT',
          createdAt: { gte: startDate }
        }
      })

      // Get escalation activities
      const escalations = await prisma.activity.count({
        where: {
          type: 'ESCALATION',
          createdAt: { gte: startDate }
        }
      })

      // Calculate assignment strategies
      const assignmentsByStrategy: Record<string, number> = {}
      assignments.forEach(activity => {
        const strategy = activity.description?.match(/using (\w+) strategy/)?.[1] || 'UNKNOWN'
        assignmentsByStrategy[strategy] = (assignmentsByStrategy[strategy] || 0) + 1
      })

      // Get employee workloads
      const employees = await prisma.user.findMany({
        where: { role: 'EMPLOYEE', isActive: true }
      })

      const employeeWorkloads = await Promise.all(
        employees.map(emp => this.getEmployeeWorkload(emp.id))
      )

      return {
        totalAssignments: assignments.length,
        averageAssignmentTime: 0.5, // This would be calculated from actual data
        assignmentsByStrategy,
        employeeWorkloads,
        escalations
      }

    } catch (error) {
      console.error('Error getting assignment stats:', error)
      return {
        totalAssignments: 0,
        averageAssignmentTime: 0,
        assignmentsByStrategy: {},
        employeeWorkloads: [],
        escalations: 0
      }
    }
  }
}

export default LeadAssignmentService