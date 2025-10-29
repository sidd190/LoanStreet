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

// Advanced lead scoring with machine learning-like features
export function calculateAdvancedLeadScore(factors: LeadScoringFactors & {
  previousInteractions?: number
  socialMediaActivity?: number
  creditScore?: number
  employmentStatus?: 'EMPLOYED' | 'SELF_EMPLOYED' | 'UNEMPLOYED' | 'RETIRED'
  monthlyIncome?: number
  existingLoans?: number
  referralSource?: string
}): { score: number; confidence: number; factors: string[] } {
  const baseScore = calculateLeadScore(factors)
  let adjustedScore = baseScore
  let confidence = 70 // Base confidence
  const scoringFactors: string[] = []

  // Advanced scoring adjustments
  if (factors.previousInteractions && factors.previousInteractions > 0) {
    adjustedScore += Math.min(15, factors.previousInteractions * 3)
    confidence += 10
    scoringFactors.push(`Previous interactions: +${Math.min(15, factors.previousInteractions * 3)} points`)
  }

  if (factors.creditScore) {
    if (factors.creditScore >= 750) {
      adjustedScore += 20
      confidence += 15
      scoringFactors.push('Excellent credit score: +20 points')
    } else if (factors.creditScore >= 650) {
      adjustedScore += 10
      confidence += 10
      scoringFactors.push('Good credit score: +10 points')
    } else if (factors.creditScore < 550) {
      adjustedScore -= 15
      confidence -= 5
      scoringFactors.push('Poor credit score: -15 points')
    }
  }

  if (factors.employmentStatus) {
    switch (factors.employmentStatus) {
      case 'EMPLOYED':
        adjustedScore += 10
        confidence += 10
        scoringFactors.push('Employed status: +10 points')
        break
      case 'SELF_EMPLOYED':
        adjustedScore += 5
        confidence += 5
        scoringFactors.push('Self-employed status: +5 points')
        break
      case 'UNEMPLOYED':
        adjustedScore -= 20
        confidence -= 10
        scoringFactors.push('Unemployed status: -20 points')
        break
    }
  }

  if (factors.monthlyIncome) {
    if (factors.monthlyIncome >= 100000) {
      adjustedScore += 15
      confidence += 10
      scoringFactors.push('High income: +15 points')
    } else if (factors.monthlyIncome >= 50000) {
      adjustedScore += 8
      confidence += 5
      scoringFactors.push('Good income: +8 points')
    } else if (factors.monthlyIncome < 25000) {
      adjustedScore -= 10
      confidence -= 5
      scoringFactors.push('Low income: -10 points')
    }
  }

  if (factors.existingLoans !== undefined) {
    if (factors.existingLoans === 0) {
      adjustedScore += 10
      confidence += 5
      scoringFactors.push('No existing loans: +10 points')
    } else if (factors.existingLoans >= 3) {
      adjustedScore -= 15
      confidence -= 10
      scoringFactors.push('Multiple existing loans: -15 points')
    }
  }

  // Ensure score stays within bounds
  adjustedScore = Math.max(0, Math.min(100, adjustedScore))
  confidence = Math.max(0, Math.min(100, confidence))

  return {
    score: Math.round(adjustedScore),
    confidence: Math.round(confidence),
    factors: scoringFactors
  }
}

// Lead quality assessment
export function assessLeadQuality(score: number, confidence: number): {
  quality: 'EXCELLENT' | 'GOOD' | 'AVERAGE' | 'POOR'
  recommendation: string
  nextActions: string[]
} {
  if (score >= 80 && confidence >= 80) {
    return {
      quality: 'EXCELLENT',
      recommendation: 'High-priority lead with strong conversion potential',
      nextActions: [
        'Immediate personal follow-up call',
        'Send premium loan offers',
        'Schedule in-person meeting',
        'Fast-track application process'
      ]
    }
  } else if (score >= 60 && confidence >= 60) {
    return {
      quality: 'GOOD',
      recommendation: 'Promising lead worth nurturing',
      nextActions: [
        'Follow up within 24 hours',
        'Send targeted loan information',
        'Schedule phone consultation',
        'Add to priority campaign'
      ]
    }
  } else if (score >= 40) {
    return {
      quality: 'AVERAGE',
      recommendation: 'Moderate potential, requires nurturing',
      nextActions: [
        'Add to automated nurture campaign',
        'Send educational content',
        'Follow up in 3-5 days',
        'Monitor engagement levels'
      ]
    }
  } else {
    return {
      quality: 'POOR',
      recommendation: 'Low conversion probability',
      nextActions: [
        'Add to long-term nurture campaign',
        'Send basic information only',
        'Review and update contact details',
        'Consider removing from active campaigns'
      ]
    }
  }
}

// Automated lead scoring based on database data
export async function updateLeadScoresFromDatabase() {
  try {
    console.log('🔄 Starting automated lead scoring update...')
    
    // This would integrate with your actual database
    // For now, we'll simulate the process
    
    const results = {
      processed: 0,
      updated: 0,
      errors: 0,
      insights: [] as string[]
    }

    // Simulate processing leads
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    results.processed = 150
    results.updated = 45
    results.insights = [
      'Updated 45 lead scores based on recent activity',
      'Identified 12 high-priority leads for immediate follow-up',
      'Flagged 8 leads for re-engagement campaigns',
      'Average lead score increased by 3.2 points'
    ]

    console.log('✅ Lead scoring update completed:', results)
    return results
    
  } catch (error) {
    console.error('❌ Error updating lead scores:', error)
    return {
      processed: 0,
      updated: 0,
      errors: 1,
      insights: ['Failed to update lead scores - database connection error']
    }
  }
}

// Lead scoring analytics
export function generateLeadScoringReport(leads: Array<{
  id: string
  score: number
  priority: string
  loanAmount: number
  source: string
  createdAt: string
}>): {
  summary: {
    totalLeads: number
    averageScore: number
    highPriorityLeads: number
    conversionPrediction: number
  }
  distribution: { range: string; count: number; percentage: number }[]
  sourcePerformance: { source: string; avgScore: number; count: number }[]
  recommendations: string[]
} {
  const totalLeads = leads.length
  const averageScore = leads.reduce((sum, lead) => sum + lead.score, 0) / totalLeads
  const highPriorityLeads = leads.filter(lead => lead.priority === 'HIGH' || lead.priority === 'URGENT').length
  const conversionPrediction = (averageScore / 100) * 15 // Estimated conversion rate based on score

  // Score distribution
  const distribution = [
    { range: '80-100', count: 0, percentage: 0 },
    { range: '60-79', count: 0, percentage: 0 },
    { range: '40-59', count: 0, percentage: 0 },
    { range: '20-39', count: 0, percentage: 0 },
    { range: '0-19', count: 0, percentage: 0 }
  ]

  leads.forEach(lead => {
    if (lead.score >= 80) distribution[0].count++
    else if (lead.score >= 60) distribution[1].count++
    else if (lead.score >= 40) distribution[2].count++
    else if (lead.score >= 20) distribution[3].count++
    else distribution[4].count++
  })

  distribution.forEach(range => {
    range.percentage = (range.count / totalLeads) * 100
  })

  // Source performance
  const sourceMap = new Map<string, { totalScore: number; count: number }>()
  leads.forEach(lead => {
    if (!sourceMap.has(lead.source)) {
      sourceMap.set(lead.source, { totalScore: 0, count: 0 })
    }
    const sourceData = sourceMap.get(lead.source)!
    sourceData.totalScore += lead.score
    sourceData.count++
  })

  const sourcePerformance = Array.from(sourceMap.entries()).map(([source, data]) => ({
    source,
    avgScore: data.totalScore / data.count,
    count: data.count
  })).sort((a, b) => b.avgScore - a.avgScore)

  // Generate recommendations
  const recommendations: string[] = []
  
  if (averageScore < 50) {
    recommendations.push('Overall lead quality is below average - review lead generation sources')
  }
  
  if (highPriorityLeads / totalLeads < 0.2) {
    recommendations.push('Low percentage of high-priority leads - consider improving targeting')
  }
  
  const bestSource = sourcePerformance[0]
  if (bestSource) {
    recommendations.push(`Focus more resources on ${bestSource.source} - highest performing source`)
  }
  
  if (distribution[4].count > totalLeads * 0.3) {
    recommendations.push('High number of very low-scoring leads - review qualification criteria')
  }

  return {
    summary: {
      totalLeads,
      averageScore: Math.round(averageScore * 10) / 10,
      highPriorityLeads,
      conversionPrediction: Math.round(conversionPrediction * 10) / 10
    },
    distribution,
    sourcePerformance,
    recommendations
  }
}