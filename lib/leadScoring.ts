interface LeadScoringFactors {
  responseTime: number // Minutes to first response
  messageEngagement: number // Number of messages exchanged
  loanAmount: number
  loanType: string
  source: string
  profileCompleteness: number // Percentage of profile fields filled
  lastActivityDays: number // Days since last activity
  phoneVerified: boolean
  emailVerified: boolean
}

interface ScoringWeights {
  responseTime: number
  messageEngagement: number
  loanAmount: number
  loanType: number
  source: number
  profileCompleteness: number
  recency: number
  verification: number
}

const DEFAULT_WEIGHTS: ScoringWeights = {
  responseTime: 25, // Quick response indicates high interest
  messageEngagement: 20, // More engagement = higher intent
  loanAmount: 15, // Higher amounts may indicate serious intent
  loanType: 10, // Some loan types convert better
  source: 10, // Some sources are higher quality
  profileCompleteness: 10, // Complete profiles show commitment
  recency: 5, // Recent activity is better
  verification: 5 // Verified contacts are more reliable
}

const LOAN_TYPE_SCORES = {
  'PERSONAL': 80,
  'BUSINESS': 90,
  'HOME': 95,
  'VEHICLE': 75,
  'EDUCATION': 70,
  'GOLD': 85
}

const SOURCE_SCORES = {
  'WEBSITE_FORM': 90,
  'REFERRAL': 95,
  'WHATSAPP_CAMPAIGN': 75,
  'SMS_CAMPAIGN': 70,
  'EMAIL_CAMPAIGN': 65,
  'SOCIAL_MEDIA': 60,
  'CSV_IMPORT': 50,
  'UNKNOWN': 40
}

export function calculateLeadScore(factors: LeadScoringFactors, weights: ScoringWeights = DEFAULT_WEIGHTS): number {
  let score = 0
  let maxScore = 0

  // Response Time Score (0-100)
  // Faster response = higher score
  const responseTimeScore = Math.max(0, 100 - (factors.responseTime / 60) * 10) // Decrease by 10 points per hour
  score += responseTimeScore * (weights.responseTime / 100)
  maxScore += weights.responseTime

  // Message Engagement Score (0-100)
  // More messages = higher engagement (with diminishing returns)
  const engagementScore = Math.min(100, factors.messageEngagement * 20) // 20 points per message, max 100
  score += engagementScore * (weights.messageEngagement / 100)
  maxScore += weights.messageEngagement

  // Loan Amount Score (0-100)
  // Higher amounts get higher scores (with reasonable caps)
  let amountScore = 0
  if (factors.loanAmount >= 1000000) amountScore = 100 // 10L+
  else if (factors.loanAmount >= 500000) amountScore = 80 // 5L+
  else if (factors.loanAmount >= 200000) amountScore = 60 // 2L+
  else if (factors.loanAmount >= 100000) amountScore = 40 // 1L+
  else if (factors.loanAmount >= 50000) amountScore = 20 // 50K+
  else amountScore = 10 // Below 50K

  score += amountScore * (weights.loanAmount / 100)
  maxScore += weights.loanAmount

  // Loan Type Score (0-100)
  const loanTypeScore = LOAN_TYPE_SCORES[factors.loanType as keyof typeof LOAN_TYPE_SCORES] || 50
  score += loanTypeScore * (weights.loanType / 100)
  maxScore += weights.loanType

  // Source Score (0-100)
  const sourceScore = SOURCE_SCORES[factors.source as keyof typeof SOURCE_SCORES] || 40
  score += sourceScore * (weights.source / 100)
  maxScore += weights.source

  // Profile Completeness Score (0-100)
  score += factors.profileCompleteness * (weights.profileCompleteness / 100)
  maxScore += weights.profileCompleteness

  // Recency Score (0-100)
  // Recent activity is better
  const recencyScore = Math.max(0, 100 - factors.lastActivityDays * 5) // Decrease by 5 points per day
  score += recencyScore * (weights.recency / 100)
  maxScore += weights.recency

  // Verification Score (0-100)
  const verificationScore = (factors.phoneVerified ? 50 : 0) + (factors.emailVerified ? 50 : 0)
  score += verificationScore * (weights.verification / 100)
  maxScore += weights.verification

  // Normalize to 0-100 scale
  return Math.round((score / maxScore) * 100)
}

export function getLeadPriority(score: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' {
  if (score >= 80) return 'URGENT'
  if (score >= 60) return 'HIGH'
  if (score >= 40) return 'MEDIUM'
  return 'LOW'
}

export function getScoreInsights(factors: LeadScoringFactors): string[] {
  const insights: string[] = []

  if (factors.responseTime <= 30) {
    insights.push('🟢 Quick response time indicates high interest')
  } else if (factors.responseTime > 1440) {
    insights.push('🔴 Slow response time - may need follow-up')
  }

  if (factors.messageEngagement >= 5) {
    insights.push('🟢 High engagement with multiple messages')
  } else if (factors.messageEngagement === 0) {
    insights.push('🔴 No message engagement yet')
  }

  if (factors.loanAmount >= 500000) {
    insights.push('🟢 High loan amount indicates serious intent')
  }

  if (factors.profileCompleteness >= 80) {
    insights.push('🟢 Complete profile shows commitment')
  } else if (factors.profileCompleteness < 50) {
    insights.push('🔴 Incomplete profile - needs more information')
  }

  if (factors.lastActivityDays === 0) {
    insights.push('🟢 Recent activity - hot lead')
  } else if (factors.lastActivityDays > 7) {
    insights.push('🔴 No recent activity - needs re-engagement')
  }

  if (factors.phoneVerified && factors.emailVerified) {
    insights.push('🟢 Fully verified contact')
  } else if (!factors.phoneVerified && !factors.emailVerified) {
    insights.push('🔴 Unverified contact - verify details')
  }

  return insights
}

export function calculateBulkLeadScores(leads: Array<{
  id: string
  factors: LeadScoringFactors
}>): Array<{
  id: string
  score: number
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  insights: string[]
}> {
  return leads.map(lead => ({
    id: lead.id,
    score: calculateLeadScore(lead.factors),
    priority: getLeadPriority(calculateLeadScore(lead.factors)),
    insights: getScoreInsights(lead.factors)
  }))
}

// Automated lead scoring based on database data
export async function updateLeadScoresFromDatabase() {
  // This would be called by a cron job
  // Implementation would fetch leads from database and update scores
  console.log('Updating lead scores from database...')
  
  // Pseudo-code:
  // 1. Fetch all active leads
  // 2. For each lead, calculate factors from related data
  // 3. Calculate new score
  // 4. Update lead priority if changed
  // 5. Log scoring activity
  
  return {
    processed: 0,
    updated: 0,
    errors: 0
  }
}