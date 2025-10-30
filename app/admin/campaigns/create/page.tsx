'use client'

import { useState, useEffect } from 'react'
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
  Settings,
  Search,
  Filter,
  CheckSquare,
  Square,
  Eye,
  Upload,
  X,
  Copy,
  Play
} from 'lucide-react'
import AdminLayout from '../../components/AdminLayout'
import toast from 'react-hot-toast'
import DataService, { Contact } from '../../../../lib/dataService'

function CreateCampaignContent() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([])
  const [contactsLoading, setContactsLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [showContactSelector, setShowContactSelector] = useState(false)
  const [previewMessage, setPreviewMessage] = useState('')
  const [estimatedReach, setEstimatedReach] = useState(0)
  
  const [formData, setFormData] = useState({
    name: '',
    type: 'WHATSAPP' as 'SMS' | 'WHATSAPP' | 'EMAIL',
    message: '',
    templateId: '',
    useTemplate: false,
    templateParams: {} as Record<string, string>,
    scheduledAt: '',
    targetAudience: 'ALL' as 'ALL' | 'LEADS' | 'CUSTOMERS' | 'CUSTOM',
    selectedContacts: [] as string[],
    customFilters: {
      loanType: '',
      minAmount: '',
      maxAmount: '',
      status: '',
      tags: [],
      source: '',
      lastContactDays: ''
    },
    mediaUrl: '',
    mediaType: '' as 'image' | 'video' | 'document' | ''
  })

  useEffect(() => {
    loadContacts()
  }, [])

  useEffect(() => {
    updateFilteredContacts()
  }, [contacts, formData.targetAudience, formData.customFilters, searchTerm])

  useEffect(() => {
    updatePreviewMessage()
  }, [formData.message, formData.templateId, formData.templateParams, formData.useTemplate])

  useEffect(() => {
    calculateEstimatedReach()
  }, [filteredContacts, formData.selectedContacts, formData.targetAudience])

  const loadContacts = async () => {
    try {
      setContactsLoading(true)
      const data = await DataService.getContacts()
      setContacts(data.filter(contact => contact.status === 'ACTIVE'))
    } catch (error) {
      toast.error('Failed to load contacts')
    } finally {
      setContactsLoading(false)
    }
  }

  const updateFilteredContacts = () => {
    let filtered = contacts

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(contact => 
        contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.phone.includes(searchTerm) ||
        contact.email?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Apply audience filter
    if (formData.targetAudience === 'LEADS') {
      // Filter contacts that have associated leads
      filtered = filtered.filter(contact => contact.tags.includes('lead'))
    } else if (formData.targetAudience === 'CUSTOMERS') {
      // Filter contacts that are existing customers
      filtered = filtered.filter(contact => contact.tags.includes('customer'))
    } else if (formData.targetAudience === 'CUSTOM') {
      // Apply custom filters
      if (formData.customFilters.source) {
        filtered = filtered.filter(contact => contact.source === formData.customFilters.source)
      }
      if (formData.customFilters.tags.length > 0) {
        filtered = filtered.filter(contact => 
          formData.customFilters.tags.some(tag => contact.tags.includes(tag))
        )
      }
      if (formData.customFilters.lastContactDays) {
        const daysAgo = new Date()
        daysAgo.setDate(daysAgo.getDate() - parseInt(formData.customFilters.lastContactDays))
        filtered = filtered.filter(contact => 
          !contact.lastContact || new Date(contact.lastContact) < daysAgo
        )
      }
    }

    setFilteredContacts(filtered)
  }

  const updatePreviewMessage = () => {
    if (formData.useTemplate && formData.templateId) {
      // Get template and apply parameters
      const template = messageTemplates[formData.type]?.find(t => t.name === formData.templateId)
      if (template) {
        let message = template.content
        Object.entries(formData.templateParams).forEach(([key, value]) => {
          message = message.replace(new RegExp(`{${key}}`, 'g'), value)
        })
        setPreviewMessage(message)
      }
    } else {
      setPreviewMessage(formData.message)
    }
  }

  const calculateEstimatedReach = () => {
    if (formData.targetAudience === 'CUSTOM' && formData.selectedContacts.length > 0) {
      setEstimatedReach(formData.selectedContacts.length)
    } else {
      setEstimatedReach(filteredContacts.length)
    }
  }

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

  const handleTemplateParamChange = (param: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      templateParams: {
        ...prev.templateParams,
        [param]: value
      }
    }))
  }

  const handleContactSelection = (contactId: string, selected: boolean) => {
    setFormData(prev => ({
      ...prev,
      selectedContacts: selected 
        ? [...prev.selectedContacts, contactId]
        : prev.selectedContacts.filter(id => id !== contactId)
    }))
  }

  const selectAllContacts = () => {
    setFormData(prev => ({
      ...prev,
      selectedContacts: filteredContacts.map(c => c.id)
    }))
  }

  const clearAllContacts = () => {
    setFormData(prev => ({
      ...prev,
      selectedContacts: []
    }))
  }

  const duplicateCampaign = async (campaignId: string) => {
    try {
      const campaign = await DataService.getCampaign(campaignId)
      if (campaign) {
        setFormData(prev => ({
          ...prev,
          name: `${campaign.name} (Copy)`,
          type: campaign.type as 'SMS' | 'WHATSAPP' | 'EMAIL',
          message: campaign.message,
          // Reset scheduling and targeting
          scheduledAt: '',
          targetAudience: 'ALL',
          selectedContacts: []
        }))
        toast.success('Campaign duplicated successfully')
      }
    } catch (error) {
      toast.error('Failed to duplicate campaign')
    }
  }

  const validateForm = () => {
    if (!formData.name.trim()) {
      toast.error('Campaign name is required')
      return false
    }
    
    const messageToValidate = formData.useTemplate ? previewMessage : formData.message
    if (!messageToValidate.trim()) {
      toast.error('Message content is required')
      return false
    }
    
    const maxLength = formData.type === 'SMS' ? 160 : 1000
    if (messageToValidate.length > maxLength) {
      toast.error(`Message content is too long (max ${maxLength} characters for ${formData.type})`)
      return false
    }

    if (formData.targetAudience === 'CUSTOM' && formData.selectedContacts.length === 0 && estimatedReach === 0) {
      toast.error('Please select at least one contact or adjust your filters')
      return false
    }

    if (formData.useTemplate && formData.templateId) {
      const template = messageTemplates[formData.type]?.find(t => t.name === formData.templateId)
      if (template) {
        // Check if all required parameters are filled
        const requiredParams = template.content.match(/{(\w+)}/g) || []
        for (const param of requiredParams) {
          const paramName = param.replace(/[{}]/g, '')
          if (!formData.templateParams[paramName]) {
            toast.error(`Please fill in the ${paramName} parameter`)
            return false
          }
        }
      }
    }
    
    return true
  }

  const saveCampaign = async (status: 'DRAFT' | 'SCHEDULED') => {
    if (!validateForm()) return

    try {
      setLoading(true)
      
      const finalMessage = formData.useTemplate ? previewMessage : formData.message
      
      const campaignData = {
        name: formData.name,
        type: formData.type,
        message: finalMessage,
        templateName: formData.useTemplate ? formData.templateId : undefined,
        parameters: formData.useTemplate ? formData.templateParams : undefined,
        mediaUrl: formData.mediaUrl || undefined,
        mediaType: formData.mediaType || undefined,
        status,
        scheduledAt: formData.scheduledAt || undefined,
        totalContacts: estimatedReach,
        totalSent: 0,
        totalDelivered: 0,
        totalReplies: 0,
        totalFailed: 0,
        createdBy: 'Current User', // Will be set by API
        targetAudience: formData.targetAudience,
        customFilters: formData.customFilters,
        selectedContacts: formData.targetAudience === 'CUSTOM' ? formData.selectedContacts : undefined
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

  const executeImmediately = async () => {
    if (!validateForm()) return

    try {
      setLoading(true)
      
      const finalMessage = formData.useTemplate ? previewMessage : formData.message
      
      const campaignData = {
        name: formData.name,
        type: formData.type,
        message: finalMessage,
        templateName: formData.useTemplate ? formData.templateId : undefined,
        parameters: formData.useTemplate ? formData.templateParams : undefined,
        mediaUrl: formData.mediaUrl || undefined,
        mediaType: formData.mediaType || undefined,
        status: 'RUNNING' as const,
        scheduledAt: new Date().toISOString(),
        totalContacts: estimatedReach,
        totalSent: 0,
        totalDelivered: 0,
        totalReplies: 0,
        totalFailed: 0,
        createdBy: 'Current User',
        targetAudience: formData.targetAudience,
        customFilters: formData.customFilters,
        selectedContacts: formData.targetAudience === 'CUSTOM' ? formData.selectedContacts : undefined
      }

      const campaign = await DataService.createCampaign(campaignData)
      
      // Execute the campaign immediately
      const response = await fetch(`/api/campaigns/${campaign.id}/execute`, {
        method: 'POST',
        credentials: 'include'
      })
      
      if (response.ok) {
        toast.success('Campaign created and executed successfully')
      } else {
        toast.success('Campaign created successfully, but execution failed')
      }
      
      router.push('/admin/campaigns')
    } catch (error) {
      console.error('Campaign execution error:', error)
      toast.error('Failed to create and execute campaign')
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
        category: 'Promotional',
        content: 'Hi {name}, Get instant personal loan up to ₹{amount} at just {rate}% interest rate. Quick approval in 24 hours. Apply now: {link}',
        params: ['name', 'amount', 'rate', 'link']
      },
      {
        name: 'Business Loan Promo',
        category: 'Promotional', 
        content: 'Dear {name}, Grow your business with our business loan starting from ₹1 lakh. Minimal documentation required. Call us: {phone}',
        params: ['name', 'phone']
      },
      {
        name: 'Home Loan Special',
        category: 'Promotional',
        content: 'Hello {name}, Make your dream home a reality! Home loans at attractive rates starting from {rate}%. Get pre-approved today: {link}',
        params: ['name', 'rate', 'link']
      },
      {
        name: 'Follow-up Message',
        category: 'Follow-up',
        content: 'Hi {name}, Thank you for your interest in our {loanType} loan. Our executive will call you within 2 hours. For urgent queries, call {phone}',
        params: ['name', 'loanType', 'phone']
      },
      {
        name: 'Document Request',
        category: 'Operational',
        content: 'Dear {name}, To process your loan application, please submit: {documents}. Upload at {link} or visit our branch.',
        params: ['name', 'documents', 'link']
      }
    ],
    SMS: [
      {
        name: 'Quick Loan Alert',
        category: 'Promotional',
        content: 'Hi {name}, Need quick cash? Get personal loan up to {amount}L in 24hrs. Low interest. Apply: {link} T&C apply',
        params: ['name', 'amount', 'link']
      },
      {
        name: 'EMI Reminder',
        category: 'Operational',
        content: 'Dear {name}, Your EMI of Rs.{amount} is due on {date}. Pay now to avoid late charges. Pay: {link}',
        params: ['name', 'amount', 'date', 'link']
      },
      {
        name: 'Application Status',
        category: 'Informational',
        content: '{name}, your loan application {appId} is {status}. Next step: {nextStep}. Call {phone} for queries.',
        params: ['name', 'appId', 'status', 'nextStep', 'phone']
      },
      {
        name: 'Approval Notification',
        category: 'Informational',
        content: 'Congratulations {name}! Your {loanType} loan of Rs.{amount} is approved. Visit branch with ID proof to complete formalities.',
        params: ['name', 'loanType', 'amount']
      }
    ],
    EMAIL: [
      {
        name: 'Loan Application Follow-up',
        category: 'Follow-up',
        content: 'Dear {name},\n\nThank you for your interest in our {loanType} loan products. We have received your application and our team will contact you within 24 hours.\n\nApplication ID: {appId}\nLoan Amount: ₹{amount}\n\nBest regards,\nQuickLoan Team',
        params: ['name', 'loanType', 'appId', 'amount']
      },
      {
        name: 'Welcome Email',
        category: 'Onboarding',
        content: 'Welcome to QuickLoan, {name}!\n\nWe are excited to help you with your financial needs. Our loan products include:\n- Personal Loans\n- Business Loans\n- Home Loans\n\nFor any queries, contact us at {phone} or email {email}.\n\nBest regards,\nQuickLoan Team',
        params: ['name', 'phone', 'email']
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
                    min={new Date().toISOString().slice(0, 16)}
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
                {/* Template Toggle */}
                <div className="flex items-center space-x-4 mb-4">
                  <button
                    type="button"
                    onClick={() => handleInputChange('useTemplate', false)}
                    className={`px-4 py-2 rounded-lg font-medium ${
                      !formData.useTemplate
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Custom Message
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInputChange('useTemplate', true)}
                    className={`px-4 py-2 rounded-lg font-medium ${
                      formData.useTemplate
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Use Template
                  </button>
                </div>

                {formData.useTemplate ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select Template *
                      </label>
                      <select
                        value={formData.templateId}
                        onChange={(e) => handleInputChange('templateId', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      >
                        <option value="">Choose a template</option>
                        {messageTemplates[formData.type]?.map((template, index) => (
                          <option key={index} value={template.name}>
                            {template.name} - {template.category}
                          </option>
                        ))}
                      </select>
                    </div>

                    {formData.templateId && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Template Parameters
                        </label>
                        <div className="space-y-3">
                          {messageTemplates[formData.type]?.find(t => t.name === formData.templateId)?.params.map(param => (
                            <div key={param}>
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                {param}
                              </label>
                              <input
                                type="text"
                                value={formData.templateParams[param] || ''}
                                onChange={(e) => handleTemplateParamChange(param, e.target.value)}
                                placeholder={`Enter ${param}`}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
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
                      <span className={formData.message.length > (formData.type === 'SMS' ? 160 : 1000) ? 'text-red-500' : ''}>
                        {formData.message.length}/{formData.type === 'SMS' ? 160 : 1000}
                      </span>
                    </div>
                  </div>
                )}

                {/* Media Upload for WhatsApp */}
                {formData.type === 'WHATSAPP' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Media (Optional)
                    </label>
                    <div className="grid grid-cols-3 gap-3 mb-3">
                      {['image', 'video', 'document'].map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => handleInputChange('mediaType', type)}
                          className={`p-3 border-2 rounded-lg text-sm font-medium ${
                            formData.mediaType === type
                              ? 'border-primary-500 bg-primary-50 text-primary-700'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </button>
                      ))}
                    </div>
                    {formData.mediaType && (
                      <input
                        type="url"
                        value={formData.mediaUrl}
                        onChange={(e) => handleInputChange('mediaUrl', e.target.value)}
                        placeholder={`Enter ${formData.mediaType} URL`}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    )}
                  </div>
                )}
              </div>
            </motion.div>

            {/* Target Audience */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Target Audience</h2>
                <div className="text-sm text-gray-600">
                  Estimated Reach: <span className="font-semibold text-primary-600">{estimatedReach.toLocaleString()}</span> contacts
                </div>
              </div>
              
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
                    <option value="ALL">All Contacts ({contacts.length})</option>
                    <option value="LEADS">Active Leads Only</option>
                    <option value="CUSTOMERS">Existing Customers</option>
                    <option value="CUSTOM">Custom Selection</option>
                  </select>
                </div>

                {formData.targetAudience === 'CUSTOM' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Source
                        </label>
                        <select
                          value={formData.customFilters.source}
                          onChange={(e) => handleCustomFilterChange('source', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        >
                          <option value="">All Sources</option>
                          <option value="website">Website</option>
                          <option value="referral">Referral</option>
                          <option value="campaign">Campaign</option>
                          <option value="social_media">Social Media</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Last Contact (Days Ago)
                        </label>
                        <select
                          value={formData.customFilters.lastContactDays}
                          onChange={(e) => handleCustomFilterChange('lastContactDays', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        >
                          <option value="">Any Time</option>
                          <option value="7">More than 7 days</option>
                          <option value="30">More than 30 days</option>
                          <option value="90">More than 90 days</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setShowContactSelector(!showContactSelector)}
                        className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                      >
                        <Users className="w-4 h-4 mr-2" />
                        Select Contacts ({formData.selectedContacts.length})
                      </button>
                      
                      {formData.selectedContacts.length > 0 && (
                        <button
                          type="button"
                          onClick={clearAllContacts}
                          className="text-sm text-red-600 hover:text-red-700"
                        >
                          Clear Selection
                        </button>
                      )}
                    </div>

                    {showContactSelector && (
                      <div className="border border-gray-200 rounded-lg p-4 max-h-96 overflow-y-auto">
                        <div className="flex items-center justify-between mb-4">
                          <div className="relative flex-1 mr-4">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input
                              type="text"
                              placeholder="Search contacts..."
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm"
                            />
                          </div>
                          <div className="flex space-x-2">
                            <button
                              type="button"
                              onClick={selectAllContacts}
                              className="text-sm text-primary-600 hover:text-primary-700"
                            >
                              Select All
                            </button>
                            <button
                              type="button"
                              onClick={clearAllContacts}
                              className="text-sm text-gray-600 hover:text-gray-700"
                            >
                              Clear All
                            </button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          {filteredContacts.slice(0, 100).map(contact => (
                            <div
                              key={contact.id}
                              className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg"
                            >
                              <button
                                type="button"
                                onClick={() => handleContactSelection(contact.id, !formData.selectedContacts.includes(contact.id))}
                                className="text-primary-600"
                              >
                                {formData.selectedContacts.includes(contact.id) ? (
                                  <CheckSquare className="w-4 h-4" />
                                ) : (
                                  <Square className="w-4 h-4" />
                                )}
                              </button>
                              <div className="flex-1">
                                <div className="text-sm font-medium text-gray-900">{contact.name}</div>
                                <div className="text-xs text-gray-500">{contact.phone}</div>
                              </div>
                              <div className="text-xs text-gray-400">
                                {contact.source}
                              </div>
                            </div>
                          ))}
                          {filteredContacts.length > 100 && (
                            <div className="text-sm text-gray-500 text-center py-2">
                              Showing first 100 contacts. Use filters to narrow down.
                            </div>
                          )}
                        </div>
                      </div>
                    )}
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
                  className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Schedule Campaign
                </button>

                <button
                  onClick={executeImmediately}
                  disabled={loading}
                  className="w-full flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Send Now
                </button>
              </div>
            </motion.div>

            {/* Campaign Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Campaign Overview</h3>
              
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Estimated Reach:</span>
                  <span className="font-semibold text-primary-600">{estimatedReach.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Message Type:</span>
                  <span className="font-semibold">{formData.type}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Character Count:</span>
                  <span className={`font-semibold ${
                    (formData.useTemplate ? previewMessage : formData.message).length > (formData.type === 'SMS' ? 160 : 1000) 
                      ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {(formData.useTemplate ? previewMessage : formData.message).length}/{formData.type === 'SMS' ? 160 : 1000}
                  </span>
                </div>
                {formData.scheduledAt && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Scheduled:</span>
                    <span className="font-semibold">{new Date(formData.scheduledAt).toLocaleDateString()}</span>
                  </div>
                )}
                {formData.mediaUrl && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Media:</span>
                    <span className="font-semibold capitalize">{formData.mediaType}</span>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Templates */}
            {!formData.useTemplate && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
              >
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Templates</h3>
                
                <div className="space-y-3">
                  {messageTemplates[formData.type]?.slice(0, 3).map((template, index) => (
                    <div
                      key={index}
                      className="p-3 border border-gray-200 rounded-lg hover:border-primary-300 cursor-pointer transition-colors"
                      onClick={() => {
                        handleInputChange('message', template.content)
                        toast.success('Template applied')
                      }}
                    >
                      <h4 className="text-sm font-medium text-gray-900 mb-1">
                        {template.name}
                      </h4>
                      <p className="text-xs text-gray-600 line-clamp-2">
                        {template.content}
                      </p>
                      <div className="text-xs text-primary-600 mt-1">
                        {template.category}
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={() => handleInputChange('useTemplate', true)}
                    className="w-full text-sm text-primary-600 hover:text-primary-700 py-2"
                  >
                    View All Templates →
                  </button>
                </div>
              </motion.div>
            )}

            {/* Preview */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
            >
              <div className="flex items-center space-x-2 mb-4">
                <Eye className="w-5 h-5 text-gray-600" />
                <h3 className="text-lg font-semibold text-gray-900">Message Preview</h3>
              </div>
              
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-2 mb-3">
                  {(() => {
                    const Icon = getTypeIcon(formData.type)
                    return <Icon className="w-4 h-4 text-gray-600" />
                  })()}
                  <span className="text-sm font-medium text-gray-600">{formData.type} Message</span>
                </div>
                
                <div className="bg-white p-3 rounded-lg border">
                  <p className="text-sm text-gray-900 whitespace-pre-wrap">
                    {(formData.useTemplate ? previewMessage : formData.message) || 'Your message will appear here...'}
                  </p>
                  {formData.mediaUrl && (
                    <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-600">
                      📎 {formData.mediaType}: {formData.mediaUrl}
                    </div>
                  )}
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