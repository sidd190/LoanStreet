'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { 
  ArrowLeft,
  Save,
  Send,
  Calendar,
  MessageSquare,
  Phone,
  Eye,
  AlertCircle,
  CheckCircle,
  Loader
} from 'lucide-react'
import AdminLayout from '../../../components/AdminLayout'
import toast from 'react-hot-toast'
import { MESSAGE_TEMPLATES, getTemplatesByType, formatMessage, validateMessageLength } from '../../../../../lib/messageTemplates'
import DataService, { Campaign, Contact } from '../../../../../lib/dataService'

interface EditCampaignFormData {
  name: string
  type: 'SMS' | 'WHATSAPP'
  templateId: string
  customMessage: string
  useTemplate: boolean
  parameters: Record<string, string>
  mediaUrl?: string
  mediaType?: 'image' | 'video' | 'document'
  targetContacts: string[]
  scheduledAt?: string
  status: 'DRAFT' | 'SCHEDULED' | 'RUNNING' | 'COMPLETED' | 'PAUSED' | 'CANCELLED'
}

export default function EditCampaignPage() {
  const router = useRouter()
  const params = useParams()
  const campaignId = params.id as string
  
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [previewMessage, setPreviewMessage] = useState('')
  
  const [formData, setFormData] = useState<EditCampaignFormData>({
    name: '',
    type: 'WHATSAPP',
    templateId: '',
    customMessage: '',
    useTemplate: true,
    parameters: {},
    targetContacts: [],
    status: 'DRAFT'
  })

  useEffect(() => {
    loadCampaign()
    loadContacts()
  }, [campaignId])

  useEffect(() => {
    updatePreviewMessage()
  }, [formData.templateId, formData.customMessage, formData.parameters, formData.useTemplate])

  const loadCampaign = async () => {
    try {
      const data = await DataService.getCampaign(campaignId)
      if (!data) {
        toast.error('Campaign not found')
        router.push('/admin/campaigns')
        return
      }

      setCampaign(data)
      
      // Parse template parameters if they exist
      let parameters = {}
      try {
        if (data.message && MESSAGE_TEMPLATES.find(t => t.name === data.createdBy)) {
          // This is a simplified approach - in real implementation, 
          // you'd store template parameters separately
          parameters = {}
        }
      } catch (e) {
        // Ignore parsing errors
      }

      setFormData({
        name: data.name,
        type: data.type as 'SMS' | 'WHATSAPP',
        templateId: '', // Would need to be stored separately
        customMessage: data.message,
        useTemplate: false, // Default to custom message for existing campaigns
        parameters,
        targetContacts: [], // Would need to fetch from campaign_contacts table
        scheduledAt: data.scheduledAt,
        status: data.status
      })
    } catch (error) {
      toast.error('Failed to load campaign')
      router.push('/admin/campaigns')
    } finally {
      setLoading(false)
    }
  }

  const loadContacts = async () => {
    try {
      const data = await DataService.getContacts()
      setContacts(data.filter(contact => contact.status === 'ACTIVE'))
    } catch (error) {
      toast.error('Failed to load contacts')
    }
  }

  const updatePreviewMessage = () => {
    if (formData.useTemplate && formData.templateId) {
      const result = formatMessage(formData.templateId, formData.parameters)
      if (result.success) {
        setPreviewMessage(result.message || '')
      } else {
        setPreviewMessage('Preview not available - missing parameters')
      }
    } else {
      setPreviewMessage(formData.customMessage)
    }
  }

  const handleInputChange = (field: keyof EditCampaignFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleParameterChange = (param: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      parameters: { ...prev.parameters, [param]: value }
    }))
  }

  const handleContactSelection = (contactId: string, selected: boolean) => {
    setFormData(prev => ({
      ...prev,
      targetContacts: selected 
        ? [...prev.targetContacts, contactId]
        : prev.targetContacts.filter(id => id !== contactId)
    }))
  }

  const selectAllContacts = () => {
    setFormData(prev => ({
      ...prev,
      targetContacts: contacts.map(c => c.id)
    }))
  }

  const clearAllContacts = () => {
    setFormData(prev => ({
      ...prev,
      targetContacts: []
    }))
  }

  const canEdit = () => {
    return campaign?.status === 'DRAFT' || campaign?.status === 'SCHEDULED'
  }

  const saveCampaign = async (newStatus?: string) => {
    if (!canEdit() && !newStatus) {
      toast.error('Cannot edit campaign in current status')
      return
    }

    try {
      setSaving(true)
      
      const updateData = {
        name: formData.name,
        message: previewMessage,
        scheduledAt: formData.scheduledAt,
        status: (newStatus || formData.status) as 'DRAFT' | 'SCHEDULED' | 'RUNNING' | 'COMPLETED' | 'PAUSED' | 'CANCELLED',
        updatedAt: new Date().toISOString()
      }

      await DataService.updateCampaign(campaignId, updateData)
      
      toast.success('Campaign updated successfully')
      router.push('/admin/campaigns')
    } catch (error) {
      toast.error('Failed to update campaign')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      </AdminLayout>
    )
  }

  if (!campaign) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-500">Campaign not found</p>
        </div>
      </AdminLayout>
    )
  }

  const selectedTemplate = formData.templateId ? 
    MESSAGE_TEMPLATES.find(t => t.id === formData.templateId) : null

  const availableTemplates = getTemplatesByType(formData.type)
  const messageValidation = validateMessageLength(previewMessage, formData.type)

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.back()}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Edit Campaign</h1>
              <p className="text-gray-600 mt-1">
                Modify your campaign settings and content
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
              campaign.status === 'DRAFT' ? 'bg-gray-100 text-gray-800' :
              campaign.status === 'SCHEDULED' ? 'bg-blue-100 text-blue-800' :
              campaign.status === 'RUNNING' ? 'bg-green-100 text-green-800' :
              campaign.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' :
              campaign.status === 'PAUSED' ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }`}>
              {campaign.status}
            </span>
          </div>
        </div>

        {/* Status Warning */}
        {!canEdit() && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-yellow-600" />
              <p className="text-yellow-800">
                This campaign is {campaign.status.toLowerCase()} and cannot be edited. 
                You can only change its status.
              </p>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
              {/* Basic Info */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Campaign Information
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Campaign Name
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      disabled={!canEdit()}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Campaign Type
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      <div className={`p-4 border-2 rounded-lg flex items-center space-x-3 ${
                        formData.type === 'WHATSAPP'
                          ? 'border-green-500 bg-green-50 text-green-700'
                          : 'border-gray-200'
                      }`}>
                        <MessageSquare className="w-6 h-6" />
                        <div>
                          <p className="font-medium">WhatsApp</p>
                          <p className="text-sm text-gray-500">Rich media support</p>
                        </div>
                      </div>
                      <div className={`p-4 border-2 rounded-lg flex items-center space-x-3 ${
                        formData.type === 'SMS'
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200'
                      }`}>
                        <Phone className="w-6 h-6" />
                        <div>
                          <p className="font-medium">SMS</p>
                          <p className="text-sm text-gray-500">Text messages</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Message Content */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Message Content
                </h3>

                <div className="space-y-4">
                  {canEdit() && (
                    <div className="flex items-center space-x-4 mb-4">
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
                    </div>
                  )}

                  {formData.useTemplate && canEdit() ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Select Template
                        </label>
                        <select
                          value={formData.templateId}
                          onChange={(e) => handleInputChange('templateId', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        >
                          <option value="">Choose a template</option>
                          {availableTemplates.map(template => (
                            <option key={template.id} value={template.id}>
                              {template.name} - {template.category}
                            </option>
                          ))}
                        </select>
                      </div>

                      {selectedTemplate && selectedTemplate.parameters.length > 0 && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Template Parameters
                          </label>
                          <div className="space-y-3">
                            {selectedTemplate.parameters.map(param => (
                              <div key={param}>
                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                  {param}
                                </label>
                                <input
                                  type="text"
                                  value={formData.parameters[param] || ''}
                                  onChange={(e) => handleParameterChange(param, e.target.value)}
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
                        Message Content
                      </label>
                      <textarea
                        value={formData.customMessage}
                        onChange={(e) => handleInputChange('customMessage', e.target.value)}
                        disabled={!canEdit()}
                        rows={6}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                      />
                      <div className={`text-sm mt-1 ${
                        messageValidation.valid ? 'text-gray-500' : 'text-red-500'
                      }`}>
                        {messageValidation.length}/{messageValidation.maxLength} characters
                        {!messageValidation.valid && (
                          <span className="ml-2">⚠️ Message too long</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Scheduling */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Campaign Scheduling
                </h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Scheduled Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.scheduledAt || ''}
                    onChange={(e) => handleInputChange('scheduledAt', e.target.value)}
                    disabled={!canEdit()}
                    min={new Date().toISOString().slice(0, 16)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Leave empty for immediate sending
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => router.push('/admin/campaigns')}
                  className="px-4 py-2 text-gray-600 hover:text-gray-700"
                >
                  Cancel
                </button>

                <div className="flex items-center space-x-3">
                  {canEdit() && (
                    <button
                      type="button"
                      onClick={() => saveCampaign()}
                      disabled={saving}
                      className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                    >
                      <Save className="w-4 h-4 mr-2 inline" />
                      Save Changes
                    </button>
                  )}
                  
                  {campaign.status === 'DRAFT' && (
                    <button
                      type="button"
                      onClick={() => saveCampaign('SCHEDULED')}
                      disabled={saving || !formData.scheduledAt}
                      className="btn-primary disabled:opacity-50"
                    >
                      <Calendar className="w-4 h-4 mr-2" />
                      Schedule Campaign
                    </button>
                  )}
                  
                  {campaign.status === 'SCHEDULED' && (
                    <button
                      type="button"
                      onClick={() => saveCampaign('RUNNING')}
                      disabled={saving}
                      className="btn-primary disabled:opacity-50"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Start Campaign
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Preview Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sticky top-6">
              <div className="flex items-center space-x-2 mb-4">
                <Eye className="w-5 h-5 text-gray-600" />
                <h3 className="font-semibold text-gray-900">Message Preview</h3>
              </div>

              <div className="space-y-4">
                <div className={`p-4 rounded-lg border-2 ${
                  formData.type === 'WHATSAPP' 
                    ? 'border-green-200 bg-green-50' 
                    : 'border-blue-200 bg-blue-50'
                }`}>
                  <div className="flex items-center space-x-2 mb-2">
                    {formData.type === 'WHATSAPP' ? (
                      <MessageSquare className="w-4 h-4 text-green-600" />
                    ) : (
                      <Phone className="w-4 h-4 text-blue-600" />
                    )}
                    <span className="text-sm font-medium text-gray-700">
                      {formData.type} Message
                    </span>
                  </div>
                  
                  <div className="text-sm text-gray-800 whitespace-pre-wrap">
                    {previewMessage || 'Your message will appear here...'}
                  </div>
                </div>

                <div className="text-sm text-gray-600 space-y-2">
                  <div className="flex justify-between">
                    <span>Message Length:</span>
                    <span className={messageValidation.valid ? 'text-green-600' : 'text-red-600'}>
                      {messageValidation.length}/{messageValidation.maxLength}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Sent:</span>
                    <span className="font-medium">{campaign.totalSent}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Delivered:</span>
                    <span className="font-medium">{campaign.totalDelivered}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Replies:</span>
                    <span className="font-medium">{campaign.totalReplies}</span>
                  </div>
                  {formData.scheduledAt && (
                    <div className="flex justify-between">
                      <span>Scheduled:</span>
                      <span className="font-medium">
                        {new Date(formData.scheduledAt).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>

                {!messageValidation.valid && (
                  <div className="flex items-center space-x-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                    <AlertCircle className="w-4 h-4" />
                    <span>Message exceeds maximum length</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}