'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  MessageSquare, 
  Search, 
  Send,
  Phone,
  User,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowUpRight,
  ArrowDownLeft,
  Reply,
  Eye,
  Filter
} from 'lucide-react'
import EmployeeLayout from '../../components/EmployeeLayout'
import toast from 'react-hot-toast'
import DataService, { Message } from '../../../../lib/dataService'

export default function EmployeeMessagesPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [filteredMessages, setFilteredMessages] = useState<Message[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null)
  const [replyText, setReplyText] = useState('')
  const [sendingReply, setSendingReply] = useState(false)

  useEffect(() => {
    loadMessages()
  }, [])

  useEffect(() => {
    let filtered = messages

    if (searchTerm) {
      filtered = filtered.filter(message => 
        message.contactName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        message.contactPhone.includes(searchTerm) ||
        message.content.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (statusFilter !== 'ALL') {
      if (statusFilter === 'NEEDS_REPLY') {
        filtered = filtered.filter(message => 
          message.direction === 'INBOUND' && 
          !messages.some(m => 
            m.direction === 'OUTBOUND' && 
            m.contactPhone === message.contactPhone && 
            new Date(m.createdAt) > new Date(message.createdAt)
          )
        )
      } else {
        filtered = filtered.filter(message => message.status === statusFilter)
      }
    }

    setFilteredMessages(filtered)
  }, [messages, searchTerm, statusFilter])

  const loadMessages = async () => {
    try {
      setLoading(true)
      const data = await DataService.getMessages()
      // Sort messages by date, newest first
      const sortedMessages = data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      setMessages(sortedMessages)
      
      // Log action
      await logEmployeeAction('view_messages', { count: data.length })
    } catch (error) {
      toast.error('Failed to load messages')
    } finally {
      setLoading(false)
    }
  }

  const logEmployeeAction = async (action: string, details: any = {}) => {
    try {
      const token = localStorage.getItem('adminToken')
      if (!token) return

      await fetch('/api/employee/log-action', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action,
          details,
          timestamp: new Date().toISOString()
        })
      })
    } catch (error) {
      console.error('Failed to log action:', error)
    }
  }

  const handleReply = async (message: Message) => {
    if (!replyText.trim()) {
      toast.error('Please enter a reply message')
      return
    }

    setSendingReply(true)
    try {
      const replyData = {
        type: message.type,
        direction: 'OUTBOUND' as const,
        content: replyText,
        status: 'SENT' as const,
        contactName: message.contactName,
        contactPhone: message.contactPhone,
        contactEmail: message.contactEmail,
        sentBy: 'Employee',
        sentAt: new Date().toISOString(),
        parentMessageId: message.id
      }

      const reply = await DataService.sendMessage(replyData)
      setMessages(prev => [reply, ...prev])
      setReplyText('')
      setSelectedMessage(null)
      
      // Log action
      await logEmployeeAction('send_reply', { 
        originalMessageId: message.id,
        contactPhone: message.contactPhone,
        replyLength: replyText.length
      })
      
      toast.success('Reply sent successfully')
    } catch (error) {
      toast.error('Failed to send reply')
    } finally {
      setSendingReply(false)
    }
  }

  const markAsRead = async (message: Message) => {
    try {
      await logEmployeeAction('mark_read', { messageId: message.id })
      // In a real implementation, you would update the message status
      toast.success('Message marked as read')
    } catch (error) {
      console.error('Failed to mark as read:', error)
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

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'SMS': return 'bg-blue-100 text-blue-800'
      case 'WHATSAPP': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const inboundMessages = messages.filter(m => m.direction === 'INBOUND')
  const needsReplyCount = inboundMessages.filter(message => 
    !messages.some(m => 
      m.direction === 'OUTBOUND' && 
      m.contactPhone === message.contactPhone && 
      new Date(m.createdAt) > new Date(message.createdAt)
    )
  ).length

  const stats = {
    total: messages.length,
    inbound: inboundMessages.length,
    needsReply: needsReplyCount,
    repliedToday: messages.filter(m => 
      m.direction === 'OUTBOUND' && 
      new Date(m.createdAt).toDateString() === new Date().toDateString()
    ).length
  }

  return (
    <EmployeeLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Message Center</h1>
            <p className="text-gray-600 mt-1">
              View and respond to customer messages
            </p>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <User className="w-4 h-4" />
            <span>Employee View</span>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
              <ArrowDownLeft className="w-8 h-8 text-green-500 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Received</p>
                <p className="text-2xl font-bold text-gray-900">{stats.inbound}</p>
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
              <AlertCircle className="w-8 h-8 text-orange-500 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Needs Reply</p>
                <p className="text-2xl font-bold text-gray-900">{stats.needsReply}</p>
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
              <Reply className="w-8 h-8 text-purple-500 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Replied Today</p>
                <p className="text-2xl font-bold text-gray-900">{stats.repliedToday}</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
        >
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search messages by contact or content..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="flex gap-3">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="ALL">All Messages</option>
                <option value="NEEDS_REPLY">Needs Reply</option>
                <option value="DELIVERED">Delivered</option>
                <option value="READ">Read</option>
                <option value="REPLIED">Replied</option>
              </select>
            </div>
          </div>
        </motion.div>

        {/* Messages List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-xl shadow-sm border border-gray-100"
        >
          <div className="divide-y divide-gray-200">
            {filteredMessages.map((message, index) => {
              const StatusIcon = getStatusIcon(message.status)
              const needsReply = message.direction === 'INBOUND' && 
                !messages.some(m => 
                  m.direction === 'OUTBOUND' && 
                  m.contactPhone === message.contactPhone && 
                  new Date(m.createdAt) > new Date(message.createdAt)
                )
              
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
                        : needsReply 
                          ? 'bg-orange-100'
                          : 'bg-green-100'
                    }`}>
                      {message.direction === 'OUTBOUND' ? (
                        <ArrowUpRight className="w-6 h-6 text-blue-600" />
                      ) : needsReply ? (
                        <AlertCircle className="w-6 h-6 text-orange-600" />
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
                            {message.type}
                          </span>
                          <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(message.status)}`}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {message.status}
                          </span>
                          {needsReply && (
                            <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">
                              Needs Reply
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-gray-500">
                          <span>{new Date(message.createdAt).toLocaleDateString()}</span>
                          <span>{new Date(message.createdAt).toLocaleTimeString()}</span>
                        </div>
                      </div>

                      <div className="mb-2">
                        <p className="text-sm text-gray-600">{message.contactPhone}</p>
                      </div>

                      <div className="mb-3">
                        <p className="text-gray-900 leading-relaxed">
                          {message.content}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2">
                      {message.direction === 'INBOUND' && (
                        <button 
                          onClick={() => setSelectedMessage(message)}
                          className="p-2 text-blue-600 hover:text-blue-800 rounded-lg hover:bg-blue-50"
                          title="Reply to message"
                        >
                          <Reply className="w-4 h-4" />
                        </button>
                      )}
                      <button 
                        onClick={() => markAsRead(message)}
                        className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                        title="Mark as read"
                      >
                        <Eye className="w-4 h-4" />
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

        {/* Reply Modal */}
        {selectedMessage && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                  Reply to {selectedMessage.contactName}
                </h3>
                <p className="text-sm text-gray-600">{selectedMessage.contactPhone}</p>
              </div>
              
              <div className="p-6">
                <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Original message:</p>
                  <p className="text-gray-900">{selectedMessage.content}</p>
                </div>
                
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type your reply..."
                  className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                />
              </div>
              
              <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setSelectedMessage(null)
                    setReplyText('')
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleReply(selectedMessage)}
                  disabled={sendingReply || !replyText.trim()}
                  className="btn-primary flex items-center disabled:opacity-50"
                >
                  {sendingReply ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Send Reply
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </EmployeeLayout>
  )
}