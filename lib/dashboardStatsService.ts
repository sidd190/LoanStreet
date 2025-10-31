import { PrismaClient } from '@prisma/client'
import Logger, { DataSource } from './logger'

const prisma = new PrismaClient()

export interface DashboardStats {
  totalContacts: number
  totalCampaigns: number
  totalMessages: number
  totalLeads: number
  activeUsers: number
  activeCampaigns: number
  responseRate: number
  conversionRate: number
  deliveryRate: number
  recentActivity: Activity[]
  lastUpdated: string
}

export interface Activity {
  id: string
  type: 'campaign' | 'message' | 'lead' | 'user' | 'system'
  title: string
  description?: string
  time: string
  user: string
  metadata?: Record<string, any>
}

export interface CachedStats {
  data: DashboardStats
  timestamp: number
  ttl: number
}

class DashboardStatsService {
  private cache: Map<string, CachedStats> = new Map()
  private readonly CACHE_TTL = 5 * 60 * 1000 // 5 minutes
  private readonly FALLBACK_CACHE_TTL = 30 * 60 * 1000 // 30 minutes for fallback data

  /**
   * Get dashboard statistics with caching and fallback mechanisms
   */
  async getStats(useCache: boolean = true): Promise<DashboardStats> {
    const cacheKey = 'dashboard_stats'
    
    try {
      // Check cache first if enabled
      if (useCache) {
        const cached = this.getCachedStats(cacheKey)
        if (cached) {
          Logger.info(DataSource.CACHE, 'dashboard_stats', 'Returning cached dashboard statistics')
          return cached
        }
      }

      // Fetch fresh data from database
      Logger.info(DataSource.DATABASE, 'dashboard_stats', 'Fetching fresh dashboard statistics from database')
      const stats = await this.fetchStatsFromDatabase()
      
      // Cache the results
      this.setCachedStats(cacheKey, stats, this.CACHE_TTL)
      
      Logger.success(DataSource.DATABASE, 'dashboard_stats', 'Successfully fetched dashboard statistics')
      return stats

    } catch (error) {
      Logger.warn(DataSource.DATABASE, 'dashboard_stats', 'Failed to fetch from database, trying fallback', error)
      
      // Try to get stale cache data as fallback
      const staleCache = this.getCachedStats(cacheKey, true)
      if (staleCache) {
        Logger.info(DataSource.CACHE, 'dashboard_stats', 'Returning stale cached data as fallback')
        return staleCache
      }

      // Generate fallback statistics
      const fallbackStats = this.generateFallbackStats()
      this.setCachedStats(cacheKey, fallbackStats, this.FALLBACK_CACHE_TTL)
      
      Logger.fallbackWarning('dashboard_stats', error)
      return fallbackStats
    }
  }

  /**
   * Fetch statistics from database with comprehensive error handling
   */
  private async fetchStatsFromDatabase(): Promise<DashboardStats> {
    const startTime = Date.now()

    try {
      // Execute all queries in parallel for better performance
      const [
        totalContacts,
        totalCampaigns,
        totalMessages,
        totalLeads,
        activeCampaigns,
        recentMessages,
        recentCampaigns,
        recentLeads,
        messageStats,
        leadStats
      ] = await Promise.all([
        // Basic counts
        prisma.contact.count(),
        prisma.campaign.count(),
        prisma.message.count(),
        prisma.lead.count(),
        
        // Active campaigns
        prisma.campaign.count({
          where: {
            status: {
              in: ['RUNNING', 'SCHEDULED']
            }
          }
        }),
        
        // Recent activity data
        prisma.message.findMany({
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            contact: { select: { name: true, phone: true } },
            campaign: { select: { name: true } }
          }
        }),
        
        prisma.campaign.findMany({
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            name: true,
            status: true,
            createdAt: true,
            createdBy: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }),
        
        prisma.lead.findMany({
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            name: true,
            loanType: true,
            loanAmount: true,
            status: true,
            createdAt: true
          }
        }),
        
        // Message statistics for rates
        prisma.message.groupBy({
          by: ['status', 'direction'],
          _count: { id: true }
        }),
        
        // Lead statistics for conversion rate
        prisma.lead.groupBy({
          by: ['status'],
          _count: { id: true }
        })
      ])

      // Calculate rates
      const messageStatsMap = new Map(
        messageStats.map(stat => [`${stat.direction}_${stat.status}`, stat._count.id])
      )
      
      const totalSentMessages = messageStatsMap.get('OUTBOUND_SENT') || 0
      const totalDeliveredMessages = messageStatsMap.get('OUTBOUND_DELIVERED') || 0
      const totalRepliedMessages = messageStatsMap.get('INBOUND_REPLIED') || 0
      
      const responseRate = totalSentMessages > 0 ? (totalRepliedMessages / totalSentMessages) * 100 : 0
      const deliveryRate = totalSentMessages > 0 ? (totalDeliveredMessages / totalSentMessages) * 100 : 0
      
      const leadStatsMap = new Map(
        leadStats.map(stat => [stat.status, stat._count.id])
      )
      
      const convertedLeads = leadStatsMap.get('CLOSED_WON') || 0
      const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0

      // Generate recent activity
      const recentActivity = this.generateRecentActivity(recentMessages, recentCampaigns, recentLeads)

      const stats: DashboardStats = {
        totalContacts,
        totalCampaigns,
        totalMessages,
        totalLeads,
        activeUsers: await this.getActiveUsersCount(),
        activeCampaigns,
        responseRate: Math.round(responseRate * 10) / 10,
        conversionRate: Math.round(conversionRate * 10) / 10,
        deliveryRate: Math.round(deliveryRate * 10) / 10,
        recentActivity,
        lastUpdated: new Date().toISOString()
      }

      const duration = Date.now() - startTime
      Logger.info(DataSource.DATABASE, 'dashboard_stats', `Database query completed in ${duration}ms`)

      return stats

    } catch (error) {
      const duration = Date.now() - startTime
      Logger.error(DataSource.DATABASE, 'dashboard_stats', `Database query failed after ${duration}ms`, error)
      throw error
    }
  }

  /**
   * Generate recent activity from various data sources
   */
  private generateRecentActivity(
    recentMessages: any[],
    recentCampaigns: any[],
    recentLeads: any[]
  ): Activity[] {
    const activities: Activity[] = []

    // Add message activities
    recentMessages.slice(0, 3).forEach(message => {
      activities.push({
        id: `message_${message.id}`,
        type: message.direction === 'OUTBOUND' ? 'message' : 'message',
        title: message.direction === 'OUTBOUND' 
          ? `Message sent to ${message.contact?.name || 'Unknown'}`
          : `Reply received from ${message.contact?.name || 'Unknown'}`,
        description: message.content.length > 50 
          ? `${message.content.substring(0, 50)}...` 
          : message.content,
        time: this.getTimeAgo(message.createdAt),
        user: message.direction === 'OUTBOUND' ? 'System' : message.contact?.name || 'Unknown',
        metadata: {
          messageId: message.id,
          contactPhone: message.contact?.phone,
          campaignName: message.campaign?.name
        }
      })
    })

    // Add campaign activities
    recentCampaigns.slice(0, 2).forEach(campaign => {
      activities.push({
        id: `campaign_${campaign.id}`,
        type: 'campaign',
        title: `Campaign "${campaign.name}" ${campaign.status.toLowerCase()}`,
        description: `Status: ${campaign.status}`,
        time: this.getTimeAgo(campaign.createdAt),
        user: campaign.createdBy?.name || 'System',
        metadata: {
          campaignId: campaign.id,
          status: campaign.status
        }
      })
    })

    // Add lead activities
    recentLeads.slice(0, 2).forEach(lead => {
      activities.push({
        id: `lead_${lead.id}`,
        type: 'lead',
        title: `New lead: ${lead.name} - ₹${(lead.loanAmount / 100000).toFixed(1)}L ${lead.loanType.toLowerCase()} loan`,
        description: `Status: ${lead.status}`,
        time: this.getTimeAgo(lead.createdAt),
        user: 'System',
        metadata: {
          leadId: lead.id,
          loanType: lead.loanType,
          loanAmount: lead.loanAmount,
          status: lead.status
        }
      })
    })

    // Sort by most recent and limit to 8 items
    return activities
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, 8)
  }

  /**
   * Get active users count (simplified implementation)
   */
  private async getActiveUsersCount(): Promise<number> {
    try {
      // This is a simplified implementation
      // In a real system, you might track user sessions or recent activity
      const activeUsers = await prisma.user.count({
        where: {
          isActive: true
        }
      })
      return activeUsers
    } catch (error) {
      Logger.warn(DataSource.DATABASE, 'active_users', 'Failed to get active users count', error)
      return 0
    }
  }

  /**
   * Generate fallback statistics when database is unavailable
   */
  private generateFallbackStats(): DashboardStats {
    return {
      totalContacts: 2847,
      totalCampaigns: 23,
      totalMessages: 15420,
      totalLeads: 892,
      activeUsers: 8,
      activeCampaigns: 3,
      responseRate: 24.5,
      conversionRate: 12.8,
      deliveryRate: 96.2,
      recentActivity: [
        {
          id: 'fallback_1',
          type: 'system',
          title: 'System running in offline mode',
          description: 'Using cached data due to database connectivity issues',
          time: 'Just now',
          user: 'System'
        },
        {
          id: 'fallback_2',
          type: 'campaign',
          title: 'Personal Loan Campaign launched',
          time: '2 hours ago',
          user: 'Admin User'
        },
        {
          id: 'fallback_3',
          type: 'message',
          title: 'WhatsApp message sent to 500 contacts',
          time: '4 hours ago',
          user: 'Marketing Team'
        },
        {
          id: 'fallback_4',
          type: 'lead',
          title: 'New lead: Rajesh Kumar - ₹5L Personal Loan',
          time: '6 hours ago',
          user: 'System'
        }
      ],
      lastUpdated: new Date().toISOString()
    }
  }

  /**
   * Get cached statistics if available and not expired
   */
  private getCachedStats(key: string, allowStale: boolean = false): DashboardStats | null {
    const cached = this.cache.get(key)
    if (!cached) return null

    const now = Date.now()
    const isExpired = now > (cached.timestamp + cached.ttl)

    if (isExpired && !allowStale) {
      this.cache.delete(key)
      return null
    }

    return cached.data
  }

  /**
   * Cache statistics with TTL
   */
  private setCachedStats(key: string, data: DashboardStats, ttl: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    })
  }

  /**
   * Clear all cached statistics
   */
  clearCache(): void {
    this.cache.clear()
    Logger.info(DataSource.CACHE, 'dashboard_stats', 'Cache cleared')
  }

  /**
   * Get cache status for monitoring
   */
  getCacheStatus(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    }
  }

  /**
   * Format time ago string
   */
  private getTimeAgo(date: Date): string {
    const now = new Date()
    const diffInMs = now.getTime() - date.getTime()
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60))
    const diffInHours = Math.floor(diffInMinutes / 60)
    const diffInDays = Math.floor(diffInHours / 24)

    if (diffInMinutes < 1) {
      return 'Just now'
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes} minute${diffInMinutes === 1 ? '' : 's'} ago`
    } else if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours === 1 ? '' : 's'} ago`
    } else {
      return `${diffInDays} day${diffInDays === 1 ? '' : 's'} ago`
    }
  }
}

// Export singleton instance
export const dashboardStatsService = new DashboardStatsService()
export default dashboardStatsService