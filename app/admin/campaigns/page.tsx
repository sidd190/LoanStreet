'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Target, 
  Search, 
  Filter, 
  Plus,
  Play,
  Pause,
  Stop,
  Edit,
  Trash2,
  Eye,
  MessageSquare,
  Phone,
  Mail,
  Users,
  Calendar,
  Clock,
  TrendingUp,
  BarChart3,
  Send,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react'
import AdminLayout from '../components/AdminLayout'
import toast from 'react-hot-toast'
import DataService, { Campaign } from '../../../lib/dataService'

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)

  const [filteredCampaigns, setFilteredCampaigns] = useState<Campaign[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [showCreateModal, setShowCreateModal] = useState(false)

  useEffect(() => {
    loadCampaigns()
  }, [])

  useEffect(() => {
    let filtered = campaigns

    if (searchTerm) {
      filtered = filtered.filter(campaign => 
        campaign.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        campaign.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        campaign.createdBy.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(campaign => campaign.status === statusFilter)
    }

    if (typeFilter !== 'ALL') {
      filtered = filtered.filter(campaign => campaign.type === typeFilter)
    }

    setFilteredCampaigns(filtered)
  }, [campaigns, searchTerm, statusFilter, typeFilter])

  const loadCampaigns = async () => {
    try {
      setLoading(true)
      const data = await DataService.getCampaigns()
      setCampaigns(data)
    } catch (error) {
      toast.error('Failed to load campaigns')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'bg-gray-100 text-gray-800'
      case 'SCHEDULED': return 'bg-blue-100 text-blue-800'
      case 'RUNNING': return 'bg-green-100 text-green-800'
      case 'COMPLETED': return 'bg-emerald-100 text-emerald-800'
      case 'PAUSED': return 'bg-yellow-100 text-yellow-800'
      case 'CANCELLED': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'DRAFT': return Edit
      case 'SCHEDULED': return Clock
      case 'RUNNING': return Play
      case 'COMPLETED': return CheckCircle
      case 'PAUSED': return Pause
      case 'CANCELLED': return XCircle
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

  const updateCampaignStatus = async (campaignId: string, newStatus: string) => {
    try {
      await DataService.updateCampaign(campaignId, { 
        status: newStatus as any, 
        updatedAt: new Date().toISOString() 
      })
      setCampaigns(prev => 
        prev.map(campaign => 
          campaign.id === campaignId 
            ? { ...campaign, status: newStatus as any, updatedAt: new Date().toISOString() }
            : campaign
        )
      )
      toast.success(`Campaign ${newStatus.toLowerCase()}`)
    } catch (error) {
      toast.error('Failed to update campaign status')
    }
  }

  const deleteCampaign = async (campaignId: string) => {
    if (confirm('Are you sure you want to delete this campaign?')) {
      try {
        await DataService.deleteCampaign(campaignId)
        setCampaigns(prev => prev.filter(campaign => campaign.id !== campaignId))
        toast.success('Campaign deleted')
      } catch (error) {
        toast.error('Failed to delete campaign')
      }
    }
  }

  const calculateDeliveryRate = (campaign: Campaign) => {
    return campaign.totalSent > 0 ? Math.round((campaign.totalDelivered / campaign.totalSent) * 100) : 0
  }

  const calculateResponseRate = (campaign: Campaign) => {
    return campaign.totalDelivered > 0 ? Math.round((campaign.totalReplies / campaign.totalDelivered) * 100) : 0
  }

  const stats = {
    total: campaigns.length,
    running: campaigns.filter(c => c.status === 'RUNNING').length,
    completed: campaigns.filter(c => c.status === 'COMPLETED').length,
    scheduled: campaigns.filter(c => c.status === 'SCHEDULED').length,
    totalSent: campaigns.reduce((sum, c) => sum + c.totalSent, 0),
    totalReplies: campaigns.reduce((sum, c) => sum + c.totalReplies, 0)
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Campaign Management</h1>
            <p className="text-gray-600 mt-1">
              Create, manage, and track your SMS, WhatsApp, and email marketing campaigns
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary flex items-center"
          >
            <Plus className="w-5 h-5 mr-2" />
            Create Campaign
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
              <Target className="w-8 h-8 text-blue-500 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Total Campaigns</p>
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
              <Play className="w-8 h-8 text-green-500 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Running</p>
                <p className="text-2xl font-bold text-gray-900">{stats.running}</p>
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
              <CheckCircle className="w-8 h-8 text-emerald-500 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-gray-900">{stats.completed}</p>
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
              <Clock className="w-8 h-8 text-blue-500 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Scheduled</p>
                <p className="text-2xl font-bold text-gray-900">{stats.scheduled}</p>
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
              <Send className="w-8 h-8 text-purple-500 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Messages Sent</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalSent.toLocaleString()}</p>
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
              <TrendingUp className="w-8 h-8 text-orange-500 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Total Replies</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalReplies.toLocaleString()}</p>
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
                  placeholder="Search campaigns by name, message, or creator..."
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
                <option value="ALL">All Status</option>
                <option value="DRAFT">Draft</option>
                <option value="SCHEDULED">Scheduled</option>
                <option value="RUNNING">Running</option>
                <option value="COMPLETED">Completed</option>
                <option value="PAUSED">Paused</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
              
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
        </motion.div>

        {/* Campaigns Grid */}
        <div className="grid lg:grid-cols-2 gap-6">
          {filteredCampaigns.map((campaign, index) => {
            const StatusIcon = getStatusIcon(campaign.status)
            const TypeIcon = getTypeIcon(campaign.type)
            const deliveryRate = calculateDeliveryRate(campaign)
            const responseRate = calculateResponseRate(campaign)
            
            return (
              <motion.div
                key={campaign.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-lg transition-all duration-300"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
                      <TypeIcon className="w-6 h-6 text-primary-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {campaign.name}
                      </h3>
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(campaign.type)}`}>
                          {campaign.type}
                        </span>
                        <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(campaign.status)}`}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {campaign.status}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    {campaign.status === 'DRAFT' && (
                      <button
                        onClick={() => updateCampaignStatus(campaign.id, 'SCHEDULED')}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="Schedule Campaign"
                      >
                        <Calendar className="w-4 h-4" />
                      </button>
                    )}
                    {campaign.status === 'SCHEDULED' && (
                      <button
                        onClick={() => updateCampaignStatus(campaign.id, 'RUNNING')}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                        title="Start Campaign"
                      >
                        <Play className="w-4 h-4" />
                      </button>
                    )}
                    {campaign.status === 'RUNNING' && (
                      <button
                        onClick={() => updateCampaignStatus(campaign.id, 'PAUSED')}
                        className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg"
                        title="Pause Campaign"
                      >
                        <Pause className="w-4 h-4" />
                      </button>
                    )}
                    {campaign.status === 'PAUSED' && (
                      <button
                        onClick={() => updateCampaignStatus(campaign.id, 'RUNNING')}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                        title="Resume Campaign"
                      >
                        <Play className="w-4 h-4" />
                      </button>
                    )}
                    <button className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteCampaign(campaign.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Message Preview */}
                <div className="mb-4">
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {campaign.message}
                  </p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900">
                      {campaign.totalContacts.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500">Total Contacts</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {campaign.totalSent.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500">Messages Sent</div>
                  </div>
                </div>

                {/* Performance Metrics */}
                {campaign.totalSent > 0 && (
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Delivery Rate</span>
                      <span className="text-sm font-semibold">{deliveryRate}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${deliveryRate}%` }}
                      ></div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Response Rate</span>
                      <span className="text-sm font-semibold">{responseRate}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${responseRate}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {/* Footer */}
                <div className="flex justify-between items-center text-sm text-gray-500 pt-4 border-t border-gray-100">
                  <div>
                    Created by {campaign.createdBy}
                  </div>
                  <div>
                    {campaign.scheduledAt && (
                      <span>
                        {campaign.status === 'SCHEDULED' ? 'Scheduled for' : 'Sent on'}{' '}
                        {new Date(campaign.scheduledAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>

        {filteredCampaigns.length === 0 && (
          <div className="text-center py-12">
            <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No campaigns found matching your criteria</p>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}