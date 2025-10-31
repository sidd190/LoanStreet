import { useState, useEffect, useCallback } from 'react'
import { useWebSocket, useWebSocketEvent } from './useWebSocket'

// Hook for live dashboard statistics
export function useLiveStats() {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  // WebSocket connection for real-time stats updates
  const { isConnected } = useWebSocketEvent('STATS_UPDATE', (data) => {
    setStats(data)
    setLastUpdated(new Date())
    setLoading(false)
    setError(null)
  })

  // Load initial stats
  const loadStats = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/dashboard/stats')
      const result = await response.json()

      if (result.success) {
        setStats(result.data)
        setLastUpdated(new Date())
      } else {
        setError(result.message || 'Failed to load stats')
      }
    } catch (err) {
      setError('Failed to load dashboard statistics')
      console.error('Stats loading error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // Load stats on mount
  useEffect(() => {
    loadStats()
  }, [loadStats])

  // Refresh stats manually
  const refresh = useCallback(() => {
    loadStats()
  }, [loadStats])

  return {
    stats,
    loading,
    error,
    lastUpdated,
    isConnected,
    refresh
  }
}

// Hook for live message updates
export function useLiveMessages(contactId?: string) {
  const [messages, setMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // WebSocket connection for real-time message updates
  const webSocket = useWebSocket({
    onMessage: (message) => {
      if (message.type.startsWith('MESSAGE_')) {
        handleMessageEvent(message.data)
      }
    }
  })

  // Subscribe to contact-specific updates
  useEffect(() => {
    if (contactId && webSocket.isConnected) {
      webSocket.subscribe(`contact:${contactId}`)
      return () => webSocket.unsubscribe(`contact:${contactId}`)
    }
  }, [contactId, webSocket.isConnected, webSocket])

  const handleMessageEvent = useCallback((eventData: any) => {
    switch (eventData.type) {
      case 'MESSAGE_RECEIVED':
        // Add new message if it's for the current contact
        if (!contactId || eventData.contactId === contactId) {
          setMessages(prev => [eventData, ...prev])
        }
        break

      case 'MESSAGE_STATUS_UPDATE':
        // Update message status
        if (!contactId || eventData.contactId === contactId) {
          setMessages(prev =>
            prev.map(msg =>
              msg.messageId === eventData.messageId
                ? { ...msg, status: eventData.status }
                : msg
            )
          )
        }
        break
    }
  }, [contactId])

  // Load initial messages
  const loadMessages = useCallback(async () => {
    if (!contactId) return

    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/messages/conversation?contactId=${contactId}`)
      const result = await response.json()

      if (result.success) {
        setMessages(result.data.messages || [])
      } else {
        setError(result.message || 'Failed to load messages')
      }
    } catch (err) {
      setError('Failed to load messages')
      console.error('Messages loading error:', err)
    } finally {
      setLoading(false)
    }
  }, [contactId])

  // Load messages when contact changes
  useEffect(() => {
    if (contactId) {
      loadMessages()
    } else {
      setMessages([])
      setLoading(false)
    }
  }, [contactId, loadMessages])

  // Send typing indicator
  const sendTypingIndicator = useCallback((isTyping: boolean) => {
    if (contactId && webSocket.isConnected) {
      webSocket.send({
        type: isTyping ? 'TYPING_START' : 'TYPING_STOP',
        data: { contactId }
      })
    }
  }, [contactId, webSocket])

  return {
    messages,
    loading,
    error,
    isConnected: webSocket.isConnected,
    sendTypingIndicator,
    refresh: loadMessages
  }
}

// Hook for live campaign updates
export function useLiveCampaigns() {
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // WebSocket connection for real-time campaign updates
  useWebSocketEvent('CAMPAIGN_PROGRESS', (data) => {
    setCampaigns(prev =>
      prev.map(campaign =>
        campaign.id === data.campaignId
          ? { ...campaign, progress: data.progress, status: 'RUNNING' }
          : campaign
      )
    )
  })

  useWebSocketEvent('CAMPAIGN_COMPLETED', (data) => {
    setCampaigns(prev =>
      prev.map(campaign =>
        campaign.id === data.campaignId
          ? { ...campaign, status: 'COMPLETED', completedAt: data.timestamp }
          : campaign
      )
    )
  })

  useWebSocketEvent('CAMPAIGN_FAILED', (data) => {
    setCampaigns(prev =>
      prev.map(campaign =>
        campaign.id === data.campaignId
          ? { ...campaign, status: 'FAILED', failedAt: data.timestamp }
          : campaign
      )
    )
  })

  // Load initial campaigns
  const loadCampaigns = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/campaigns')
      const result = await response.json()

      if (result.success) {
        setCampaigns(result.data.campaigns || [])
      } else {
        setError(result.message || 'Failed to load campaigns')
      }
    } catch (err) {
      setError('Failed to load campaigns')
      console.error('Campaigns loading error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCampaigns()
  }, [loadCampaigns])

  return {
    campaigns,
    loading,
    error,
    refresh: loadCampaigns
  }
}

// Hook for live lead updates
export function useLiveLeads() {
  const [leads, setLeads] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // WebSocket connection for real-time lead updates
  useWebSocketEvent('LEAD_CREATED', (data) => {
    setLeads(prev => [data, ...prev])
  })

  useWebSocketEvent('LEAD_UPDATED', (data) => {
    setLeads(prev =>
      prev.map(lead =>
        lead.id === data.leadId
          ? { ...lead, status: data.status, assignedTo: data.assignedTo, score: data.score }
          : lead
      )
    )
  })

  useWebSocketEvent('LEAD_ASSIGNED', (data) => {
    setLeads(prev =>
      prev.map(lead =>
        lead.id === data.leadId
          ? { ...lead, assignedTo: data.assignedTo }
          : lead
      )
    )
  })

  // Load initial leads
  const loadLeads = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/leads')
      const result = await response.json()

      if (result.success) {
        setLeads(result.data.leads || [])
      } else {
        setError(result.message || 'Failed to load leads')
      }
    } catch (err) {
      setError('Failed to load leads')
      console.error('Leads loading error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadLeads()
  }, [loadLeads])

  return {
    leads,
    loading,
    error,
    refresh: loadLeads
  }
}

// Hook for live contact updates
export function useLiveContacts() {
  const [contacts, setContacts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // WebSocket connection for real-time contact updates
  useWebSocketEvent('CONTACT_UPDATED', (data) => {
    setContacts(prev =>
      prev.map(contact =>
        contact.id === data.contactId
          ? { ...contact, ...data.changes }
          : contact
      )
    )
  })

  // Load initial contacts
  const loadContacts = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/contacts')
      const result = await response.json()

      if (result.success) {
        setContacts(result.data.contacts || [])
      } else {
        setError(result.message || 'Failed to load contacts')
      }
    } catch (err) {
      setError('Failed to load contacts')
      console.error('Contacts loading error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadContacts()
  }, [loadContacts])

  return {
    contacts,
    loading,
    error,
    refresh: loadContacts
  }
}

// Hook for connection status indicator
export function useConnectionStatus() {
  const { isConnected, isConnecting, connectionError, connectionStats } = useWebSocket()

  const getStatusColor = () => {
    if (isConnected) return 'green'
    if (isConnecting) return 'yellow'
    if (connectionError) return 'red'
    return 'gray'
  }

  const getStatusText = () => {
    if (isConnected) return 'Connected'
    if (isConnecting) return 'Connecting...'
    if (connectionError) return 'Disconnected'
    return 'Not connected'
  }

  return {
    isConnected,
    isConnecting,
    connectionError,
    connectionStats,
    statusColor: getStatusColor(),
    statusText: getStatusText()
  }
}