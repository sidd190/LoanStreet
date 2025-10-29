'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import RouteProtection from '../../../components/RouteProtection'
import { 
  Target, 
  MessageSquare,
  Phone,
  Mail,
  Users,
  Calendar,
  Clock,
  Send,
  Save,
  ArrowLeft,
  FileText,
  Settings
} from 'lucide-react'
import AdminLayout from '../../components/AdminLayout'
import toast from 'react-hot-toast'
import DataService from '../../../../lib/dataService'

function CreateCampaignContent() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    type: 'WHATSAPP' as 'SMS' | 'WHATSAPP' | 'EMAIL',
    message: '',
    scheduledAt: '',
    targetAudience: 'ALL' as 'ALL' | 'LEADS' | 'CUSTOMERS' | 'CUSTOM',
    customFilters: {
      loanType: '',
      minAmount: '',
      maxAmount: '',
      status: '',
      tags: []
    }
  })

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleCustomFilterChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      customFilters: {
        ...prev.customFilters,
        [field]: value
      }
    }))
  }

  const validateForm = () => {
    if (!formData.name.trim()) {
      toast.error('Campaign name is required')
      return false
    }
    if (!formData.message.trim()) {
      toast.error('Message content is required')
      return false
    }
    if (formData.message.length > 1000) {
      toast.error('Message content is too long (max 1000 characters)')
      return false
    }
    return true
  }

  const saveCampaign = async (status: 'DRAFT' | 'SCHEDULED') => {
    if (!validateForm()) return

    try {
      setLoading(true)
      
      const campaignData = {
        name: formData.name,
        type: formData.type,
        message: formData.message,
        status,
        scheduledAt: formData.scheduledAt || undefined,
        totalContacts: 0, // Will be calculated based on filters
        totalSent: 0,
        totalDelivered: 0,
        totalReplies: 0,
        totalFailed: 0,
        createdBy: 'Current User', // Will be set by API
        targetAudience: formData.targetAudience,
        customFilters: formData.customFilters
      }

      const campaign = await DataService.createCampaign(campaignData)
      
      toast.success(`Campaign ${status === 'DRAFT' ? 'saved as draft' : 'scheduled'} successfully`)
      router.push('/admin/campaigns')
    } catch (error) {
      console.error('Campaign creation error:', error)
      toast.error('Failed to create campaign')
    } finally {
      setLoading(false)
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

  const messageTemplates = {
    WHATSAPP: [
      {
        name: 'Personal Loan Offer',
        content: 'Hi {name}, Get instant personal loan up to ₹5 lakhs at just 10.99% interest rate. Quick approval in 24 hours. Apply now: {link}'
      },
      {
        name: 'Business Loan Promo',
        content: 'Dear {name}, Grow your business with our business loan starting from ₹1 lakh. Minimal documentation required. Call us: {phone}'
      },
      {
        name: 'Home Loan Special',
        content: 'Hello {name}, Make your dream home a reality! Home loans at attractive rates starting from 8.5%. Get pre-approved today: {link}'
      }
    ],
    SMS: [
      {
        name: 'Quick Loan Alert',
        content: 'Hi {name}, Need quick cash? Get personal loan up to 5L in 24hrs. Low interest. Apply: {link} T&C apply'
      },
      {
        name: 'EMI Reminder',
        content: 'Dear {name}, Your EMI of Rs.{amount} is due on {date}. Pay now to avoid late charges. Pay: {link}'
      }
    ],
    EMAIL: [
      {
        name: 'Loan Application Follow-up',
        content: 'Dear {name},\n\nThank you for your interest in our loan products. We have received your application and our team will contact you within 24 hours.\n\nBest regards,\nQuickLoan Team'
      }
    ]
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.back()}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Create Campaign</h1>
              <p className="text-gray-600 mt-1">
                Create a new SMS, WhatsApp, or email marketing campaign
              </p>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
            >
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Basic Information</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Campaign Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Enter campaign name"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Campaign Type *
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {['WHATSAPP', 'SMS', 'EMAIL'].map((type) => {
                      const Icon = getTypeIcon(type)
                      return (
                        <button
                          key={type}
                          onClick={() => handleInputChange('type', type)}
                          className={`p-4 border-2 rounded-lg flex flex-col items-center space-y-2 transition-colors ${
                            formData.type === type
                              ? 'border-primary-500 bg-primary-50 text-primary-700'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <Icon className="w-6 h-6" />
                          <span className="text-sm font-medium">{type}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Schedule (Optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.scheduledAt}
                    onChange={(e) => handleInputChange('scheduledAt', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Leave empty to save as draft
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Message Content */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
            >
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Message Content</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Message *
                  </label>
                  <textarea
                    value={formData.message}
                    onChange={(e) => handleInputChange('message', e.target.value)}
                    placeholder="Enter your message content..."
                    rows={6}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Use {'{name}'}, {'{phone}'}, {'{amount}'} for personalization</span>
                    <span>{formData.message.length}/1000</span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Target Audience */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
            >
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Target Audience</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Audience Type
                  </label>
                  <select
                    value={formData.targetAudience}
                    onChange={(e) => handleInputChange('targetAudience', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="ALL">All Contacts</option>
                    <option value="LEADS">Active Leads Only</option>
                    <option value="CUSTOMERS">Existing Customers</option>
                    <option value="CUSTOM">Custom Filters</option>
                  </select>
                </div>

                {formData.targetAudience === 'CUSTOM' && (
                  <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Loan Type
                      </label>
                      <select
                        value={formData.customFilters.loanType}
                        onChange={(e) => handleCustomFilterChange('loanType', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      >
                        <option value="">All Types</option>
                        <option value="PERSONAL">Personal Loan</option>
                        <option value="BUSINESS">Business Loan</option>
                        <option value="HOME">Home Loan</option>
                        <option value="VEHICLE">Vehicle Loan</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Lead Status
                      </label>
                      <select
                        value={formData.customFilters.status}
                        onChange={(e) => handleCustomFilterChange('status', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      >
                        <option value="">All Status</option>
                        <option value="NEW">New</option>
                        <option value="CONTACTED">Contacted</option>
                        <option value="INTERESTED">Interested</option>
                        <option value="QUALIFIED">Qualified</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions</h3>
              
              <div className="space-y-3">
                <button
                  onClick={() => saveCampaign('DRAFT')}
                  disabled={loading}
                  className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save as Draft
                </button>
                
                <button
                  onClick={() => saveCampaign('SCHEDULED')}
                  disabled={loading || !formData.scheduledAt}
                  className="w-full flex items-center justify-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Schedule Campaign
                </button>
              </div>
            </motion.div>

            {/* Templates */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Message Templates</h3>
              
              <div className="space-y-3">
                {messageTemplates[formData.type]?.map((template, index) => (
                  <div
                    key={index}
                    className="p-3 border border-gray-200 rounded-lg hover:border-primary-300 cursor-pointer"
                    onClick={() => handleInputChange('message', template.content)}
                  >
                    <h4 className="text-sm font-medium text-gray-900 mb-1">
                      {template.name}
                    </h4>
                    <p className="text-xs text-gray-600 line-clamp-2">
                      {template.content}
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Preview */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Preview</h3>
              
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-2 mb-3">
                  {(() => {
                    const Icon = getTypeIcon(formData.type)
                    return <Icon className="w-4 h-4 text-gray-600" />
                  })()}
                  <span className="text-sm font-medium text-gray-600">{formData.type}</span>
                </div>
                
                <div className="bg-white p-3 rounded-lg border">
                  <p className="text-sm text-gray-900">
                    {formData.message || 'Your message will appear here...'}
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}

export default function CreateCampaignPage() {
  return (
    <RouteProtection requiredRole="ADMIN">
      <CreateCampaignContent />
    </RouteProtection>
  )
}