export interface Contact {
  id: string
  name: string
  phone: string
  email?: string
  tags: string[]
  source: string
  status: 'ACTIVE' | 'INACTIVE' | 'BLOCKED'
  lastContact?: string
  lastMessage?: string
  lastMessageTime?: string
  unreadCount?: number
  totalMessages: number
  totalCampaigns: number
  responseRate: number
  createdAt: string
  updatedAt: string
}

export interface Message {
  id: string
  type: 'SMS' | 'WHATSAPP' | 'EMAIL'
  direction: 'INBOUND' | 'OUTBOUND'
  content: string
  status: 'PENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED' | 'REPLIED'
  contactId: string
  contactName: string
  contactPhone: string
  contactEmail?: string
  campaignId?: string
  campaignName?: string
  threadId?: string
  parentMessageId?: string
  mediaUrl?: string
  mediaType?: 'image' | 'video' | 'document'
  templateName?: string
  templateParams?: Record<string, string>
  smsFreshId?: string
  sentBy?: string
  sentAt?: string
  deliveredAt?: string
  readAt?: string
  repliedAt?: string
  failureReason?: string
  retryCount?: number
  createdAt: string
  updatedAt?: string
}

export interface MessageStatus {
  id: string
  status: 'PENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED'
  timestamp: string
  error?: string
}

export interface ConversationThread {
  contactId: string
  messages: Message[]
  unreadCount: number
  lastMessage?: Message
  lastActivity: string
}

export interface MessageFilter {
  contactId?: string
  campaignId?: string
  type?: 'SMS' | 'WHATSAPP' | 'EMAIL'
  direction?: 'INBOUND' | 'OUTBOUND'
  status?: string
  dateFrom?: Date
  dateTo?: Date
  searchTerm?: string
}

export interface SendMessageRequest {
  contactId: string
  content: string
  type: 'SMS' | 'WHATSAPP'
  templateName?: string
  templateParams?: Record<string, string>
  mediaUrl?: string
  mediaType?: 'image' | 'video' | 'document'
  campaignId?: string
}

export interface RealTimeEvent {
  type: 'MESSAGE_RECEIVED' | 'MESSAGE_STATUS_UPDATE' | 'TYPING_INDICATOR' | 'CONTACT_ONLINE' | 'connected' | 'ping'
  data: any
  timestamp: string
}

export interface ConnectionStatus {
  connected: boolean
  lastConnected?: string
  reconnectAttempts: number
  latency?: number
}