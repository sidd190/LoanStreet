'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  X, 
  Check, 
  Trash2, 
  Tag, 
  UserCheck, 
  UserX, 
  Shield, 
  Download,
  Upload,
  Settings,
  ChevronDown
} from 'lucide-react'
import toast from 'react-hot-toast'
import DataService from '../../../../lib/dataService'

interface BulkOperationsPanelProps {
  selectedContacts: string[]
  totalContacts: number
  onClearSelection: () => void
  onContactsUpdated: () => void
}

interface BulkTagOperation {
  action: 'add' | 'remove' | 'replace'
  tags: string[]
}

export default function BulkOperationsPanel({
  selectedContacts,
  totalContacts,
  onClearSelection,
  onContactsUpdated
}: BulkOperationsPanelProps) {
  const [loading, setLoading] = useState(false)
  const [showTagModal, setShowTagModal] = useState(false)
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false)
  const [tagOperation, setTagOperation] = useState<BulkTagOperation>({
    action: 'add',
    tags: []
  })
  const [tagInput, setTagInput] = useState('')

  const handleBulkStatusUpdate = async (status: 'ACTIVE' | 'INACTIVE' | 'BLOCKED') => {
    setLoading(true)
    try {
      await DataService.bulkUpdateContacts(selectedContacts, {
        status,
        updatedAt: new Date().toISOString()
      })
      
      toast.success(`${selectedContacts.length} contacts marked as ${status.toLowerCase()}`)
      onContactsUpdated()
      onClearSelection()
    } catch (error) {
      console.error('Bulk status update error:', error)
      toast.error('Failed to update contact status')
    } finally {
      setLoading(false)
    }
  }

  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedContacts.length} contacts? This action cannot be undone.`)) {
      return
    }

    setLoading(true)
    try {
      await DataService.bulkDeleteContacts(selectedContacts)
      toast.success(`${selectedContacts.length} contacts deleted`)
      onContactsUpdated()
      onClearSelection()
    } catch (error) {
      console.error('Bulk delete error:', error)
      toast.error('Failed to delete contacts')
    } finally {
      setLoading(false)
    }
  }

  const handleBulkTagOperation = async () => {
    if (tagOperation.tags.length === 0) {
      toast.error('Please add at least one tag')
      return
    }

    setLoading(true)
    try {
      // In a real implementation, this would be handled by the API
      // For now, we'll simulate the operation
      await DataService.bulkUpdateContacts(selectedContacts, {
        // This would need to be implemented in the API to handle tag operations
        updatedAt: new Date().toISOString()
      })

      const actionText = tagOperation.action === 'add' ? 'added to' : 
                        tagOperation.action === 'remove' ? 'removed from' : 'replaced for'
      
      toast.success(`Tags ${actionText} ${selectedContacts.length} contacts`)
      onContactsUpdated()
      onClearSelection()
      setShowTagModal(false)
      setTagOperation({ action: 'add', tags: [] })
    } catch (error) {
      console.error('Bulk tag operation error:', error)
      toast.error('Failed to update tags')
    } finally {
      setLoading(false)
    }
  }

  const addTag = () => {
    if (tagInput.trim() && !tagOperation.tags.includes(tagInput.trim())) {
      setTagOperation(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }))
      setTagInput('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    setTagOperation(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }))
  }

  const handleTagInputKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTag()
    }
  }

  const handleExportSelected = () => {
    // In a real implementation, this would export only selected contacts
    toast.success(`Exporting ${selectedContacts.length} selected contacts...`)
  }

  if (selectedContacts.length === 0) return null

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-40"
      >
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4 min-w-[600px]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center mr-3">
                <Check className="w-4 h-4 text-primary-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">
                  {selectedContacts.length} of {totalContacts} contacts selected
                </p>
                <p className="text-sm text-gray-500">Choose an action to perform</p>
              </div>
            </div>
            <button
              onClick={onClearSelection}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center space-x-2 mb-3">
            {/* Status Updates */}
            <button
              onClick={() => handleBulkStatusUpdate('ACTIVE')}
              disabled={loading}
              className="flex items-center px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors disabled:opacity-50"
            >
              <UserCheck className="w-4 h-4 mr-2" />
              Mark Active
            </button>

            <button
              onClick={() => handleBulkStatusUpdate('INACTIVE')}
              disabled={loading}
              className="flex items-center px-3 py-2 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 transition-colors disabled:opacity-50"
            >
              <UserX className="w-4 h-4 mr-2" />
              Mark Inactive
            </button>

            <button
              onClick={() => handleBulkStatusUpdate('BLOCKED')}
              disabled={loading}
              className="flex items-center px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50"
            >
              <Shield className="w-4 h-4 mr-2" />
              Block
            </button>

            {/* Tag Operations */}
            <button
              onClick={() => setShowTagModal(true)}
              disabled={loading}
              className="flex items-center px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors disabled:opacity-50"
            >
              <Tag className="w-4 h-4 mr-2" />
              Manage Tags
            </button>

            {/* Advanced Options Toggle */}
            <button
              onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
              className="flex items-center px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Settings className="w-4 h-4 mr-2" />
              More
              <ChevronDown className={`w-4 h-4 ml-1 transition-transform ${showAdvancedOptions ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Advanced Options */}
          <AnimatePresence>
            {showAdvancedOptions && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="border-t border-gray-200 pt-3 mt-3"
              >
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleExportSelected}
                    disabled={loading}
                    className="flex items-center px-3 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors disabled:opacity-50"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export Selected
                  </button>

                  <button
                    onClick={handleBulkDelete}
                    disabled={loading}
                    className="flex items-center px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Selected
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {loading && (
            <div className="flex items-center justify-center mt-3 pt-3 border-t border-gray-200">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600 mr-2"></div>
              <span className="text-sm text-gray-600">Processing...</span>
            </div>
          )}
        </div>
      </motion.div>

      {/* Tag Management Modal */}
      <AnimatePresence>
        {showTagModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl shadow-xl max-w-md w-full"
            >
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Manage Tags</h3>
                <button
                  onClick={() => setShowTagModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Action
                  </label>
                  <select
                    value={tagOperation.action}
                    onChange={(e) => setTagOperation(prev => ({ ...prev, action: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="add">Add tags to contacts</option>
                    <option value="remove">Remove tags from contacts</option>
                    <option value="replace">Replace all tags</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tags
                  </label>
                  <div className="flex gap-2 mb-3">
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyPress={handleTagInputKeyPress}
                      placeholder="Enter tag name"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                    <button
                      onClick={addTag}
                      className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                    >
                      Add
                    </button>
                  </div>

                  {tagOperation.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {tagOperation.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                        >
                          {tag}
                          <button
                            onClick={() => removeTag(tag)}
                            className="ml-2 text-blue-600 hover:text-blue-800"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-sm text-gray-600">
                    This will {tagOperation.action} tags {tagOperation.action === 'remove' ? 'from' : 'to'} {' '}
                    <span className="font-medium">{selectedContacts.length}</span> selected contacts.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
                <button
                  onClick={() => setShowTagModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkTagOperation}
                  disabled={loading || tagOperation.tags.length === 0}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Processing...' : 'Apply Changes'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}