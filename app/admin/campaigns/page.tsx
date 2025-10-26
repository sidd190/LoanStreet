'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Plus, 
  Search, 
  Filter, 
  Play, 
  Pause, 
  Edit, 
  Trash2,
  MessageSquare,
  Users,
  Calendar,
  TrendingUp,
  Eye
} from 'lucide-react'
import AdminLayout from '../components/AdminLayout'

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('ALL')

  const mockCampaigns = [
    {
      id: '1',
      name: 'Personal Loan Promotion - Diwali',
      type: 'WHATSAPP',
      status: 'RUNNING',
      totalContacts: 2500,
      sent: 2500,
      delivered: 2450,
      replies: 245,
      createdAt: '2024-10-20',
      scheduledAt: '2024-10-21T10:00:00',
      message: 'Get instant personal loans up to ₹5L with minimal documentation. Apply now and get approved in 24 hours!'
    },
    {
      id: '2',
      name: 'Business Loan Campaign',
      type: 'SMS',
      status: 'COMPLETED',
      totalContacts: 1200,
      sent: 1200,
      delivered: 1180,
      replies: 89,
      createdAt: '2024-10-18',
      scheduledAt: '2024-10-19T09:00:00',
      message: 'Expand your business with our flexible business loans. Interest rates starting from 12.99%'
    },
    {
      id: '3',
      name: 'Home Loan Weekend Special',
      type: 'WHATSAPP',
      status: 'SCHEDULED',
      totalContacts: 3000,
      sent: 0,
      delivered: 0,
      replies: 0,
      createdAt: '2024-10-22',
      scheduledAt: '2024-10-26T08:00:00',
      message: 'Weekend special: Home loans at 8.99% interest rate. Limited time offer!'
    }
  ]

  useEffect(() => {
    setCampaigns(mockCampaigns)
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'RUNNING': return 'bg-green-100 text-green-800'
      case 'COMPLETED': return 'bg-blue-100 text-blue-800'
      case 'SCHEDULED': return 'bg-yellow-100 text-yellow-800'
      case 'PAUSED': return 'bg-gray-100 text-gray-800'
      case 'CANCELLED': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getTypeIcon = (type: string) => {
    return type === 'WHATSAPP' ? '📱' : '💬'
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Campaigns</h1>
            <p className="text-gray-600 mt-1">Manage your marketing campaigns</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary flex items-center"
          >
            <Plus className="w-5 h-5 mr-2" />
            New Campaign
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search campaigns..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="ALL">All Status</option>
                <option value="RUNNING">Running</option>
                <option value="COMPLETED">Completed</option>
                <option value="SCHEDULED">Scheduled</option>
                <option value="PAUSED">Paused</option>
              </select>
              <button className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                <Filter className="w-4 h-4 mr-2" />
                More Filters
              </button>
            </div>
          </div>
        </div>

        {/* Campaigns Grid */}
        <div className="grid gap-6">
          {mockCampaigns.map((campaign, index) => (
            <motion.div
              key={campaign.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start space-x-4">
                  <div className="text-2xl">{getTypeIcon(campaign.type)}</div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{campaign.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">{campaign.message}</p>
                    <div className="flex items-center space-x-4 mt-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(campaign.status)}`}>
                        {campaign.status}
                      </span>
                      <span className="text-xs text-gray-500">
                        Created: {new Date(campaign.createdAt).toLocaleDateString()}
                      </span>
                      {campaign.scheduledAt && (
                        <span className="text-xs text-gray-500">
                          Scheduled: {new Date(campaign.scheduledAt).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
                    <Eye className="w-4 h-4" />
                  </button>
                  <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
                    <Edit className="w-4 h-4" />
                  </button>
                  {campaign.status === 'RUNNING' ? (
                    <button className="p-2 text-orange-500 hover:text-orange-700 hover:bg-orange-50 rounded-lg">
                      <Pause className="w-4 h-4" />
                    </button>
                  ) : campaign.status === 'SCHEDULED' ? (
                    <button className="p-2 text-green-500 hover:text-green-700 hover:bg-green-50 rounded-lg">
                      <Play className="w-4 h-4" />
                    </button>
                  ) : null}
                  <button className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Campaign Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <Users className="w-5 h-5 text-gray-500 mx-auto mb-1" />
                  <p className="text-sm text-gray-600">Total Contacts</p>
                  <p className="text-lg font-semibold text-gray-900">{campaign.totalContacts.toLocaleString()}</p>
                </div>
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <MessageSquare className="w-5 h-5 text-blue-500 mx-auto mb-1" />
                  <p className="text-sm text-gray-600">Sent</p>
                  <p className="text-lg font-semibold text-blue-600">{campaign.sent.toLocaleString()}</p>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-green-500 mx-auto mb-1" />
                  <p className="text-sm text-gray-600">Delivered</p>
                  <p className="text-lg font-semibold text-green-600">{campaign.delivered.toLocaleString()}</p>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <Calendar className="w-5 h-5 text-purple-500 mx-auto mb-1" />
                  <p className="text-sm text-gray-600">Replies</p>
                  <p className="text-lg font-semibold text-purple-600">{campaign.replies.toLocaleString()}</p>
                </div>
              </div>

              {/* Progress Bar */}
              {campaign.status === 'RUNNING' && (
                <div className="mt-4">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Progress</span>
                    <span>{Math.round((campaign.sent / campaign.totalContacts) * 100)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(campaign.sent / campaign.totalContacts) * 100}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {/* Create Campaign Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Create New Campaign</h2>
              </div>
              
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Campaign Name</label>
                  <input
                    type="text"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Enter campaign name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Campaign Type</label>
                  <select className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent">
                    <option value="SMS">SMS</option>
                    <option value="WHATSAPP">WhatsApp</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
                  <textarea
                    rows={4}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Enter your message"
                  ></textarea>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Schedule</label>
                  <input
                    type="datetime-local"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>
              
              <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button className="btn-primary">
                  Create Campaign
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}