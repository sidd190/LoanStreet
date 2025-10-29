'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  MessageSquare,
  Phone,
  Mail,
  Search,
  Filter,
  Plus,
  Edit,
  Trash2,
  Eye,
  Copy,
  Tag,
  FileText,
  Image,
  Video,
  CheckCircle,
  X,
  AlertCircle
} from 'lucide-react'
import AdminLayout from '../../components/AdminLayout'
import toast from 'react-hot-toast'
import { MESSAGE_TEMPLATES, MessageTemplate, getTemplatesByCategory, getTemplatesByType, formatMessage } from '../../../../lib/messageTemplates'

export default function MessageTemplatesPage() {
  const [templates, setTemplates] = useState<MessageTemplate[]>(MESSAGE_TEMPLATES)
  const [filteredTemplates, setFilteredTemplates] = useState<MessageTemplate[]>(MESSAGE_TEMPLATES)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(null)
  const [previewParameters, setPreviewParameters] = useState<Record<string, string>>({})

  useEffect(() => {
    filterTemplates()
  }, [searchTerm, categoryFilter, typeFilter, templates])

  const filterTemplates = () => {
    let filtered = templates

    if (searchTerm) {
      filtered = filtered.filter(template => 
        template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.template.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (categoryFilter !== 'ALL') {
      filtered = filtered.filter(template => template.category === categoryFilter)
    }

    if (typeFilter !== 'ALL') {
      filtered = filtered.filter(template => template.type === typeFilter)
    }

    setFilteredTemplates(filtered)
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

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'MARKETING': return 'bg-orange-100 text-orange-800'
      case 'TRANSACTIONAL': return 'bg-blue-100 text-blue-800'
      case 'OTP': return 'bg-red-100 text-red-800'
      case 'NOTIFICATION': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const copyTemplate = (template: MessageTemplate) => {
    navigator.clipboard.writeText(template.template)
    toast.success('Template copied to clipboard')
  }

  const previewTemplate = (template: MessageTemplate) => {
    setSelectedTemplate(template)
    // Initialize preview parameters with sample values
    const sampleParams: Record<string, string> = {}
    template.parameters.forEach(param => {
      switch (param) {
        case 'name': sampleParams[param] = 'John Doe'
          break
        case 'amount': sampleParams[param] = '50000'
          break
        case 'rate': sampleParams[param] = '12.5'
          break
        case 'phone': sampleParams[param] = '+91 98765 43210'
          break
        case 'website': sampleParams[param] = 'www.example.com'
          break
        case 'otp': sampleParams[param] = '123456'
          break
        case 'validity': sampleParams[param] = '10'
          break
        case 'applicationId': sampleParams[param] = 'APP123456'
          break
        case 'timeframe': sampleParams[param] = '24 hours'
          break
        case 'documents': sampleParams[param] = 'PAN Card, Aadhar Card'
          break
        case 'dueDate': sampleParams[param] = '15th March 2024'
          break
        case 'paymentLink': sampleParams[param] = 'pay.example.com/123'
          break
        case 'transactionId': sampleParams[param] = 'TXN789012'
          break
        case 'balance': sampleParams[param] = '25000'
          break
        case 'executiveName': sampleParams[param] = 'Priya Sharma'
          break
        default: sampleParams[param] = `[${param}]`
      }
    })
    setPreviewParameters(sampleParams)
    setShowPreviewModal(true)
  }

  const handleParameterChange = (param: string, value: string) => {
    setPreviewParameters(prev => ({ ...prev, [param]: value }))
  }

  const getPreviewMessage = () => {
    if (!selectedTemplate) return ''
    const result = formatMessage(selectedTemplate.id, previewParameters)
    return result.success ? result.message || '' : 'Preview not available'
  }

  const stats = {
    total: templates.length,
    whatsapp: templates.filter(t => t.type === 'WHATSAPP').length,
    sms: templates.filter(t => t.type === 'SMS').length,
    marketing: templates.filter(t => t.category === 'MARKETING').length,
    transactional: templates.filter(t => t.category === 'TRANSACTIONAL').length
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Message Templates</h1>
            <p className="text-gray-600 mt-1">
              Manage and preview your message templates for campaigns
            </p>
          </div>
          <button className="btn-primary flex items-center">
            <Plus className="w-5 h-5 mr-2" />
            Create Template
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
          >
            <div className="flex items-center">
              <FileText className="w-8 h-8 text-blue-500 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Total Templates</p>
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
              <MessageSquare className="w-8 h-8 text-green-500 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">WhatsApp</p>
                <p className="text-2xl font-bold text-gray-900">{stats.whatsapp}</p>
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
              <Phone className="w-8 h-8 text-blue-500 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">SMS</p>
                <p className="text-2xl font-bold text-gray-900">{stats.sms}</p>
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
              <Tag className="w-8 h-8 text-orange-500 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Marketing</p>
                <p className="text-2xl font-bold text-gray-900">{stats.marketing}</p>
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
              <CheckCircle className="w-8 h-8 text-blue-500 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Transactional</p>
                <p className="text-2xl font-bold text-gray-900">{stats.transactional}</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
        >
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search templates by name, description, or content..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="flex gap-3">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="ALL">All Categories</option>
                <option value="MARKETING">Marketing</option>
                <option value="TRANSACTIONAL">Transactional</option>
                <option value="OTP">OTP</option>
                <option value="NOTIFICATION">Notification</option>
              </select>
              
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="ALL">All Types</option>
                <option value="WHATSAPP">WhatsApp</option>
                <option value="SMS">SMS</option>
              </select>
            </div>
          </div>
        </motion.div>

        {/* Templates Grid */}
        <div className="grid lg:grid-cols-2 gap-6">
          {filteredTemplates.map((template, index) => {
            const TypeIcon = getTypeIcon(template.type)
            
            return (
              <motion.div
                key={template.id}
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
                        {template.name}
                      </h3>
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(template.type)}`}>
                          {template.type}
                        </span>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getCategoryColor(template.category)}`}>
                          {template.category}
                        </span>
                        {template.mediaSupported && (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                            Media
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => previewTemplate(template)}
                      className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg"
                      title="Preview Template"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => copyTemplate(template)}
                      className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg"
                      title="Copy Template"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Description */}
                <p className="text-sm text-gray-600 mb-4">
                  {template.description}
                </p>

                {/* Template Preview */}
                <div className="bg-gray-50 rounded-lg p-3 mb-4">
                  <p className="text-sm text-gray-800 line-clamp-3">
                    {template.template}
                  </p>
                </div>

                {/* Parameters */}
                {template.parameters.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-medium text-gray-600 mb-2">
                      Parameters ({template.parameters.length})
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {template.parameters.map(param => (
                        <span
                          key={param}
                          className="inline-flex px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded"
                        >
                          {param}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Footer */}
                <div className="flex justify-between items-center text-xs text-gray-500 pt-4 border-t border-gray-100">
                  <div className="flex items-center space-x-4">
                    <span>ID: {template.id}</span>
                    {template.mediaSupported && (
                      <div className="flex items-center space-x-1">
                        <Image className="w-3 h-3" />
                        <Video className="w-3 h-3" />
                        <FileText className="w-3 h-3" />
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => previewTemplate(template)}
                    className="text-primary-600 hover:text-primary-700 font-medium"
                  >
                    Preview
                  </button>
                </div>
              </motion.div>
            )
          })}
        </div>

        {filteredTemplates.length === 0 && (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No templates found matching your criteria</p>
          </div>
        )}

        {/* Preview Modal */}
        {showPreviewModal && selectedTemplate && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-gray-900">
                    Preview: {selectedTemplate.name}
                  </h3>
                  <button
                    onClick={() => setShowPreviewModal(false)}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Template Info */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Type:</span>
                        <span className="ml-2 font-medium">{selectedTemplate.type}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Category:</span>
                        <span className="ml-2 font-medium">{selectedTemplate.category}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Media Support:</span>
                        <span className="ml-2 font-medium">
                          {selectedTemplate.mediaSupported ? 'Yes' : 'No'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Parameters:</span>
                        <span className="ml-2 font-medium">{selectedTemplate.parameters.length}</span>
                      </div>
                    </div>
                  </div>

                  {/* Parameters */}
                  {selectedTemplate.parameters.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3">Template Parameters</h4>
                      <div className="space-y-3">
                        {selectedTemplate.parameters.map(param => (
                          <div key={param}>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              {param}
                            </label>
                            <input
                              type="text"
                              value={previewParameters[param] || ''}
                              onChange={(e) => handleParameterChange(param, e.target.value)}
                              placeholder={`Enter ${param}`}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Preview */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Message Preview</h4>
                    <div className={`p-4 rounded-lg border-2 ${
                      selectedTemplate.type === 'WHATSAPP' 
                        ? 'border-green-200 bg-green-50' 
                        : selectedTemplate.type === 'SMS'
                        ? 'border-blue-200 bg-blue-50'
                        : 'border-purple-200 bg-purple-50'
                    }`}>
                      <div className="flex items-center space-x-2 mb-2">
                        {selectedTemplate.type === 'WHATSAPP' ? (
                          <MessageSquare className="w-4 h-4 text-green-600" />
                        ) : selectedTemplate.type === 'SMS' ? (
                          <Phone className="w-4 h-4 text-blue-600" />
                        ) : (
                          <Mail className="w-4 h-4 text-purple-600" />
                        )}
                        <span className="text-sm font-medium text-gray-700">
                          {selectedTemplate.type} Message
                        </span>
                      </div>
                      
                      <div className="text-sm text-gray-800 whitespace-pre-wrap">
                        {getPreviewMessage()}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200">
                    <button
                      onClick={() => setShowPreviewModal(false)}
                      className="px-4 py-2 text-gray-600 hover:text-gray-700"
                    >
                      Close
                    </button>
                    <button
                      onClick={() => copyTemplate(selectedTemplate)}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                    >
                      Copy Template
                    </button>
                    <button className="btn-primary">
                      Use Template
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}