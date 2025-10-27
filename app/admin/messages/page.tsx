'use client'

import { useState, useEffect } from 'react'
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
  MoreVertical
} from 'lucide-react'
import AdminLayout from '../components/AdminLayout'
import toast from 'react-hot-toast'
import DataService, { Message } from '../../../lib/dataService'

export default function MessagesPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)

  const [filteredMessages, setFilteredMessages] = useState<Message[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [directionFilter, setDirectionFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [selectedContact, setSelectedContact] = useState<string | null>(null)
  const [newMessage, setNewMessage] = useState('')

  useEffect(() => {
    loadMessages()
  }, [])

  useEffect(() => {
    let filtered = messages

    if (searchTerm) {
      filtered = filtered.filter(message => 
        message.contactName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        message.contactPhone.includes(searchTerm) ||
        message.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        message.campaignName?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (typeFilter !== 'ALL') {
      filtered = filtered.filter(message => message.type === typeFilter)
    }

    if (directionFilter !== 'ALL') {
      filtered = filtered.filter(message => message.direction === directionFilter)
    }

    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(message => message.status === statusFilter)
    }

    setFilteredMessages(filtered)
  }, [messages, searchTerm, typeFilter, directionFilter, statusFilter])

  const loadMessages = async () => {
    try {
      setLoading(true)
      const data = await DataService.getMessages()
      setMessages(data)
    } catch (error) {
      toast.error('Failed to load messages')
    } finally {
      setLoading(false)
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

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'SMS': return Phone
      case 'WHATSAPP': return MessageSquare
      case 'EMAIL': return Mail
      default: return MessageSquare
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'SMS': return 'bg-blue-100 text-blue-800'
      case 'WHATSAPP': return 'bg-green-100 text-green-800'
      case 'EMAIL': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedContact) return

    try {
      const messageData = {
        type: 'WHATSAPP' as const,
        direction: 'OUTBOUND' as const,
        content: newMessage,
        status: 'SENT' as const,
        contactName: selectedContact,
        contactPhone: '+91-9876543210',
        sentBy: 'Current User',
        sentAt: new Date().toISOString()
      }

      const message = await DataService.sendMessage(messageData)
      setMessages(prev => [message, ...prev])
      setNewMessage('')
      toast.success('Message sent successfully')
    } catch (error) {
      toast.error('Failed to send message')
    }
  }

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
          <button className="btn-primary flex items-center">
            <Send className="w-5 h-5 mr-2" />
            Compose Message
          </button>
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

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
        >
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search messages by contact, content, or campaign..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="flex gap-3">
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
              
              <select
                value={directionFilter}
                onChange={(e) => setDirectionFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="ALL">All Directions</option>
                <option value="OUTBOUND">Sent</option>
                <option value="INBOUND">Received</option>
              </select>
              
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="ALL">All Status</option>
                <option value="PENDING">Pending</option>
                <option value="SENT">Sent</option>
                <option value="DELIVERED">Delivered</option>
                <option value="READ">Read</option>
                <option value="FAILED">Failed</option>
                <option value="REPLIED">Replied</option>
              </select>
            </div>
          </div>
        </motion.div>

        {/* Messages List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-white rounded-xl shadow-sm border border-gray-100"
        >
          <div className="divide-y divide-gray-200">
            {filteredMessages.map((message, index) => {
              const StatusIcon = getStatusIcon(message.status)
              const TypeIcon = getTypeIcon(message.type)
              
              return (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-6 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start space-x-4">
                    {/* Direction Indicator */}
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      message.direction === 'OUTBOUND' 
                        ? 'bg-blue-100' 
                        : 'bg-green-100'
                    }`}>
                      {message.direction === 'OUTBOUND' ? (
                        <ArrowUpRight className="w-6 h-6 text-blue-600" />
                      ) : (
                        <ArrowDownLeft className="w-6 h-6 text-green-600" />
                      )}
                    </div>

                    {/* Message Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          <h3 className="text-sm font-semibold text-gray-900">
                            {message.contactName}
                          </h3>
                          <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(message.type)}`}>
                            <TypeIcon className="w-3 h-3 mr-1" />
                            {message.type}
                          </span>
                          <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(message.status)}`}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {message.status}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-gray-500">
                          <span>{new Date(message.createdAt).toLocaleDateString()}</span>
                          <span>{new Date(message.createdAt).toLocaleTimeString()}</span>
                        </div>
                      </div>

                      <div className="mb-2">
                        <p className="text-sm text-gray-600">{message.contactPhone}</p>
                        {message.contactEmail && (
                          <p className="text-sm text-gray-600">{message.contactEmail}</p>
                        )}
                      </div>

                      <div className="mb-3">
                        <p className="text-gray-900 leading-relaxed">
                          {message.content}
                        </p>
                      </div>

                      {/* Message Metadata */}
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <div className="flex items-center space-x-4">
                          {message.campaignName && (
                            <span>Campaign: {message.campaignName}</span>
                          )}
                          {message.sentBy && (
                            <span>Sent by: {message.sentBy}</span>
                          )}
                        </div>
                        
                        {/* Delivery Timeline */}
                        {message.direction === 'OUTBOUND' && (
                          <div className="flex items-center space-x-2">
                            {message.sentAt && (
                              <span>Sent: {new Date(message.sentAt).toLocaleTimeString()}</span>
                            )}
                            {message.deliveredAt && (
                              <span>• Delivered: {new Date(message.deliveredAt).toLocaleTimeString()}</span>
                            )}
                            {message.readAt && (
                              <span>• Read: {new Date(message.readAt).toLocaleTimeString()}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2">
                      <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                        <MessageSquare className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
          
          {filteredMessages.length === 0 && (
            <div className="text-center py-12">
              <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No messages found matching your criteria</p>
            </div>
          )}
        </motion.div>
      </div>
    </AdminLayout>
  )
}