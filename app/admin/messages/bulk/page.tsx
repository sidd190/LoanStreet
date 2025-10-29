'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Send,
  Users,
  MessageSquare,
  Phone,
  Search,
  Filter,
  Eye,
  CheckCircle,
  AlertCircle,
  Loader,
  X,
  FileText,
  Image,
  Video
} from 'lucide-react'
import AdminLayout from '../../components/AdminLayout'
import toast from 'react-hot-toast'
import { MESSAGE_TEMPLATES, getTemplatesByType, formatMessage, validateMessageLength } from '../../../../lib/messageTemplates'
import DataService, { Contact } from '../../../../lib/dataService'

interface BulkMessageForm {
  type: 'SMS' | 'WHATSAPP'
  useTemplate: boolean
  templateId: string
  customMessage: string
  parameters: Record<string, string>
  mediaUrl?: string
  mediaType?: 'image' | 'video' | 'document'
  targetContacts: string[]
}

export default function BulkMessagingPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [tagFilter, setTagFilter] = useState('ALL')
  const [previewMessage, setPreviewMessage] = useState('')
  
  const [formData, setFormData] = useState<BulkMessageForm>({
    type: 'WHATSAPP',
    useTemplate: true,
    templateId: '',
    customMessage: '',
    parameters: {},
    targetContacts: []
  })

  useEffect(() => {
    loadContacts()
  }, [])

  useEffect(() => {
    filterContacts()
  }, [contacts, searchTerm, tagFilter])

  useEffect(() => {
    updatePreviewMessage()
  }, [formData.templateId, formData.customMessage, formData.parameters, formData.useTemplate])

  const loadContacts = async () => {
    try {
      setLoading(true)
      const data = await DataService.getContacts()
      setContacts(data.filter(contact => contact.status === 'ACTIVE'))
    } catch (error) {
      toast.error('Failed to load contacts')
    } finally {
      setLoading(false)
    }
  }

  const filterContacts = () => {
    let filtered = contacts

    if (searchTerm) {
      filtered = filtered.filter(contact => 
        contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.phone.includes(searchTerm) ||
        (contact.email && contact.email.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    if (tagFilter !== 'ALL') {
      filtered = filtered.filter(contact => 
        contact.tags.includes(tagFilter)
      )
    }

    setFilteredContacts(filtered)
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

  const handleInputChange = (field: keyof BulkMessageForm, value: any) => {
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
      targetContacts: filteredContacts.map(c => c.id)
    }))
  }

  const clearAllContacts = () => {
    setFormData(prev => ({
      ...prev,
      targetContacts: []
    }))
  }

  const sendBulkMessage = async () => {
    if (formData.targetContacts.length === 0) {
      toast.error('Please select at least one contact')
      return
    }

    if (!previewMessage.trim()) {
      toast.error('Please enter a message')
      return
    }

    const messageValidation = validateMessageLength(previewMessage, formData.type)
    if (!messageValidation.valid) {
      toast.error(messageValidation.error || 'Message validation failed')
      return
    }

    try {
      setSending(true)

      const selectedContactsData = contacts.filter(c => 
        formData.targetContacts.includes(c.id)
      ).map(c => ({
        id: c.id,
        phone: c.phone,
        name: c.name
      }))

      const payload = {
        contacts: selectedContactsData,
        message: previewMessage,
        type: formData.type,
        templateId: formData.useTemplate ? formData.templateId : undefined,
        parameters: formData.useTemplate ? formData.parameters : undefined,
        mediaUrl: formData.mediaUrl,
        mediaType: formData.mediaType
      }

      const response = await fetch('/api/messages/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      })

      const result = await response.json()

      if (result.success) {
        toast.success(`Successfully sent ${result.successCount} messages`)
        // Reset form
        setFormData(prev => ({
          ...prev,
          targetContacts: [],
          customMessage: '',
          parameters: {}
        }))
      } else {
        toast.error(`Sent ${result.successCount} messages, ${result.failureCount} failed`)
      }
    } catch (error) {
      toast.error('Failed to send bulk messages')
    } finally {
      setSending(false)
    }
  }

  const selectedTemplate = formData.templateId ? 
    MESSAGE_TEMPLATES.find(t => t.id === formData.templateId) : null

  const availableTemplates = getTemplatesByType(formData.type)
  const messageValidation = validateMessageLength(previewMessage, formData.type)

  // Get unique tags for filter
  const allTags = Array.from(new Set(contacts.flatMap(c => c.tags)))

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Bulk Messaging</h1>
            <p className="text-gray-600 mt-1">
              Send messages to multiple contacts at once
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Message Composition */}
          <div className="lg:col-span-2 space-y-6">
            {/* Message Type */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Message Type
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => handleInputChange('type', 'WHATSAPP')}
                  className={`p-4 border-2 rounded-lg flex items-center space-x-3 transition-all ${
                    formData.type === 'WHATSAPP'
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <MessageSquare className="w-6 h-6" />
                  <div className="text-left">
                    <p className="font-medium">WhatsApp</p>
                    <p className="text-sm text-gray-500">Rich media support</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => handleInputChange('type', 'SMS')}
                  className={`p-4 border-2 rounded-lg flex items-center space-x-3 transition-all ${
                    formData.type === 'SMS'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Phone className="w-6 h-6" />
                  <div className="text-left">
                    <p className="font-medium">SMS</p>
                    <p className="text-sm text-gray-500">Text messages</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Message Content */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Message Content
              </h3>

              <div className="space-y-4">
                <div className="flex items-center space-x-4">
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

                {formData.useTemplate ? (
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

                    {selectedTemplate?.mediaSupported && formData.type === 'WHATSAPP' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Media Attachment (Optional)
                        </label>
                        <div className="space-y-3">
                          <select
                            value={formData.mediaType || ''}
                            onChange={(e) => handleInputChange('mediaType', e.target.value || undefined)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          >
                            <option value="">No media</option>
                            <option value="image">Image</option>
                            <option value="video">Video</option>
                            <option value="document">Document</option>
                          </select>
                          {formData.mediaType && (
                            <input
                              type="url"
                              value={formData.mediaUrl || ''}
                              onChange={(e) => handleInputChange('mediaUrl', e.target.value)}
                              placeholder="Enter media URL"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            />
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Custom Message
                    </label>
                    <textarea
                      value={formData.customMessage}
                      onChange={(e) => handleInputChange('customMessage', e.target.value)}
                      placeholder="Enter your custom message"
                      rows={6}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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

            {/* Contact Selection */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Select Recipients
                </h3>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={selectAllContacts}
                    className="text-sm text-primary-600 hover:text-primary-700"
                  >
                    Select All
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    type="button"
                    onClick={clearAllContacts}
                    className="text-sm text-gray-600 hover:text-gray-700"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              {/* Contact Filters */}
              <div className="flex flex-col md:flex-row gap-4 mb-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      placeholder="Search contacts..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                </div>
                
                <select
                  value={tagFilter}
                  onChange={(e) => setTagFilter(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="ALL">All Tags</option>
                  {allTags.map(tag => (
                    <option key={tag} value={tag}>{tag}</option>
                  ))}
                </select>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <span>Total Contacts: {filteredContacts.length}</span>
                  <span>Selected: {formData.targetContacts.length}</span>
                </div>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader className="w-6 h-6 animate-spin text-primary-600" />
                </div>
              ) : (
                <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
                  {filteredContacts.map(contact => (
                    <div
                      key={contact.id}
                      className="flex items-center justify-between p-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50"
                    >
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={formData.targetContacts.includes(contact.id)}
                          onChange={(e) => handleContactSelection(contact.id, e.target.checked)}
                          className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                        />
                        <div>
                          <p className="font-medium text-gray-900">{contact.name}</p>
                          <p className="text-sm text-gray-500">{contact.phone}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center space-x-2">
                          {contact.tags.map(tag => (
                            <span
                              key={tag}
                              className="inline-flex px-2 py-1 text-xs font-semibold bg-gray-100 text-gray-800 rounded-full"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Response Rate: {contact.responseRate}%
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Send Button */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Ready to send to {formData.targetContacts.length} contacts
                </div>
                <button
                  onClick={sendBulkMessage}
                  disabled={sending || formData.targetContacts.length === 0 || !previewMessage.trim() || !messageValidation.valid}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {sending ? (
                    <>
                      <Loader className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Send Messages
                    </>
                  )}
                </button>
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

                  {formData.mediaUrl && formData.mediaType && (
                    <div className="mt-3 p-2 bg-white rounded border">
                      <div className="flex items-center space-x-2 text-xs text-gray-600">
                        {formData.mediaType === 'image' && <Image className="w-4 h-4" />}
                        {formData.mediaType === 'video' && <Video className="w-4 h-4" />}
                        {formData.mediaType === 'document' && <FileText className="w-4 h-4" />}
                        <span>Media attachment</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="text-sm text-gray-600 space-y-2">
                  <div className="flex justify-between">
                    <span>Message Length:</span>
                    <span className={messageValidation.valid ? 'text-green-600' : 'text-red-600'}>
                      {messageValidation.length}/{messageValidation.maxLength}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Recipients:</span>
                    <span className="font-medium">{formData.targetContacts.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Message Type:</span>
                    <span className="font-medium">{formData.type}</span>
                  </div>
                  {formData.useTemplate && selectedTemplate && (
                    <div className="flex justify-between">
                      <span>Template:</span>
                      <span className="font-medium text-xs">{selectedTemplate.name}</span>
                    </div>
                  )}
                </div>

                {!messageValidation.valid && (
                  <div className="flex items-center space-x-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                    <AlertCircle className="w-4 h-4" />
                    <span>Message exceeds maximum length</span>
                  </div>
                )}

                {formData.targetContacts.length === 0 && (
                  <div className="flex items-center space-x-2 text-sm text-yellow-600 bg-yellow-50 p-3 rounded-lg">
                    <AlertCircle className="w-4 h-4" />
                    <span>No recipients selected</span>
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