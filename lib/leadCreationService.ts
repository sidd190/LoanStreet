import { PrismaClient } from '@prisma/client'
import { calculateLeadScore, getLeadPriority } from './leadScoring'

const prisma = new PrismaClient()

// Loan-related keywords for automatic lead detection
const LOAN_KEYWORDS = {
  PERSONAL: [
    'personal loan', 'instant loan', 'quick loan', 'emergency loan', 'cash loan',
    'salary loan', 'urgent money', 'need money', 'financial help', 'loan apply'
  ],
  BUSINESS: [
    'business loan', 'working capital', 'business finance', 'startup loan',
    'msme loan', 'commercial loan', 'business funding', 'expand business'
  ],
  HOME: [
    'home loan', 'house loan', 'property loan', 'mortgage', 'housing finance',
    'buy house', 'home purchase', 'property finance', 'real estate loan'
  ],
  VEHICLE: [
    'car loan', 'auto loan', 'vehicle loan', 'bike loan', 'two wheeler loan',
    'four wheeler loan', 'vehicle finance', 'buy car', 'car finance'
  ],
  EDUCATION: [
    'education loan', 'student loan', 'study loan', 'course loan',
    'college loan', 'university loan', 'higher education', 'study abroad'
  ],
  GOLD: [
    'gold loan', 'loan against gold', 'gold mortgage', 'pledge gold',
    'gold finance', 'ornament loan', 'jewelry loan'
  ]
}

// Amount extraction patterns
const AMOUNT_PATTERNS = [
  /(?:need|want|looking for|require)\s*(?:rs\.?|₹|rupees?)?\s*(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:lakh|lac|l|crore|cr|k|thousand)?/i,
  /(?:loan|amount|money)\s*(?:of|for)?\s*(?:rs\.?|₹|rupees?)?\s*(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:lakh|lac|l|crore|cr|k|thousand)?/i,
  /(?:rs\.?|₹|rupees?)\s*(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:lakh|lac|l|crore|cr|k|thousand)?/i
]

// Contact information extraction patterns
const CONTACT_PATTERNS = {
  phone: /(?:\+91[-\s]?)?(?:[6-9]\d{9}|\d{10})/g,
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  name: /(?:my name is|i am|this is)\s+([a-zA-Z\s]{2,30})/i
}

interface LeadCreationResult {
  success: boolean
  leadId?: string
  lead?: any
  reason?: string
  confidence: number
  detectedKeywords: string[]
  extractedInfo: {
    loanType?: string
    amount?: number
    name?: string
    phone?: string
    email?: string
  }
}

interface MessageAnalysis {
  hasLoanKeywords: boolean
  loanType?: keyof typeof LOAN_KEYWORDS
  confidence: number
  detectedKeywords: string[]
  extractedAmount?: number
  extractedContact?: {
    name?: string
    phone?: string
    email?: string
  }
}

export class LeadCreationService {
  /**
   * Analyze incoming message for loan-related content
   */
  static analyzeMessage(content: string, contactPhone?: string): MessageAnalysis {
    const normalizedContent = content.toLowerCase().trim()
    let hasLoanKeywords = false
    let detectedLoanType: keyof typeof LOAN_KEYWORDS | undefined
    let confidence = 0
    const detectedKeywords: string[] = []

    // Check for loan keywords
    for (const [loanType, keywords] of Object.entries(LOAN_KEYWORDS)) {
      const matchedKeywords = keywords.filter(keyword => 
        normalizedContent.includes(keyword.toLowerCase())
      )
      
      if (matchedKeywords.length > 0) {
        hasLoanKeywords = true
        detectedKeywords.push(...matchedKeywords)
        
        // Calculate confidence based on keyword matches
        const keywordConfidence = (matchedKeywords.length / keywords.length) * 100
        if (keywordConfidence > confidence) {
          confidence = keywordConfidence
          detectedLoanType = loanType as keyof typeof LOAN_KEYWORDS
        }
      }
    }

    // Extract loan amount
    let extractedAmount: number | undefined
    for (const pattern of AMOUNT_PATTERNS) {
      const match = normalizedContent.match(pattern)
      if (match) {
        let amount = parseFloat(match[1].replace(/,/g, ''))
        
        // Convert based on unit
        const unit = match[0].toLowerCase()
        if (unit.includes('lakh') || unit.includes('lac') || unit.includes('l')) {
          amount *= 100000
        } else if (unit.includes('crore') || unit.includes('cr')) {
          amount *= 10000000
        } else if (unit.includes('k') || unit.includes('thousand')) {
          amount *= 1000
        }
        
        extractedAmount = amount
        confidence += 20 // Boost confidence if amount is mentioned
        break
      }
    }

    // Extract contact information
    const extractedContact: { name?: string; phone?: string; email?: string } = {}
    
    // Extract name
    const nameMatch = content.match(CONTACT_PATTERNS.name)
    if (nameMatch) {
      extractedContact.name = nameMatch[1].trim()
      confidence += 10
    }

    // Extract phone (if different from sender)
    const phoneMatches = content.match(CONTACT_PATTERNS.phone)
    if (phoneMatches && phoneMatches[0] !== contactPhone) {
      extractedContact.phone = phoneMatches[0]
      confidence += 10
    }

    // Extract email
    const emailMatches = content.match(CONTACT_PATTERNS.email)
    if (emailMatches) {
      extractedContact.email = emailMatches[0]
      confidence += 10
    }

    return {
      hasLoanKeywords,
      loanType: detectedLoanType,
      confidence: Math.min(confidence, 100),
      detectedKeywords,
      extractedAmount,
      extractedContact: Object.keys(extractedContact).length > 0 ? extractedContact : undefined
    }
  }

  /**
   * Create lead from incoming message
   */
  static async createLeadFromMessage(
    messageId: string,
    contactId: string,
    content: string,
    contactPhone: string,
    contactName?: string,
    contactEmail?: string
  ): Promise<LeadCreationResult> {
    try {
      // Analyze the message
      const analysis = this.analyzeMessage(content, contactPhone)

      // Check if message has loan-related content
      if (!analysis.hasLoanKeywords || analysis.confidence < 30) {
        return {
          success: false,
          reason: 'No loan-related keywords detected or confidence too low',
          confidence: analysis.confidence,
          detectedKeywords: analysis.detectedKeywords,
          extractedInfo: {}
        }
      }

      // Check for existing lead with same contact
      const existingLead = await this.findExistingLead(contactId, contactPhone)
      if (existingLead) {
        // Update existing lead instead of creating new one
        return await this.updateExistingLead(existingLead, analysis, content)
      }

      // Prepare lead data
      const leadData = {
        name: analysis.extractedContact?.name || contactName || `Lead from ${contactPhone}`,
        phone: analysis.extractedContact?.phone || contactPhone,
        email: analysis.extractedContact?.email || contactEmail,
        loanType: analysis.loanType || 'PERSONAL',
        loanAmount: analysis.extractedAmount || 100000, // Default amount
        status: 'NEW',
        priority: 'MEDIUM',
        source: 'WHATSAPP_MESSAGE',
        contactId,
        notes: `Auto-created from message: "${content.substring(0, 100)}${content.length > 100 ? '...' : ''}"`
      }

      // Calculate lead score
      const scoringFactors = {
        responseTime: 0, // Immediate response
        messageEngagement: 1,
        loanAmount: leadData.loanAmount,
        loanType: leadData.loanType,
        source: 'WHATSAPP_MESSAGE',
        profileCompleteness: this.calculateProfileCompleteness(leadData),
        lastActivityDays: 0,
        phoneVerified: true,
        emailVerified: !!leadData.email
      }

      const score = calculateLeadScore(scoringFactors)
      const priority = getLeadPriority(score)

      // Create the lead
      const lead = await prisma.lead.create({
        data: {
          ...leadData,
          priority,
          notes: `${leadData.notes}\n\nDetected keywords: ${analysis.detectedKeywords.join(', ')}\nConfidence: ${analysis.confidence}%`
        },
        include: {
          contact: true,
          assignedTo: true
        }
      })

      // Log the lead creation activity
      await this.logLeadActivity(lead.id, 'LEAD_CREATED', `Lead auto-created from WhatsApp message with ${analysis.confidence}% confidence`)

      return {
        success: true,
        leadId: lead.id,
        lead,
        confidence: analysis.confidence,
        detectedKeywords: analysis.detectedKeywords,
        extractedInfo: {
          loanType: analysis.loanType,
          amount: analysis.extractedAmount,
          name: analysis.extractedContact?.name,
          phone: analysis.extractedContact?.phone,
          email: analysis.extractedContact?.email
        }
      }

    } catch (error) {
      console.error('Error creating lead from message:', error)
      return {
        success: false,
        reason: `Database error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        confidence: 0,
        detectedKeywords: [],
        extractedInfo: {}
      }
    }
  }

  /**
   * Find existing lead for contact to avoid duplicates
   */
  private static async findExistingLead(contactId: string, phone: string) {
    try {
      // First try to find by contactId
      let existingLead = await prisma.lead.findFirst({
        where: {
          contactId,
          status: {
            notIn: ['CLOSED_WON', 'CLOSED_LOST']
          }
        },
        include: {
          contact: true,
          assignedTo: true
        }
      })

      // If not found by contactId, try by phone
      if (!existingLead) {
        existingLead = await prisma.lead.findFirst({
          where: {
            phone,
            status: {
              notIn: ['CLOSED_WON', 'CLOSED_LOST']
            }
          },
          include: {
            contact: true,
            assignedTo: true
          }
        })
      }

      return existingLead
    } catch (error) {
      console.error('Error finding existing lead:', error)
      return null
    }
  }

  /**
   * Update existing lead with new information from message
   */
  private static async updateExistingLead(
    existingLead: any,
    analysis: MessageAnalysis,
    messageContent: string
  ): Promise<LeadCreationResult> {
    try {
      const updates: any = {
        updatedAt: new Date()
      }

      // Update loan type if detected and different
      if (analysis.loanType && analysis.loanType !== existingLead.loanType) {
        updates.loanType = analysis.loanType
      }

      // Update loan amount if detected and higher
      if (analysis.extractedAmount && analysis.extractedAmount > existingLead.loanAmount) {
        updates.loanAmount = analysis.extractedAmount
      }

      // Update contact info if extracted
      if (analysis.extractedContact?.name && !existingLead.name.includes(analysis.extractedContact.name)) {
        updates.name = analysis.extractedContact.name
      }

      if (analysis.extractedContact?.email && !existingLead.email) {
        updates.email = analysis.extractedContact.email
      }

      // Add note about the new message
      const newNote = `\n[${new Date().toISOString()}] New message: "${messageContent.substring(0, 100)}${messageContent.length > 100 ? '...' : ''}"`
      updates.notes = (existingLead.notes || '') + newNote

      // Recalculate score if significant updates
      if (updates.loanAmount || updates.loanType || updates.email) {
        const scoringFactors = {
          responseTime: 0,
          messageEngagement: 2, // Increased engagement
          loanAmount: updates.loanAmount || existingLead.loanAmount,
          loanType: updates.loanType || existingLead.loanType,
          source: existingLead.source,
          profileCompleteness: this.calculateProfileCompleteness({
            ...existingLead,
            ...updates
          }),
          lastActivityDays: 0,
          phoneVerified: true,
          emailVerified: !!(updates.email || existingLead.email)
        }

        const newScore = calculateLeadScore(scoringFactors)
        const newPriority = getLeadPriority(newScore)
        
        updates.priority = newPriority
      }

      // Update the lead
      const updatedLead = await prisma.lead.update({
        where: { id: existingLead.id },
        data: updates,
        include: {
          contact: true,
          assignedTo: true
        }
      })

      // Log the activity
      await this.logLeadActivity(
        existingLead.id,
        'LEAD_UPDATED',
        `Lead updated from new WhatsApp message with ${analysis.confidence}% confidence`
      )

      return {
        success: true,
        leadId: updatedLead.id,
        lead: updatedLead,
        confidence: analysis.confidence,
        detectedKeywords: analysis.detectedKeywords,
        extractedInfo: {
          loanType: analysis.loanType,
          amount: analysis.extractedAmount,
          name: analysis.extractedContact?.name,
          phone: analysis.extractedContact?.phone,
          email: analysis.extractedContact?.email
        }
      }

    } catch (error) {
      console.error('Error updating existing lead:', error)
      return {
        success: false,
        reason: `Error updating existing lead: ${error instanceof Error ? error.message : 'Unknown error'}`,
        confidence: analysis.confidence,
        detectedKeywords: analysis.detectedKeywords,
        extractedInfo: {}
      }
    }
  }

  /**
   * Calculate profile completeness percentage
   */
  private static calculateProfileCompleteness(leadData: any): number {
    const fields = ['name', 'phone', 'email', 'loanType', 'loanAmount']
    const filledFields = fields.filter(field => leadData[field] && leadData[field] !== '')
    return (filledFields.length / fields.length) * 100
  }

  /**
   * Log lead activity
   */
  private static async logLeadActivity(leadId: string, type: string, description: string) {
    try {
      await prisma.activity.create({
        data: {
          type,
          title: type.replace('_', ' ').toLowerCase(),
          description,
          leadId,
          userId: 'system' // System-generated activity
        }
      })
    } catch (error) {
      console.error('Error logging lead activity:', error)
    }
  }

  /**
   * Process bulk messages for lead creation
   */
  static async processBulkMessages(messages: Array<{
    id: string
    contactId: string
    content: string
    contactPhone: string
    contactName?: string
    contactEmail?: string
  }>): Promise<{
    processed: number
    leadsCreated: number
    leadsUpdated: number
    errors: string[]
  }> {
    const results = {
      processed: 0,
      leadsCreated: 0,
      leadsUpdated: 0,
      errors: [] as string[]
    }

    for (const message of messages) {
      try {
        const result = await this.createLeadFromMessage(
          message.id,
          message.contactId,
          message.content,
          message.contactPhone,
          message.contactName,
          message.contactEmail
        )

        results.processed++

        if (result.success) {
          if (result.lead) {
            // Check if it was a new lead or update
            const isNewLead = result.lead.createdAt === result.lead.updatedAt
            if (isNewLead) {
              results.leadsCreated++
            } else {
              results.leadsUpdated++
            }
          }
        } else if (result.reason && !result.reason.includes('No loan-related keywords')) {
          results.errors.push(`Message ${message.id}: ${result.reason}`)
        }

      } catch (error) {
        results.errors.push(`Message ${message.id}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    return results
  }

  /**
   * Get lead creation statistics
   */
  static async getLeadCreationStats(days: number = 30): Promise<{
    totalAutoCreated: number
    totalUpdated: number
    conversionRate: number
    topKeywords: Array<{ keyword: string; count: number }>
    sourceBreakdown: Array<{ source: string; count: number }>
  }> {
    try {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      // Get auto-created leads
      const autoCreatedLeads = await prisma.lead.findMany({
        where: {
          source: 'WHATSAPP_MESSAGE',
          createdAt: {
            gte: startDate
          }
        }
      })

      // Get activities for updates
      const updateActivities = await prisma.activity.findMany({
        where: {
          type: 'LEAD_UPDATED',
          createdAt: {
            gte: startDate
          }
        }
      })

      // Calculate conversion rate (leads that moved beyond NEW status)
      const convertedLeads = autoCreatedLeads.filter(lead => lead.status !== 'NEW')
      const conversionRate = autoCreatedLeads.length > 0 
        ? (convertedLeads.length / autoCreatedLeads.length) * 100 
        : 0

      // Extract keywords from notes (simplified)
      const keywordCounts = new Map<string, number>()
      autoCreatedLeads.forEach(lead => {
        if (lead.notes) {
          const keywordMatch = lead.notes.match(/Detected keywords: ([^\\n]+)/)
          if (keywordMatch) {
            const keywords = keywordMatch[1].split(', ')
            keywords.forEach(keyword => {
              keywordCounts.set(keyword, (keywordCounts.get(keyword) || 0) + 1)
            })
          }
        }
      })

      const topKeywords = Array.from(keywordCounts.entries())
        .map(([keyword, count]) => ({ keyword, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)

      // Source breakdown
      const sourceCounts = new Map<string, number>()
      autoCreatedLeads.forEach(lead => {
        sourceCounts.set(lead.source, (sourceCounts.get(lead.source) || 0) + 1)
      })

      const sourceBreakdown = Array.from(sourceCounts.entries())
        .map(([source, count]) => ({ source, count }))

      return {
        totalAutoCreated: autoCreatedLeads.length,
        totalUpdated: updateActivities.length,
        conversionRate,
        topKeywords,
        sourceBreakdown
      }

    } catch (error) {
      console.error('Error getting lead creation stats:', error)
      return {
        totalAutoCreated: 0,
        totalUpdated: 0,
        conversionRate: 0,
        topKeywords: [],
        sourceBreakdown: []
      }
    }
  }
}

export default LeadCreationService