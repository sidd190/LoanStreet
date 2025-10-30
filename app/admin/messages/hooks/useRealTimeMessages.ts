'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Message, RealTimeEvent, ConnectionStatus } from '../types'

interface UseRealTimeMessagesProps {
  onMessageReceived?: (message: Message) => void
  onMessageStatusUpdate?: (messageId: string, status: string) => void
  onTypingIndicator?: (contactId: string, isTyping: boolean) => void
  onContactOnline?: (contactId: string, isOnline: boolean) => void
}

interface UseRealTimeMessagesReturn {
  isConnected: boolean
  connectionStatus: ConnectionStatus
  subscribeToContact: (contactId: string) => void
  unsubscribeFromContact: (contactId: string) => void
  sendTypingIndicator: (contactId: string, isTyping: boolean) => void
  reconnect: () => void
}

export function useRealTimeMessages({
  onMessageReceived,
  onMessageStatusUpdate,
  onTypingIndicator,
  onContactOnline
}: UseRealTimeMessagesProps = {}): UseRealTimeMessagesReturn {
  const [isConnected, setIsConnected] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    connected: false,
    reconnectAttempts: 0
  })
  
  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const currentContactRef = useRef<string | null>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const connectToContact = useCallback((contactId: string) => {
    if (currentContactRef.current === contactId && eventSourceRef.current) {
      return // Already connected to this contact
    }

    // Disconnect from previous contact
    disconnect()

    try {
      const eventSourceUrl = `/api/messages/events?contactId=${encodeURIComponent(contactId)}`
      eventSourceRef.current = new EventSource(eventSourceUrl)
      currentContactRef.current = contactId

      eventSourceRef.current.onopen = () => {
        console.log('SSE connected for contact:', contactId)
        setIsConnected(true)
        setConnectionStatus(prev => ({
          ...prev,
          connected: true,
          lastConnected: new Date().toISOString(),
          reconnectAttempts: 0
        }))
      }

      eventSourceRef.current.onmessage = (event) => {
        try {
          const data: RealTimeEvent = JSON.parse(event.data)
          
          switch (data.type) {
            case 'MESSAGE_RECEIVED':
              onMessageReceived?.(data.data as Message)
              break
            case 'MESSAGE_STATUS_UPDATE':
              onMessageStatusUpdate?.(data.data.messageId, data.data.status)
              break
            case 'TYPING_INDICATOR':
              onTypingIndicator?.(data.data.contactId, data.data.isTyping)
              break
            case 'CONTACT_ONLINE':
              onContactOnline?.(data.data.contactId, data.data.isOnline)
              break
            case 'connected':
            case 'ping':
              // Connection management messages
              break
            default:
              console.log('Unknown SSE message type:', data.type)
          }
        } catch (error) {
          console.error('Error parsing SSE message:', error)
        }
      }

      eventSourceRef.current.onerror = (error) => {
        console.error('SSE error:', error)
        setIsConnected(false)
        setConnectionStatus(prev => ({
          ...prev,
          connected: false
        }))
        
        // Attempt to reconnect
        scheduleReconnect(contactId)
      }

    } catch (error) {
      console.error('Failed to create SSE connection:', error)
      scheduleReconnect(contactId)
    }
  }, [onMessageReceived, onMessageStatusUpdate, onTypingIndicator, onContactOnline])

  const scheduleReconnect = useCallback((contactId: string) => {
    setConnectionStatus(prev => ({
      ...prev,
      reconnectAttempts: prev.reconnectAttempts + 1
    }))

    // Exponential backoff: 1s, 2s, 4s, 8s, max 30s
    const delay = Math.min(1000 * Math.pow(2, connectionStatus.reconnectAttempts), 30000)
    
    reconnectTimeoutRef.current = setTimeout(() => {
      console.log(`Attempting to reconnect to contact ${contactId} (attempt ${connectionStatus.reconnectAttempts + 1})`)
      connectToContact(contactId)
    }, delay)
  }, [connectToContact, connectionStatus.reconnectAttempts])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = null
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }

    currentContactRef.current = null
    setIsConnected(false)
    setConnectionStatus(prev => ({
      ...prev,
      connected: false
    }))
  }, [])

  const subscribeToContact = useCallback((contactId: string) => {
    connectToContact(contactId)
  }, [connectToContact])

  const unsubscribeFromContact = useCallback((contactId: string) => {
    if (currentContactRef.current === contactId) {
      disconnect()
    }
  }, [disconnect])

  const sendTypingIndicator = useCallback((contactId: string, isTyping: boolean) => {
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    // Send typing indicator via API
    fetch('/api/messages/typing', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        contactId,
        isTyping
      })
    }).catch(error => {
      console.error('Failed to send typing indicator:', error)
    })

    // Auto-stop typing after 3 seconds
    if (isTyping) {
      typingTimeoutRef.current = setTimeout(() => {
        sendTypingIndicator(contactId, false)
      }, 3000)
    }
  }, [])

  const reconnect = useCallback(() => {
    if (currentContactRef.current) {
      const contactId = currentContactRef.current
      disconnect()
      setTimeout(() => connectToContact(contactId), 1000)
    }
  }, [connectToContact, disconnect])

  // Cleanup on unmount
  useEffect(() => {
    return disconnect
  }, [disconnect])

  return {
    isConnected,
    connectionStatus,
    subscribeToContact,
    unsubscribeFromContact,
    sendTypingIndicator,
    reconnect
  }
}