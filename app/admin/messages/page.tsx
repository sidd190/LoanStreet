'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { 
  MessageSquare, 
  Search, 
  Filter, 
  Send,
  Phone,
  Mail,
  User,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowUpRight,
  ArrowDownLeft,
  Paperclip,
  Smile,
  MoreVertical,
  X,
  Plus,
  Image,
  FileText
} from 'lucide-react'
import AdminLayout from '../components/AdminLayout'
import toast from 'react-hot-toast'
import DataService, { Message } from '../../../lib/dataService'

interface Contact {
  id: string
  name: string
  phone: string
  email?: string
  lastMessage?: string
  lastMessageTime?: string
  unreadCount: number
  status: 'online' | 'offline' | 'away'
}

interface Conversation {
  contactId: string
  messages: Message[]
}

export default function MessagesPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [conversations, setConversations] = useState<Record<string, Message[]>>({})
  const [newMessage, setNewMessage] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadMessages()
    loadContacts()
  }, [])

  useEffect(() => {
    if (selectedContact) {
      loadConversation(selectedContact.id)
    }
  }, [selectedContact])

  useEffect(() => {
    scrollToBottom()
  }, [conversations, selectedContact])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const loadMessages = async () => {
    try {
      setLoading(true)
      const data = await DataService.getMessages()
      setMessages(data)
      
      // Group messages by contact
      const groupedConversations: Record<string, Message[]> = {}
      data.forEach(message => {
        const contactKey = message.contactPhone
        if (!groupedConversations[contactKey]) {
          groupedConversations[contactKey] = []
        }
        groupedConversations[contactKey].push(message)
      })
      
      // Sort messages in each conversation by time
      Object.keys(groupedConversations).forEach(contactKey => {
        groupedConversations[contactKey].sort((a, b) => 
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        )
      })
      
      setConversations(groupedConversations)
    } catch (error) {
      toast.error('Failed to load messages')
    } finally {
      setLoading(false)
    }
  }

  const loadContacts = async () => {
    try {
      const data = await DataService.getContacts()
      
      // Convert contacts to chat format with message info
      const chatContacts: Contact[] = data.map(contact => {
        const contactMessages = messages.filter(m => m.contactPhone === contact.phone)
        const lastMessage = contactMessages[contactMessages.length - 1]
        const unreadCount = contactMessages.filter(m => 
          m.direction === 'INBOUND' && m.status !== 'READ'
        ).length
        
        return {
          id: contact.id,
          name: contact.name,
          phone: contact.phone,
          email: contact.email,
          lastMessage: lastMessage?.content || 'No messages yet',
          lastMessageTime: lastMessage?.createdAt,
          unreadCount,
          status: Math.random() > 0.5 ? 'online' : 'offline' as 'online' | 'offline'
        }
      })
      
      // Sort by last message time
      chatContacts.sort((a, b) => {
        if (!a.lastMessageTime) return 1
        if (!b.lastMessageTime) return -1
        return new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
      })
      
      setContacts(chatContacts)
    } catch (error) {
      toast.error('Failed to load contacts')
    }
  }

  const loadConversation = async (contactId: string) => {
    const contact = contacts.find(c => c.id === contactId)
    if (!contact) return
    
    const contactMessages = messages.filter(m => m.contactPhone === contact.phone)
    setConversations(prev => ({
      ...prev,
      [contactId]: contactMessages
    }))
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedContact || sending) return

    try {
      setSending(true)
      
      const messageData = {
        type: 'WHATSAPP' as const,
        direction: 'OUTBOUND' as const,
        content: newMessage,
        status: 'SENT' as const,
        contactName: selectedContact.name,
        contactPhone: selectedContact.phone,
        sentBy: 'Current User',
        sentAt: new Date().toISOString()
      }

      // Send via API
      const response = await fetch('/api/messages/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(messageData)
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      const result = await response.json()
      
      if (result.success) {
        // Add message to local state
        const newMsg = result.message
        setMessages(prev => [newMsg, ...prev])
        setConversations(prev => ({
          ...prev,
          [selectedContact.id]: [...(prev[selectedContact.id] || []), newMsg]
        }))
        
        // Update contact's last message
        setContacts(prev => prev.map(contact => 
          contact.id === selectedContact.id 
            ? { ...contact, lastMessage: newMessage, lastMessageTime: newMsg.createdAt }
            : contact
        ))
        
        setNewMessage('')
        toast.success('Message sent successfully')
      } else {
        throw new Error(result.message || 'Failed to send message')
      }
    } catch (error) {
      console.error('Send message error:', error)
      toast.error('Failed to send message')
    } finally {
      setSending(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800'
      case 'SENT': return 'bg-blue-100 text-blue-800'
      case 'DELIVERED': return 'bg-green-100 text-green-800'
      case 'READ': return 'bg-emerald-100 text-emerald-800'
      case 'FAILED': return 'bg-red-100 text-red-800'
      case 'REPLIED': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING': return Clock
      case 'SENT': return Send
      case 'DELIVERED': return CheckCircle
      case 'READ': return CheckCircle
      case 'FAILED': return XCircle
      case 'REPLIED': return MessageSquare
      default: return AlertCircle
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

  const stats = {
    total: messages.length,
    sent: messages.filter(m => m.direction === 'OUTBOUND').length,
    received: messages.filter(m => m.direction === 'INBOUND').length,
    delivered: messages.filter(m => m.status === 'DELIVERED' || m.status === 'READ').length,
    failed: messages.filter(m => m.status === 'FAILED').length,
    responseRate: Math.round((messages.filter(m => m.direction === 'INBOUND').length / messages.filter(m => m.direction === 'OUTBOUND').length) * 100) || 0
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Message Center</h1>
            <p className="text-gray-600 mt-1">
              Send, receive, and manage all your SMS, WhatsApp, and email communications
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="ALL">All Types</option>
              <option value="SMS">SMS</option>
              <option value="WHATSAPP">WhatsApp</option>
              <option value="EMAIL">Email</option>
            </select>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
          >
            <div className="flex items-center">
              <MessageSquare className="w-8 h-8 text-blue-500 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Total Messages</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
          >
            <div className="flex items-center">
              <ArrowUpRight className="w-8 h-8 text-green-500 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Sent</p>
                <p className="text-2xl font-bold text-gray-900">{stats.sent}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
          >
            <div className="flex items-center">
              <ArrowDownLeft className="w-8 h-8 text-purple-500 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Received</p>
                <p className="text-2xl font-bold text-gray-900">{stats.received}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
          >
            <div className="flex items-center">
              <CheckCircle className="w-8 h-8 text-emerald-500 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Delivered</p>
                <p className="text-2xl font-bold text-gray-900">{stats.delivered}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
          >
            <div className="flex items-center">
              <XCircle className="w-8 h-8 text-red-500 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Failed</p>
                <p className="text-2xl font-bold text-gray-900">{stats.failed}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
          >
            <div className="flex items-center">
              <MessageSquare className="w-8 h-8 text-orange-500 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Response Rate</p>
                <p className="text-2xl font-bold text-gray-900">{stats.responseRate}%</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Chat Interface */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white rounded-xl shadow-sm border border-gray-100 h-[600px] flex"
        >
          {/* Contacts Sidebar */}
          <div className="w-1/3 border-r border-gray-200 flex flex-col">
            {/* Search */}
            <div className="p-4 border-b border-gray-200">
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
            </div>

            {/* Contacts List */}
            <div className="flex-1 overflow-y-auto">
              {filteredContacts.map((contact) => (
                <div
                  key={contact.id}
                  onClick={() => setSelectedContact(contact)}
                  className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                    selectedContact?.id === contact.id ? 'bg-primary-50 border-primary-200' : ''
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                        <User className="w-6 h-6 text-gray-500" />
                      </div>
                      <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                        contact.status === 'online' ? 'bg-green-500' : 'bg-gray-400'
                      }`}></div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-gray-900 truncate">
                          {contact.name}
                        </h3>
                        {contact.lastMessageTime && (
                          <span className="text-xs text-gray-500">
                            {new Date(contact.lastMessageTime).toLocaleTimeString([], { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-sm text-gray-600 truncate">
                          {contact.lastMessage}
                        </p>
                        {contact.unreadCount > 0 && (
                          <span className="bg-primary-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                            {contact.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Chat Area */}
          <div className="flex-1 flex flex-col">
            {selectedContact ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-gray-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{selectedContact.name}</h3>
                      <p className="text-sm text-gray-500">{selectedContact.phone}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                      <Phone className="w-5 h-5" />
                    </button>
                    <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                      <MoreVertical className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {conversations[selectedContact.id]?.map((message, index) => {
                    const isOutbound = message.direction === 'OUTBOUND'
                    const StatusIcon = getStatusIcon(message.status)
                    
                    return (
                      <div
                        key={message.id}
                        className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                          isOutbound 
                            ? 'bg-primary-500 text-white' 
                            : 'bg-gray-200 text-gray-900'
                        }`}>
                          <p className="text-sm">{message.content}</p>
                          <div className={`flex items-center justify-between mt-1 text-xs ${
                            isOutbound ? 'text-primary-100' : 'text-gray-500'
                          }`}>
                            <span>
                              {new Date(message.createdAt).toLocaleTimeString([], { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </span>
                            {isOutbound && (
                              <StatusIcon className="w-3 h-3 ml-2" />
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <div className="p-4 border-t border-gray-200">
                  <div className="flex items-center space-x-3">
                    <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                      <Paperclip className="w-5 h-5" />
                    </button>
                    <div className="flex-1 relative">
                      <textarea
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Type a message..."
                        rows={1}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                      />
                    </div>
                    <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                      <Smile className="w-5 h-5" />
                    </button>
                    <button
                      onClick={sendMessage}
                      disabled={!newMessage.trim() || sending}
                      className="p-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Select a conversation to start messaging</p>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AdminLayout>
  )
}