'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  X, 
  User, 
  Phone, 
  Mail, 
  Tag, 
  MapPin, 
  Calendar, 
  MessageSquare, 
  TrendingUp,
  Activity,
  Edit,
  Trash2,
  Send
} from 'lucide-react'
import toast from 'react-hot-toast'
import DataService, { Contact, Message } from '../../../../lib/dataService'

interface ContactDetailViewProps {
  contactId: string | null
  isOpen: boolean
  onClose: () => void
  onEdit: (contact: Contact) => void
  onDelete: (contactId: string) => void
}

interface ContactStats {
  totalMessages: number
  totalCampaigns: number
  responseRate: number
  averageResponseTime: number
  lastMessageAt?: string
  engagementScore: number
}

export default function ContactDetailView({ 
  contactId, 
  isOpen, 
  onClose, 
  onEdit, 
  onDelete 
}: ContactDetailViewProps) {
  const [contact, setContact] = useState<Contact | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [stats, setStats] = useState<ContactStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'messages' | 'activity'>('overview')

  useEffect(() => {
    if (contactId && isOpen) {
      loadContactDetails()
    }
  }, [contactId, isOpen])

  const loadContactDetails = async () => {
    if (!contactId) return

    setLoading(true)
    try {
      const [contactData, messagesData] = await Promise.all([
        DataService.getContact(contactId),
        DataService.getMessages() // Filter by contact in real implementation
      ])

      if (contactData) {
        setContact(contactData)
        
        // Filter messages for this contact
        const contactMessages = messagesData.filter(
          msg => msg.contactPhone === contactData.phone
        )
        setMessages(contactMessages)

        // Calculate stats
        const responseMessages = contactMessages.filter(msg => msg.direction === 'INBOUND')
        const avgResponseTime = responseMessages.length > 0 ? 2.4 : 0 // Mock calculation
        
        setStats({
          totalMessages: contactData.totalMessages,
          totalCampaigns: contactData.totalCampaigns,
          responseRate: contactData.responseRate,
          averageResponseTime: avgResponseTime,
          lastMessageAt: contactData.lastContact,
          engagementScore: Math.min(100, (contactData.responseRate + contactData.totalMessages * 2))
        })
      }
    } catch (error) {
      console.error('Error loading contact details:', error)
      toast.error('Failed to load contact details')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = () => {
    if (contact && confirm('Are you sure you want to delete this contact? This action cannot be undone.')) {
      onDelete(contact.id)
      onClose()
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-800'
      case 'INACTIVE': return 'bg-yellow-100 text-yellow-800'
      case 'BLOCKED': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getEngagementLevel = (score: number) => {
    if (score >= 80) return { label: 'High', color: 'text-green-600' }
    if (score >= 50) return { label: 'Medium', color: 'text-yellow-600' }
    return { label: 'Low', color: 'text-red-600' }
  }

  if (!isOpen || !contact) return null

  const engagement = stats ? getEngagementLevel(stats.engagementScore) : { label: 'Unknown', color: 'text-gray-600' }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mr-4">
              <User className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{contact.name}</h2>
              <p className="text-gray-600">{contact.phone}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onEdit(contact)}
              className="p-2 text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
            >
              <Edit className="w-5 h-5" />
            </button>
            <button
              onClick={handleDelete}
              className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          {[
            { id: 'overview', label: 'Overview', icon: User },
            { id: 'messages', label: 'Messages', icon: MessageSquare },
            { id: 'activity', label: 'Activity', icon: Activity }
          ].map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="w-4 h-4 mr-2" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <>
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Contact Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Contact Information</h3>
                      <div className="space-y-3">
                        <div className="flex items-center">
                          <Phone className="w-5 h-5 text-gray-400 mr-3" />
                          <span className="text-gray-900">{contact.phone}</span>
                        </div>
                        {contact.email && (
                          <div className="flex items-center">
                            <Mail className="w-5 h-5 text-gray-400 mr-3" />
                            <span className="text-gray-900">{contact.email}</span>
                          </div>
                        )}
                        <div className="flex items-center">
                          <MapPin className="w-5 h-5 text-gray-400 mr-3" />
                          <span className="text-gray-900">{contact.source}</span>
                        </div>
                        <div className="flex items-center">
                          <Calendar className="w-5 h-5 text-gray-400 mr-3" />
                          <span className="text-gray-900">
                            Joined {new Date(contact.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Status & Engagement</h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Status</span>
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(contact.status)}`}>
                            {contact.status}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Engagement Level</span>
                          <span className={`font-medium ${engagement.color}`}>
                            {engagement.label}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Response Rate</span>
                          <span className="font-medium text-gray-900">{contact.responseRate}%</span>
                        </div>
                        {stats?.averageResponseTime && (
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600">Avg Response Time</span>
                            <span className="font-medium text-gray-900">{stats.averageResponseTime}h</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Tags */}
                  {contact.tags && contact.tags.length > 0 && (
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-3">Tags</h3>
                      <div className="flex flex-wrap gap-2">
                        {contact.tags.map((tag, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                          >
                            <Tag className="w-3 h-3 mr-1" />
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Statistics */}
                  {stats && (
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Statistics</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-blue-50 rounded-lg p-4 text-center">
                          <MessageSquare className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                          <div className="text-2xl font-bold text-blue-900">{stats.totalMessages}</div>
                          <div className="text-sm text-blue-600">Messages</div>
                        </div>
                        <div className="bg-green-50 rounded-lg p-4 text-center">
                          <Send className="w-8 h-8 text-green-600 mx-auto mb-2" />
                          <div className="text-2xl font-bold text-green-900">{stats.totalCampaigns}</div>
                          <div className="text-sm text-green-600">Campaigns</div>
                        </div>
                        <div className="bg-purple-50 rounded-lg p-4 text-center">
                          <TrendingUp className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                          <div className="text-2xl font-bold text-purple-900">{stats.responseRate}%</div>
                          <div className="text-sm text-purple-600">Response Rate</div>
                        </div>
                        <div className="bg-orange-50 rounded-lg p-4 text-center">
                          <Activity className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                          <div className="text-2xl font-bold text-orange-900">{stats.engagementScore}</div>
                          <div className="text-sm text-orange-600">Engagement</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'messages' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-gray-900">Message History</h3>
                    <button className="btn-primary flex items-center">
                      <Send className="w-4 h-4 mr-2" />
                      Send Message
                    </button>
                  </div>
                  
                  {messages.length > 0 ? (
                    <div className="space-y-3">
                      {messages.slice(0, 10).map((message, index) => (
                        <div
                          key={message.id}
                          className={`p-4 rounded-lg ${
                            message.direction === 'OUTBOUND'
                              ? 'bg-primary-50 border-l-4 border-primary-500 ml-8'
                              : 'bg-gray-50 border-l-4 border-gray-300 mr-8'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className={`text-sm font-medium ${
                              message.direction === 'OUTBOUND' ? 'text-primary-700' : 'text-gray-700'
                            }`}>
                              {message.direction === 'OUTBOUND' ? 'Sent' : 'Received'}
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(message.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-gray-900">{message.content}</p>
                          <div className="flex items-center justify-between mt-2">
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              message.status === 'DELIVERED' ? 'bg-green-100 text-green-800' :
                              message.status === 'SENT' ? 'bg-blue-100 text-blue-800' :
                              message.status === 'FAILED' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {message.status}
                            </span>
                            <span className="text-xs text-gray-500">{message.type}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No messages found</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'activity' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
                  
                  <div className="space-y-3">
                    {/* Mock activity data */}
                    {[
                      {
                        id: 1,
                        type: 'message',
                        description: 'Received WhatsApp message',
                        timestamp: '2024-10-26T14:30:00',
                        icon: MessageSquare,
                        color: 'text-blue-600'
                      },
                      {
                        id: 2,
                        type: 'campaign',
                        description: 'Added to Personal Loan Campaign',
                        timestamp: '2024-10-25T10:15:00',
                        icon: Send,
                        color: 'text-green-600'
                      },
                      {
                        id: 3,
                        type: 'update',
                        description: 'Contact information updated',
                        timestamp: '2024-10-24T16:45:00',
                        icon: Edit,
                        color: 'text-orange-600'
                      }
                    ].map((activity) => {
                      const Icon = activity.icon
                      return (
                        <div key={activity.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                          <Icon className={`w-5 h-5 mt-0.5 ${activity.color}`} />
                          <div className="flex-1">
                            <p className="text-gray-900">{activity.description}</p>
                            <p className="text-sm text-gray-500">
                              {new Date(activity.timestamp).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </motion.div>
    </div>
  )
}