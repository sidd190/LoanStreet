import { getAutomationTriggerManager } from './automationTriggers'

/**
 * Utility class for emitting automation events from various parts of the system
 * This provides a clean interface for triggering automation events without
 * directly coupling components to the trigger manager
 */
class AutomationEventEmitter {
  private triggerManager = getAutomationTriggerManager()

  // Lead events
  async leadCreated(leadData: {
    id: string
    name: string
    phone?: string
    email?: string
    loanType?: string
    loanAmount?: number
    source?: string
    status: string
    assignedToId?: string
    createdAt: Date
  }) {
    await this.triggerManager.emitLeadCreated({
      ...leadData,
      eventType: 'lead_created',
      timestamp: new Date()
    })
  }

  async leadStatusChanged(leadData: {
    id: string
    name: string
    oldStatus: string
    newStatus: string
    loanType?: string
    loanAmount?: number
    assignedToId?: string
    updatedAt: Date
  }) {
    await this.triggerManager.emitLeadStatusChanged({
      ...leadData,
      eventType: 'lead_status_changed',
      timestamp: new Date()
    })
  }

  async leadAssigned(leadData: {
    id: string
    name: string
    assignedToId: string
    assignedBy: string
    loanType?: string
    assignedAt: Date
  }) {
    await this.triggerManager.emitLeadStatusChanged({
      ...leadData,
      eventType: 'lead_assigned',
      timestamp: new Date()
    })
  }

  // Message events
  async messageReceived(messageData: {
    id: string
    contactId: string
    content: string
    type: 'SMS' | 'WHATSAPP' | 'EMAIL'
    phone?: string
    leadId?: string
    receivedAt: Date
  }) {
    await this.triggerManager.emitMessageReceived({
      ...messageData,
      eventType: 'message_received',
      timestamp: new Date()
    })
  }

  async messageSent(messageData: {
    id: string
    contactId: string
    content: string
    type: 'SMS' | 'WHATSAPP' | 'EMAIL'
    campaignId?: string
    leadId?: string
    sentAt: Date
  }) {
    await this.triggerManager.emitMessageSent({
      ...messageData,
      eventType: 'message_sent',
      timestamp: new Date()
    })
  }

  async messageDelivered(messageData: {
    id: string
    contactId: string
    deliveredAt: Date
  }) {
    await this.triggerManager.emitMessageSent({
      ...messageData,
      eventType: 'message_delivered',
      timestamp: new Date()
    })
  }

  async messageRead(messageData: {
    id: string
    contactId: string
    readAt: Date
  }) {
    await this.triggerManager.emitMessageSent({
      ...messageData,
      eventType: 'message_read',
      timestamp: new Date()
    })
  }

  // Campaign events
  async campaignStarted(campaignData: {
    id: string
    name: string
    type: 'SMS' | 'WHATSAPP' | 'EMAIL'
    targetCount: number
    startedAt: Date
    createdBy: string
  }) {
    await this.triggerManager.emitCampaignStarted({
      ...campaignData,
      eventType: 'campaign_started',
      timestamp: new Date()
    })
  }

  async campaignCompleted(campaignData: {
    id: string
    name: string
    type: 'SMS' | 'WHATSAPP' | 'EMAIL'
    targetCount: number
    sentCount: number
    deliveredCount: number
    failedCount: number
    completedAt: Date
  }) {
    await this.triggerManager.emitCampaignCompleted({
      ...campaignData,
      eventType: 'campaign_completed',
      timestamp: new Date()
    })
  }

  async campaignPaused(campaignData: {
    id: string
    name: string
    pausedAt: Date
    pausedBy: string
  }) {
    await this.triggerManager.emitCampaignCompleted({
      ...campaignData,
      eventType: 'campaign_paused',
      timestamp: new Date()
    })
  }

  // Contact events
  async contactCreated(contactData: {
    id: string
    name: string
    phone: string
    email?: string
    source?: string
    tags?: string[]
    createdAt: Date
  }) {
    await this.triggerManager.emitContactCreated({
      ...contactData,
      eventType: 'contact_created',
      timestamp: new Date()
    })
  }

  async contactUpdated(contactData: {
    id: string
    name: string
    phone: string
    email?: string
    tags?: string[]
    updatedFields: string[]
    updatedAt: Date
  }) {
    await this.triggerManager.emitContactUpdated({
      ...contactData,
      eventType: 'contact_updated',
      timestamp: new Date()
    })
  }

  async contactTagsUpdated(contactData: {
    id: string
    name: string
    oldTags: string[]
    newTags: string[]
    updatedAt: Date
  }) {
    await this.triggerManager.emitContactUpdated({
      ...contactData,
      eventType: 'contact_tags_updated',
      timestamp: new Date()
    })
  }

  // Form submission events
  async formSubmitted(formData: {
    formType: 'loan_application' | 'contact_form' | 'calculator'
    contactId?: string
    leadId?: string
    data: Record<string, any>
    submittedAt: Date
    source: string
  }) {
    await this.triggerManager.emitLeadCreated({
      ...formData,
      eventType: 'form_submitted',
      timestamp: new Date()
    })
  }

  // User activity events
  async userLogin(userData: {
    userId: string
    email: string
    role: string
    loginAt: Date
    ipAddress?: string
  }) {
    // Could trigger automations based on user activity
    await this.triggerManager.emitContactUpdated({
      ...userData,
      eventType: 'user_login',
      timestamp: new Date()
    })
  }

  async userAction(actionData: {
    userId: string
    action: string
    targetType: 'lead' | 'contact' | 'campaign' | 'automation'
    targetId: string
    metadata?: Record<string, any>
    performedAt: Date
  }) {
    await this.triggerManager.emitContactUpdated({
      ...actionData,
      eventType: 'user_action',
      timestamp: new Date()
    })
  }

  // System events
  async systemAlert(alertData: {
    type: 'error' | 'warning' | 'info'
    message: string
    component: string
    severity: 'low' | 'medium' | 'high' | 'critical'
    metadata?: Record<string, any>
    occurredAt: Date
  }) {
    await this.triggerManager.emitContactUpdated({
      ...alertData,
      eventType: 'system_alert',
      timestamp: new Date()
    })
  }

  async dataImported(importData: {
    type: 'contacts' | 'leads' | 'messages'
    recordCount: number
    successCount: number
    failureCount: number
    importedBy: string
    importedAt: Date
  }) {
    await this.triggerManager.emitContactUpdated({
      ...importData,
      eventType: 'data_imported',
      timestamp: new Date()
    })
  }

  // Webhook events
  async webhookReceived(webhookData: {
    source: string
    type: string
    data: Record<string, any>
    receivedAt: Date
  }) {
    // Determine which automation event to trigger based on webhook data
    if (webhookData.source === 'smsfresh') {
      if (webhookData.type === 'message_status') {
        await this.messageDelivered({
          id: webhookData.data.messageId,
          contactId: webhookData.data.contactId,
          deliveredAt: new Date(webhookData.data.deliveredAt)
        })
      } else if (webhookData.type === 'message_received') {
        await this.messageReceived({
          id: webhookData.data.messageId,
          contactId: webhookData.data.contactId,
          content: webhookData.data.content,
          type: 'WHATSAPP',
          phone: webhookData.data.phone,
          receivedAt: new Date(webhookData.data.receivedAt)
        })
      }
    }
  }

  // Batch events for performance
  async batchLeadsCreated(leads: Array<{
    id: string
    name: string
    phone?: string
    email?: string
    loanType?: string
    source?: string
    createdAt: Date
  }>) {
    for (const lead of leads) {
      await this.leadCreated({
        ...lead,
        status: 'NEW'
      })
    }
  }

  async batchContactsUpdated(contacts: Array<{
    id: string
    name: string
    phone: string
    updatedFields: string[]
    updatedAt: Date
  }>) {
    for (const contact of contacts) {
      await this.contactUpdated(contact)
    }
  }

  // Utility methods
  getTriggerManagerStatus() {
    return this.triggerManager.getTriggerStatus()
  }

  getScheduledTriggers() {
    return this.triggerManager.getScheduledTriggers()
  }

  getEventTriggers() {
    return this.triggerManager.getEventTriggers()
  }
}

// Singleton instance
let eventEmitter: AutomationEventEmitter | null = null

export function getAutomationEventEmitter(): AutomationEventEmitter {
  if (!eventEmitter) {
    eventEmitter = new AutomationEventEmitter()
  }
  return eventEmitter
}

// Export convenience functions for easy use throughout the application
export const automationEvents = {
  // Lead events
  leadCreated: (data: Parameters<AutomationEventEmitter['leadCreated']>[0]) => 
    getAutomationEventEmitter().leadCreated(data),
  
  leadStatusChanged: (data: Parameters<AutomationEventEmitter['leadStatusChanged']>[0]) => 
    getAutomationEventEmitter().leadStatusChanged(data),
  
  leadAssigned: (data: Parameters<AutomationEventEmitter['leadAssigned']>[0]) => 
    getAutomationEventEmitter().leadAssigned(data),

  // Message events
  messageReceived: (data: Parameters<AutomationEventEmitter['messageReceived']>[0]) => 
    getAutomationEventEmitter().messageReceived(data),
  
  messageSent: (data: Parameters<AutomationEventEmitter['messageSent']>[0]) => 
    getAutomationEventEmitter().messageSent(data),
  
  messageDelivered: (data: Parameters<AutomationEventEmitter['messageDelivered']>[0]) => 
    getAutomationEventEmitter().messageDelivered(data),

  // Campaign events
  campaignStarted: (data: Parameters<AutomationEventEmitter['campaignStarted']>[0]) => 
    getAutomationEventEmitter().campaignStarted(data),
  
  campaignCompleted: (data: Parameters<AutomationEventEmitter['campaignCompleted']>[0]) => 
    getAutomationEventEmitter().campaignCompleted(data),

  // Contact events
  contactCreated: (data: Parameters<AutomationEventEmitter['contactCreated']>[0]) => 
    getAutomationEventEmitter().contactCreated(data),
  
  contactUpdated: (data: Parameters<AutomationEventEmitter['contactUpdated']>[0]) => 
    getAutomationEventEmitter().contactUpdated(data),

  // Form events
  formSubmitted: (data: Parameters<AutomationEventEmitter['formSubmitted']>[0]) => 
    getAutomationEventEmitter().formSubmitted(data),

  // Webhook events
  webhookReceived: (data: Parameters<AutomationEventEmitter['webhookReceived']>[0]) => 
    getAutomationEventEmitter().webhookReceived(data)
}

export default AutomationEventEmitter