'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { X, Send, MessageSquare, Phone, User, FileText, Image, Video, File } from 'lucide-react'
import toast from 'react-hot-toast'

interface WhatsAppTemplate {
  name: string
  content: string
  category: string
  status: string
  components?: {
    type: string
    text?: string
    parameters?: string[]
  }[]
}

interface WhatsAppTestModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function WhatsAppTestModal({ isOpen, onClose }: WhatsAppTestModalProps) {
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [templateParams, setTemplateParams] = useState<string[]>([''])
  const [mediaUrl, setMediaUrl] = useState('')
  const [mediaType, setMediaType] = useState<'image' | 'video' | 'document'>('image')
  const [messageType, setMessageType] = useState<'text' | 'template' | 'media'>('text')
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([])
  const [loading, setLoading] = useState(false)
  const [templatesLoading, setTemplatesLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadTemplates()
    }
  }, [isOpen])

  const loadTemplates = async () => {
    try {
      setTemplatesLoading(true)
      const response = await fetch('/api/whatsapp/templates', {
        credentials: 'include'
      })
      
      if (response.ok) {
        const data = await response.json()
        setTemplates(data.templates || [])
      } else {
        toast.error('Failed to load WhatsApp templates')
      }
    } catch (error) {
      toast.error('Failed to load templates')
    } finally {
      setTemplatesLoading(false)
    }
  }

  const handleSendTest = async () => {
    if (!phone.trim()) {
      toast.error('Please enter a phone number')
      return
    }

    if (messageType === 'text' && !message.trim()) {
      toast.error('Please enter a message')
      return
    }

    if (messageType === 'template' && !selectedTemplate) {
      toast.error('Please select a template')
      return
    }

    if (messageType === 'media' && (!selectedTemplate || !mediaUrl.trim())) {
      toast.error('Please select a template and provide media URL')
      return
    }

    try {
      setLoading(true)
      
      const payload: any = {
        phone: phone.trim(),
        messageType
      }

      if (messageType === 'text') {
        payload.message = message.trim()
      } else if (messageType === 'template') {
        payload.templateName = selectedTemplate
        payload.params = templateParams.filter(p => p.trim())
      } else if (messageType === 'media') {
        payload.templateName = selectedTemplate
        payload.params = templateParams.filter(p => p.trim())
        payload.mediaUrl = mediaUrl.trim()
        payload.mediaType = mediaType
      }

      const response = await fetch('/api/test/whatsapp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(payload)
      })

      const result = await response.json()

      if (result.success) {
        toast.success('WhatsApp message sent successfully!')
        // Reset form
        setPhone('')
        setMessage('')
        setSelectedTemplate('')
        setTemplateParams([''])
        setMediaUrl('')
      } else {
        toast.error(result.error || 'Failed to send message')
      }

    } catch (error) {
      toast.error('Failed to send test message')
    } finally {
      setLoading(false)
    }
  }

  const addTemplateParam = () => {
    setTemplateParams([...templateParams, ''])
  }

  const updateTemplateParam = (index: number, value: string) => {
    const newParams = [...templateParams]
    newParams[index] = value
    setTemplateParams(newParams)
  }

  const removeTemplateParam = (index: number) => {
    if (templateParams.length > 1) {
      const newParams = templateParams.filter((_, i) => i !== index)
      setTemplateParams(newParams)
    }
  }

  const selectedTemplateData = templates.find(t => t.name === selectedTemplate)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <MessageSquare className="w-6 h-6 text-green-600 mr-3" />
            <h2 className="text-xl font-semibold text-gray-900">Test WhatsApp Message</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Phone Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Phone className="w-4 h-4 inline mr-1" />
              Phone Number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Enter phone number (e.g., 9876543210)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              Enter 10-digit Indian mobile number without country code
            </p>
          </div>

          {/* Message Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Message Type</label>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="text"
                  checked={messageType === 'text'}
                  onChange={(e) => setMessageType(e.target.value as any)}
                  className="mr-2"
                />
                <MessageSquare className="w-4 h-4 mr-1" />
                Text Message
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="template"
                  checked={messageType === 'template'}
                  onChange={(e) => setMessageType(e.target.value as any)}
                  className="mr-2"
                />
                <FileText className="w-4 h-4 mr-1" />
                Template
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="media"
                  checked={messageType === 'media'}
                  onChange={(e) => setMessageType(e.target.value as any)}
                  className="mr-2"
                />
                <Image className="w-4 h-4 mr-1" />
                Media
              </label>
            </div>
          </div>

          {/* Text Message */}
          {messageType === 'text' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Enter your message..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          )}

          {/* Template Selection */}
          {(messageType === 'template' || messageType === 'media') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                WhatsApp Template
              </label>
              {templatesLoading ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600 mx-auto"></div>
                  <p className="text-sm text-gray-500 mt-2">Loading templates...</p>
                </div>
              ) : (
                <select
                  value={selectedTemplate}
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="">Select a template</option>
                  {templates.map((template) => (
                    <option key={template.name} value={template.name}>
                      {template.name} ({template.category})
                    </option>
                  ))}
                </select>
              )}

              {selectedTemplateData && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium text-gray-700">Template Preview:</p>
                  <p className="text-sm text-gray-600 mt-1">{selectedTemplateData.content}</p>
                  <div className="flex items-center mt-2 space-x-4">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      selectedTemplateData.status === 'APPROVED' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {selectedTemplateData.status}
                    </span>
                    <span className="text-xs text-gray-500">{selectedTemplateData.category}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Template Parameters */}
          {(messageType === 'template' || messageType === 'media') && selectedTemplate && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Template Parameters
              </label>
              {templateParams.map((param, index) => (
                <div key={index} className="flex items-center space-x-2 mb-2">
                  <input
                    type="text"
                    value={param}
                    onChange={(e) => updateTemplateParam(index, e.target.value)}
                    placeholder={`Parameter ${index + 1}`}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                  {templateParams.length > 1 && (
                    <button
                      onClick={() => removeTemplateParam(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={addTemplateParam}
                className="text-sm text-green-600 hover:text-green-700"
              >
                + Add Parameter
              </button>
            </div>
          )}

          {/* Media Options */}
          {messageType === 'media' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Media Type</label>
                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="image"
                      checked={mediaType === 'image'}
                      onChange={(e) => setMediaType(e.target.value as any)}
                      className="mr-2"
                    />
                    <Image className="w-4 h-4 mr-1" />
                    Image
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="video"
                      checked={mediaType === 'video'}
                      onChange={(e) => setMediaType(e.target.value as any)}
                      className="mr-2"
                    />
                    <Video className="w-4 h-4 mr-1" />
                    Video
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="document"
                      checked={mediaType === 'document'}
                      onChange={(e) => setMediaType(e.target.value as any)}
                      className="mr-2"
                    />
                    <File className="w-4 h-4 mr-1" />
                    Document
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Media URL</label>
                <input
                  type="url"
                  value={mediaUrl}
                  onChange={(e) => setMediaUrl(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Provide a public URL to your media file
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSendTest}
            disabled={loading}
            className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg transition-colors flex items-center"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            {loading ? 'Sending...' : 'Send Test Message'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}