// Data service that tries real API calls first, then falls back to JSON data
// This provides a realistic development experience while maintaining fallback data

import leadsData from '../data/leads.json'
import contactsData from '../data/contacts.json'
import campaignsData from '../data/campaigns.json'
import messagesData from '../data/messages.json'
import automationsData from '../data/automations.json'
import Logger, { DataSource, LogLevel } from './logger'

export interface Lead {
  id: string
  name: string
  phone: string
  email?: string
  loanType: 'PERSONAL' | 'BUSINESS' | 'HOME' | 'VEHICLE' | 'EDUCATION' | 'GOLD'
  loanAmount: number
  status: 'NEW' | 'CONTACTED' | 'INTERESTED' | 'QUALIFIED' | 'PROPOSAL_SENT' | 'NEGOTIATION' | 'CLOSED_WON' | 'CLOSED_LOST'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  source: string
  score: number
  assignedTo?: {
    id: string
    name: string
    email: string
  }
  lastContact?: string | null
  createdAt: string
  notes?: string
}

export interface Contact {
  id: string
  name: string
  phone: string
  email?: string
  tags: string[]
  source: string
  status: 'ACTIVE' | 'INACTIVE' | 'BLOCKED'
  lastContact?: string
  totalMessages: number
  totalCampaigns: number
  responseRate: number
  createdAt: string
  updatedAt: string
}

export interface Campaign {
  id: string
  name: string
  type: 'SMS' | 'WHATSAPP' | 'EMAIL'
  message: string
  status: 'DRAFT' | 'SCHEDULED' | 'RUNNING' | 'COMPLETED' | 'PAUSED' | 'CANCELLED'
  scheduledAt?: string
  sentAt?: string
  totalContacts: number
  totalSent: number
  totalDelivered: number
  totalReplies: number
  totalFailed: number
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface Message {
  id: string
  type: 'SMS' | 'WHATSAPP' | 'EMAIL'
  direction: 'INBOUND' | 'OUTBOUND'
  content: string
  status: 'PENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED' | 'REPLIED'
  contactName: string
  contactPhone: string
  contactEmail?: string
  campaignName?: string
  sentBy?: string
  sentAt?: string
  deliveredAt?: string
  readAt?: string
  createdAt: string
}

export interface AutomationRule {
  id: string
  name: string
  description: string
  type: 'campaign' | 'followup' | 'data_processing'
  status: 'active' | 'paused' | 'draft'
  schedule: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'custom'
    time: string
    days?: string[]
    customCron?: string
  }
  conditions: {
    leadSource?: string
    loanType?: string
    daysSinceLastContact?: number
    leadScore?: number
  }
  actions: {
    type: 'send_whatsapp' | 'send_sms' | 'send_email' | 'update_lead_score' | 'assign_agent'
    template?: string
    message?: string
    assignTo?: string
  }[]
  stats: {
    totalRuns: number
    successfulRuns: number
    lastRun?: string
    nextRun?: string
  }
  createdAt: string
  updatedAt: string
}

// Simulated API delay for realistic behavior
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// API base URL - in production this would be your actual API endpoint
const API_BASE_URL = typeof window !== 'undefined' 
  ? (process.env.NEXT_PUBLIC_API_URL || '/api')
  : (process.env.NEXT_PUBLIC_API_URL || `http://localhost:${process.env.PORT || 3000}/api`)

// Helper function to try API first, then fallback to JSON data
async function tryApiThenFallback<T>(
  apiCall: () => Promise<T>,
  fallbackData: T,
  dataType: string
): Promise<T> {
  try {
    // Try the real API call first
    Logger.info(DataSource.API, dataType, `Attempting to load ${dataType} from API`)
    const result = await apiCall()
    Logger.success(DataSource.API, dataType, `Successfully loaded ${dataType} from live database`)
    return result
  } catch (error) {
    // Log the API failure and use fallback data
    Logger.warn(DataSource.API, dataType, `API call failed, falling back to JSON data`, error)
    Logger.fallbackWarning(dataType, error, Array.isArray(fallbackData) ? fallbackData.length : undefined)
    await delay(300) // Simulate some delay even for fallback
    return fallbackData
  }
}

export class DataService {
  // Leads
  static async getLeads(): Promise<Lead[]> {
    return tryApiThenFallback(
      async () => {
        const response = await fetch(`${API_BASE_URL}/leads`)
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const data = await response.json()
        return data.success ? data.leads : data
      },
      leadsData as Lead[],
      'leads'
    )
  }

  static async getLead(id: string): Promise<Lead | null> {
    return tryApiThenFallback(
      async () => {
        const response = await fetch(`${API_BASE_URL}/leads/${id}`)
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return response.json()
      },
      (leadsData as Lead[]).find(lead => lead.id === id) || null,
      `lead ${id}`
    )
  }

  static async updateLead(id: string, updates: Partial<Lead>): Promise<Lead | null> {
    return tryApiThenFallback(
      async () => {
        const response = await fetch(`${API_BASE_URL}/leads/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates)
        })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const data = await response.json()
        return data.success ? data.lead : data
      },
      null, // For updates, we don't have fallback data
      `lead update ${id}`
    )
  }

  static async deleteLead(id: string): Promise<boolean> {
    return tryApiThenFallback(
      async () => {
        const response = await fetch(`${API_BASE_URL}/leads/${id}`, {
          method: 'DELETE'
        })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return true
      },
      true, // Assume success for fallback
      `lead deletion ${id}`
    )
  }

  // Contacts
  static async getContacts(): Promise<Contact[]> {
    return tryApiThenFallback(
      async () => {
        const response = await fetch(`${API_BASE_URL}/contacts`)
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const data = await response.json()
        return data.success ? data.contacts : data
      },
      contactsData as Contact[],
      'contacts'
    )
  }

  static async getContact(id: string): Promise<Contact | null> {
    return tryApiThenFallback(
      async () => {
        const response = await fetch(`${API_BASE_URL}/contacts/${id}`)
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return response.json()
      },
      (contactsData as Contact[]).find(contact => contact.id === id) || null,
      `contact ${id}`
    )
  }

  static async updateContact(id: string, updates: Partial<Contact>): Promise<Contact | null> {
    return tryApiThenFallback(
      async () => {
        const response = await fetch(`${API_BASE_URL}/contacts/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates)
        })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return response.json()
      },
      null,
      `contact update ${id}`
    )
  }

  static async createContact(contact: Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>): Promise<Contact> {
    return tryApiThenFallback(
      async () => {
        const response = await fetch(`${API_BASE_URL}/contacts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(contact)
        })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const data = await response.json()
        return data.success ? data.contact : data
      },
      {
        ...contact,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      } as Contact,
      'contact creation'
    )
  }

  static async deleteContact(id: string): Promise<boolean> {
    return tryApiThenFallback(
      async () => {
        const response = await fetch(`${API_BASE_URL}/contacts/${id}`, {
          method: 'DELETE'
        })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return true
      },
      true,
      `contact deletion ${id}`
    )
  }

  static async bulkUpdateContacts(ids: string[], updates: Partial<Contact>): Promise<boolean> {
    return tryApiThenFallback(
      async () => {
        const response = await fetch(`${API_BASE_URL}/contacts/bulk`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids, updates })
        })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return true
      },
      true,
      `bulk contact update (${ids.length} contacts)`
    )
  }

  static async bulkDeleteContacts(ids: string[]): Promise<boolean> {
    return tryApiThenFallback(
      async () => {
        const response = await fetch(`${API_BASE_URL}/contacts/bulk`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids })
        })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return true
      },
      true,
      `bulk contact deletion (${ids.length} contacts)`
    )
  }

  static async importContacts(file: File): Promise<{ success: boolean; imported: number; errors: string[] }> {
    return tryApiThenFallback(
      async () => {
        const formData = new FormData()
        formData.append('file', file)
        
        const response = await fetch(`${API_BASE_URL}/contacts/import`, {
          method: 'POST',
          credentials: 'include',
          body: formData
        })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const data = await response.json()
        return data.success ? data : data
      },
      { success: true, imported: 0, errors: ['Import functionality not available in offline mode'] },
      'contact import'
    )
  }

  static async exportContacts(filters?: any): Promise<Blob> {
    return tryApiThenFallback(
      async () => {
        const params = new URLSearchParams()
        if (filters) {
          Object.keys(filters).forEach(key => {
            if (filters[key] !== undefined && filters[key] !== null) {
              params.append(key, filters[key])
            }
          })
        }
        
        const response = await fetch(`${API_BASE_URL}/contacts/export?${params}`, {
          credentials: 'include'
        })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return response.blob()
      },
      new Blob(['Name,Phone,Email,Tags,Source,Status,Created At\n'], { type: 'text/csv' }),
      'contact export'
    )
  }

  // Campaigns
  static async getCampaigns(): Promise<Campaign[]> {
    return tryApiThenFallback(
      async () => {
        const response = await fetch(`${API_BASE_URL}/campaigns`)
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const data = await response.json()
        return data.success ? data.campaigns : data
      },
      campaignsData as Campaign[],
      'campaigns'
    )
  }

  static async getCampaign(id: string): Promise<Campaign | null> {
    return tryApiThenFallback(
      async () => {
        const response = await fetch(`${API_BASE_URL}/campaigns/${id}`)
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return response.json()
      },
      (campaignsData as Campaign[]).find(campaign => campaign.id === id) || null,
      `campaign ${id}`
    )
  }

  static async updateCampaign(id: string, updates: Partial<Campaign>): Promise<Campaign | null> {
    return tryApiThenFallback(
      async () => {
        const response = await fetch(`${API_BASE_URL}/campaigns/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates)
        })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return response.json()
      },
      null,
      `campaign update ${id}`
    )
  }

  static async deleteCampaign(id: string): Promise<boolean> {
    return tryApiThenFallback(
      async () => {
        const response = await fetch(`${API_BASE_URL}/campaigns/${id}`, {
          method: 'DELETE'
        })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return true
      },
      true,
      `campaign deletion ${id}`
    )
  }

  // Messages
  static async getMessages(): Promise<Message[]> {
    return tryApiThenFallback(
      async () => {
        const response = await fetch(`${API_BASE_URL}/messages`)
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const data = await response.json()
        return data.success ? data.messages : data
      },
      messagesData as Message[],
      'messages'
    )
  }

  static async getMessage(id: string): Promise<Message | null> {
    return tryApiThenFallback(
      async () => {
        const response = await fetch(`${API_BASE_URL}/messages/${id}`)
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return response.json()
      },
      (messagesData as Message[]).find(message => message.id === id) || null,
      `message ${id}`
    )
  }

  static async sendMessage(message: Omit<Message, 'id' | 'createdAt'>): Promise<Message> {
    return tryApiThenFallback(
      async () => {
        const response = await fetch(`${API_BASE_URL}/messages/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(message)
        })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const data = await response.json()
        return data.success ? data.message : data
      },
      {
        ...message,
        id: Date.now().toString(),
        createdAt: new Date().toISOString()
      } as Message,
      'message sending'
    )
  }

  static async createCampaign(campaign: Omit<Campaign, 'id' | 'createdAt' | 'updatedAt'>): Promise<Campaign> {
    return tryApiThenFallback(
      async () => {
        const response = await fetch(`${API_BASE_URL}/campaigns`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(campaign)
        })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const data = await response.json()
        return data.success ? data.campaign : data
      },
      {
        ...campaign,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      } as Campaign,
      'campaign creation'
    )
  }

  // Automations
  static async getAutomations(): Promise<AutomationRule[]> {
    return tryApiThenFallback(
      async () => {
        const response = await fetch(`${API_BASE_URL}/automations`)
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const data = await response.json()
        return data.success ? data.automations : data
      },
      automationsData as AutomationRule[],
      'automations'
    )
  }

  static async getAutomation(id: string): Promise<AutomationRule | null> {
    return tryApiThenFallback(
      async () => {
        const response = await fetch(`${API_BASE_URL}/automations/${id}`)
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return response.json()
      },
      (automationsData as AutomationRule[]).find(automation => automation.id === id) || null,
      `automation ${id}`
    )
  }

  static async updateAutomation(id: string, updates: Partial<AutomationRule>): Promise<AutomationRule | null> {
    return tryApiThenFallback(
      async () => {
        const response = await fetch(`${API_BASE_URL}/automations/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates)
        })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return response.json()
      },
      null,
      `automation update ${id}`
    )
  }

  static async toggleAutomation(id: string, isActive: boolean): Promise<boolean> {
    return tryApiThenFallback(
      async () => {
        const response = await fetch(`${API_BASE_URL}/automations/${id}/toggle`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isActive })
        })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return true
      },
      true,
      `automation toggle ${id}`
    )
  }

  static async runAutomation(id: string): Promise<boolean> {
    return tryApiThenFallback(
      async () => {
        const response = await fetch(`${API_BASE_URL}/automations/${id}/run`, {
          method: 'POST'
        })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return true
      },
      true,
      `automation execution ${id}`
    )
  }

  // Analytics
  static async getDashboardStats(forceRefresh: boolean = false): Promise<any> {
    return tryApiThenFallback(
      async () => {
        const url = new URL(`${API_BASE_URL}/dashboard/stats`)
        if (forceRefresh) {
          url.searchParams.set('refresh', 'true')
        }
        
        const response = await fetch(url.toString(), {
          credentials: 'include', // Ensure cookies are included
          headers: forceRefresh ? { 'Cache-Control': 'no-cache' } : {}
        })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const data = await response.json()
        return data.success ? data.data : data
      },
      (() => {
        // Generate fallback stats from JSON data
        const leads = leadsData as Lead[]
        const contacts = contactsData as Contact[]
        const campaigns = campaignsData as Campaign[]
        const messages = messagesData as Message[]

        return {
          totalContacts: contacts.length,
          totalCampaigns: campaigns.length,
          totalMessages: messages.length,
          totalLeads: leads.length,
          activeUsers: 8,
          activeCampaigns: campaigns.filter(c => c.status === 'RUNNING' || c.status === 'SCHEDULED').length,
          responseRate: 24.5,
          conversionRate: 12.8,
          deliveryRate: 96.2,
          recentActivity: [
            {
              id: '1',
              type: 'campaign',
              title: 'Personal Loan Campaign launched',
              time: '2 hours ago',
              user: 'Admin User'
            },
            {
              id: '2',
              type: 'message',
              title: 'WhatsApp message sent to 500 contacts',
              time: '4 hours ago',
              user: 'Marketing Team'
            },
            {
              id: '3',
              type: 'lead',
              title: 'New lead: Rajesh Kumar - ₹5L Personal Loan',
              time: '6 hours ago',
              user: 'System'
            }
          ],
          lastUpdated: new Date().toISOString()
        }
      })(),
      'dashboard stats'
    )
  }

  static async getAnalytics(days: number = 30): Promise<any> {
    return tryApiThenFallback(
      async () => {
        const response = await fetch(`${API_BASE_URL}/analytics?days=${days}`)
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return response.json()
      },
      (() => {
        // Generate fallback analytics from JSON data
        const leads = leadsData as Lead[]
        const contacts = contactsData as Contact[]
        const campaigns = campaignsData as Campaign[]
        const messages = messagesData as Message[]

        return {
          overview: {
            totalCampaigns: campaigns.length,
            totalMessages: messages.length,
            totalContacts: contacts.length,
            totalLeads: leads.length,
            responseRate: 24.5,
            conversionRate: 12.8,
            avgResponseTime: 2.4,
            activeUsers: 8
          },
          campaignPerformance: [
            {
              name: 'Personal Loan Promo',
              sent: 5000,
              delivered: 4950,
              opened: 2475,
              clicked: 495,
              responded: 247,
              converted: 62
            },
            {
              name: 'Business Loan Campaign',
              sent: 3000,
              delivered: 2970,
              opened: 1485,
              clicked: 297,
              responded: 148,
              converted: 44
            },
            {
              name: 'Home Loan Special',
              sent: 8000,
              delivered: 7920,
              opened: 3960,
              clicked: 792,
              responded: 396,
              converted: 119
            }
          ],
          messageStats: {
            whatsapp: { sent: 85000, delivered: 84150, read: 67320, replied: 16830 },
            sms: { sent: 35000, delivered: 34650, clicked: 3465, replied: 8662 },
            email: { sent: 5430, delivered: 5320, opened: 2660, clicked: 532 }
          },
          leadSources: [
            { source: 'WhatsApp Campaign', leads: 1250, conversions: 187, conversionRate: 15.0 },
            { source: 'SMS Campaign', leads: 890, conversions: 98, conversionRate: 11.0 },
            { source: 'Email Campaign', leads: 340, conversions: 51, conversionRate: 15.0 },
            { source: 'Website Form', leads: 560, conversions: 84, conversionRate: 15.0 },
            { source: 'Referral', leads: 200, conversions: 40, conversionRate: 20.0 }
          ],
          timeSeriesData: [
            { date: '2024-10-01', messages: 4200, responses: 1050, conversions: 134 },
            { date: '2024-10-02', messages: 3800, responses: 950, conversions: 121 },
            { date: '2024-10-03', messages: 4500, responses: 1125, conversions: 146 },
            { date: '2024-10-04', messages: 4100, responses: 1025, conversions: 131 },
            { date: '2024-10-05', messages: 3900, responses: 975, conversions: 124 }
          ]
        }
      })(),
      'analytics data'
    )
  }
}

export default DataService