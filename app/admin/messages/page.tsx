'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  MessageSquare, 
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle,
  XCircle,
  Plus
} from 'lucide-react'
import AdminLayout from '../components/AdminLayout'
import toast from 'react-hot-toast'
import DataService from '../../../lib/dataService'
import ChatInterface from './components/ChatInterface'
import { Contact, Message } from './types'

export default function MessagesPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadMessages()
    loadContacts()
  }, [])

  const loadMessages = async () => {
    try {
      setLoading(true)
      const data = await DataService.getMessages()
      
      // Transform messages to match our interface
      const transformedMessages: Message[] = data.map(msg => ({
        ...msg,
        contactId: msg.contactPhone, // Use phone as contactId for now
        updatedAt: msg.createdAt
      }))
      
      setMessages(transformedMessages)
    } catch (error) {
      toast.error('Failed to load messages')
    } finally {
      setLoading(false)
    }
  }

  const loadContacts = async () => {
    try {
      const data = await DataService.getContacts()
      
      // Transform contacts to match our interface and add message info
      const transformedContacts: Contact[] = data.map(contact => {
        // Find messages for this contact
        const contactMessages = messages.filter(m => m.contactPhone === contact.phone)
        const lastMessage = contactMessages[contactMessages.length - 1]
        const unreadCount = contactMessages.filter(m => 
          m.direction === 'INBOUND' && m.status !== 'READ'
        ).length

        return {
          ...contact,
          unreadCount,
          lastMessage: lastMessage?.content,
          lastMessageTime: lastMessage?.createdAt
        }
      })
      
      // Sort by last message time
      transformedContacts.sort((a, b) => {
        if (!a.lastMessageTime) return 1
        if (!b.lastMessageTime) return -1
        return new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
      })
      
      setContacts(transformedContacts)
    } catch (error) {
      toast.error('Failed to load contacts')
    }
  }

  const handleSendMessage = async (contactId: string, content: string, type: 'SMS' | 'WHATSAPP' = 'WHATSAPP') => {
    const contact = contacts.find(c => c.id === contactId)
    if (!contact) {
      throw new Error('Contact not found')
    }

    const messageData = {
      type,
      direction: 'OUTBOUND' as const,
      content,
      status: 'SENT' as const,
      contactName: contact.name,
      contactPhone: contact.phone,
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
    
    if (!result.success) {
      throw new Error(result.message || 'Failed to send message')
    }

    // Update local messages state
    const newMessage: Message = {
      ...result.message,
      contactId: contactId,
      updatedAt: result.message.createdAt
    }
    
    setMessages(prev => [...prev, newMessage])
    
    // Update contact's last message info
    setContacts(prev => prev.map(c => 
      c.id === contactId 
        ? { 
            ...c, 
            lastMessage: content, 
            lastMessageTime: newMessage.createdAt 
          }
        : c
    ))

    return newMessage
  }

  const handleLoadConversation = async (contactId: string): Promise<Message[]> => {
    const contact = contacts.find(c => c.id === contactId)
    if (!contact) return []
    
    // Filter messages for this contact
    const contactMessages = messages.filter(m => m.contactPhone === contact.phone)
    
    // Sort by creation time
    contactMessages.sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )
    
    return contactMessages
  }

  // Calculate stats for the header
  const stats = {
    total: messages.length,
    sent: messages.filter(m => m.direction === 'OUTBOUND').length,
    received: messages.filter(m => m.direction === 'INBOUND').length,
    delivered: messages.filter(m => m.status === 'DELIVERED' || m.status === 'READ').length,
    failed: messages.filter(m => m.status === 'FAILED').length,
    responseRate: Math.round((messages.filter(m => m.direction === 'INBOUND').length / Math.max(messages.filter(m => m.direction === 'OUTBOUND').length, 1)) * 100) || 0
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
            <button className="bg-primary-500 text-white px-4 py-2 rounded-lg hover:bg-primary-600 transition-colors flex items-center space-x-2">
              <Plus className="w-4 h-4" />
              <span>New Message</span>
            </button>
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
        >
          <ChatInterface
            contacts={contacts}
            messages={messages}
            onSendMessage={handleSendMessage}
            onLoadConversation={handleLoadConversation}
            loading={loading}
          />
        </motion.div>
      </div>
    </AdminLayout>
  )
}