// Real-time messaging service using Server-Sent Events
import { logger } from './logger'

// Store active SSE connections
const connections = new Map<string, ReadableStreamDefaultController>()
const contactSubscriptions = new Map<string, Set<string>>()

export interface SSEConnection {
  connectionId: string
  controller: ReadableStreamDefaultController
  contactId: string
  userId: string
}

export const addConnection = (connectionId: string, controller: ReadableStreamDefaultController, contactId: string, userId: string) => {
  connections.set(connectionId, controller)
  
  // Subscribe to contact
  if (!contactSubscriptions.has(contactId)) {
    contactSubscriptions.set(contactId, new Set())
  }
  contactSubscriptions.get(contactId)!.add(connectionId)
  
  logger.info('SSE connection added', { connectionId, contactId, userId })
}

export const removeConnection = (connectionId: string) => {
  connections.delete(connectionId)
  
  // Remove from all contact subscriptions
  contactSubscriptions.forEach((subscribers, contactId) => {
    if (subscribers.has(connectionId)) {
      subscribers.delete(connectionId)
      if (subscribers.size === 0) {
        contactSubscriptions.delete(contactId)
      }
    }
  })
  
  logger.info('SSE connection removed', { connectionId })
}

export const broadcastToContactSubscribers = (contactId: string, event: any) => {
  const subscribers = contactSubscriptions.get(contactId)
  if (!subscribers) return

  const eventData = `data: ${JSON.stringify(event)}\n\n`
  
  subscribers.forEach(connectionId => {
    const controller = connections.get(connectionId)
    if (controller) {
      try {
        controller.enqueue(eventData)
      } catch (error) {
        // Connection is closed, remove it
        connections.delete(connectionId)
        subscribers.delete(connectionId)
        logger.warn('Failed to send SSE message, removing connection', { connectionId, error })
      }
    }
  })
  
  // Clean up empty subscription sets
  if (subscribers.size === 0) {
    contactSubscriptions.delete(contactId)
  }
}

export const broadcastMessageReceived = (contactId: string, message: any) => {
  broadcastToContactSubscribers(contactId, {
    type: 'MESSAGE_RECEIVED',
    data: message,
    timestamp: new Date().toISOString()
  })
}

export const broadcastMessageStatusUpdate = (contactId: string, messageId: string, status: string) => {
  broadcastToContactSubscribers(contactId, {
    type: 'MESSAGE_STATUS_UPDATE',
    data: { messageId, status },
    timestamp: new Date().toISOString()
  })
}

export const broadcastTypingIndicator = (contactId: string, isTyping: boolean, userId: string) => {
  broadcastToContactSubscribers(contactId, {
    type: 'TYPING_INDICATOR',
    data: { contactId, isTyping, userId },
    timestamp: new Date().toISOString()
  })
}

export const getConnectionStats = () => {
  return {
    totalConnections: connections.size,
    totalSubscriptions: contactSubscriptions.size,
    subscriptionDetails: Array.from(contactSubscriptions.entries()).map(([contactId, subscribers]) => ({
      contactId,
      subscriberCount: subscribers.size
    }))
  }
}