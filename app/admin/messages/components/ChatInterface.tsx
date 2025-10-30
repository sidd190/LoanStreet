'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Search, 
  Send,
  Phone,
  User,
  MoreVertical,
  Paperclip,
  Smile,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  MessageSquare,
  Filter,
  X
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Contact, Message } from '../types'
import ContactList from './ContactList'
import ConversationView from './ConversationView'
import MessageInput from './MessageInput'
import { useRealTimeMessages } from '../hooks/useRealTimeMessages'

interface ChatInterfaceProps {
  contacts: Contact[]
  messages: Message[]
  onSendMessage: (contactId: string, content: string, type: 'SMS' | 'WHATSAPP') => Promise<Message>
  onLoadConversation: (contactId: string) => Promise<Message[]>
  loading?: boolean
}

export default function ChatInterface({
  contacts,
  messages,
  onSendMessage,
  onLoadConversation,
  loading = false
}: ChatInterfaceProps) {
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [conversations, setConversations] = useState<Record<string, Message[]>>({})
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'SMS' | 'WHATSAPP'>('ALL')
  const [sending, setSending] = useState(false)
  const [loadingConversation, setLoadingConversation] = useState(false)

  // Real-time message updates
  const { 
    isConnected, 
    connectionStatus, 
    subscribeToContact, 
    unsubscribeFromContact,
    sendTypingIndicator
  } = useRealTimeMessages({
    onMessageReceived: (message: Message) => {
      // Update conversations with new message
      setConversations(prev => ({
        ...prev,
        [message.contactId]: [...(prev[message.contactId] || []), message]
      }))
    },
    onMessageStatusUpdate: (messageId: string, status: string) => {
      // Update message status in conversations
      setConversations(prev => {
        const updated = { ...prev }
        Object.keys(updated).forEach(contactId => {
          updated[contactId] = updated[contactId].map(msg =>
            msg.id === messageId ? { ...msg, status: status as Message['status'] } : msg
          )
        })
        return updated
      })
    }
  })

  // Load conversation when contact is selected
  useEffect(() => {
    if (selectedContact) {
      loadConversation(selectedContact.id)
      subscribeToContact(selectedContact.id)
    }
    
    return () => {
      if (selectedContact) {
        unsubscribeFromContact(selectedContact.id)
      }
    }
  }, [selectedContact])

  const loadConversation = async (contactId: string) => {
    try {
      setLoadingConversation(true)
      const contactMessages = await onLoadConversation(contactId)
      setConversations(prev => ({
        ...prev,
        [contactId]: contactMessages
      }))
    } catch (error) {
      toast.error('Failed to load conversation')
    } finally {
      setLoadingConversation(false)
    }
  }

  const handleSendMessage = async (content: string, type: 'SMS' | 'WHATSAPP' = 'WHATSAPP') => {
    if (!selectedContact || !content.trim() || sending) return

    try {
      setSending(true)
      await onSendMessage(selectedContact.id, content, type)
      
      // Optimistically add message to conversation
      const optimisticMessage: Message = {
        id: `temp-${Date.now()}`,
        type,
        direction: 'OUTBOUND',
        content,
        status: 'PENDING',
        contactId: selectedContact.id,
        contactName: selectedContact.name,
        contactPhone: selectedContact.phone,
        sentBy: 'Current User',
        createdAt: new Date().toISOString()
      }

      setConversations(prev => ({
        ...prev,
        [selectedContact.id]: [...(prev[selectedContact.id] || []), optimisticMessage]
      }))

      toast.success('Message sent successfully')
    } catch (error) {
      toast.error('Failed to send message')
    } finally {
      setSending(false)
    }
  }

  const filteredContacts = contacts.filter(contact => {
    if (searchTerm) {
      return contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
             contact.phone.includes(searchTerm) ||
             contact.lastMessage?.toLowerCase().includes(searchTerm.toLowerCase())
    }
    return true
  })

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 h-[700px] flex">
      {/* Contact List Sidebar */}
      <div className="w-1/3 border-r border-gray-200 flex flex-col">
        {/* Search and Filter Header */}
        <div className="p-4 border-b border-gray-200 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as 'ALL' | 'SMS' | 'WHATSAPP')}
              className="text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="ALL">All Types</option>
              <option value="WHATSAPP">WhatsApp</option>
              <option value="SMS">SMS</option>
            </select>
          </div>

          {/* Connection Status */}
          <div className="flex items-center space-x-2 text-xs">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className={isConnected ? 'text-green-600' : 'text-red-600'}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>

        {/* Contact List */}
        <ContactList
          contacts={filteredContacts}
          selectedContact={selectedContact}
          onSelectContact={setSelectedContact}
          conversations={conversations}
          loading={loading}
        />
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedContact ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center text-white font-semibold">
                  {selectedContact.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{selectedContact.name}</h3>
                  <p className="text-sm text-gray-500">{selectedContact.phone}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
                  <Phone className="w-5 h-5" />
                </button>
                <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Conversation View */}
            <ConversationView
              messages={conversations[selectedContact.id] || []}
              loading={loadingConversation}
              contactName={selectedContact.name}
            />

            {/* Message Input */}
            <MessageInput
              onSendMessage={handleSendMessage}
              onTypingIndicator={(isTyping) => selectedContact && sendTypingIndicator(selectedContact.id, isTyping)}
              disabled={sending || !isConnected}
              placeholder={isConnected ? "Type a message..." : "Connecting..."}
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Select a conversation</h3>
              <p className="text-gray-500">Choose a contact from the list to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}