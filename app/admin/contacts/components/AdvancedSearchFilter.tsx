'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Search, 
  Filter, 
  X, 
  Calendar, 
  Tag, 
  MapPin, 
  TrendingUp,
  Save,
  Trash2,
  ChevronDown,
  Settings
} from 'lucide-react'
import { Contact } from '../../../../lib/dataService'

interface SearchFilters {
  searchTerm: string
  status: string[]
  source: string[]
  tags: string[]
  dateRange: {
    start: string
    end: string
    field: 'createdAt' | 'updatedAt' | 'lastContact'
  }
  engagement: {
    responseRateMin: number
    responseRateMax: number
    totalMessagesMin: number
    totalMessagesMax: number
  }
}

interface SavedSearch {
  id: string
  name: string
  filters: SearchFilters
  createdAt: string
}

interface AdvancedSearchFilterProps {
  contacts: Contact[]
  onFiltersChange: (filteredContacts: Contact[]) => void
  onSearchChange: (searchTerm: string) => void
}

const DEFAULT_FILTERS: SearchFilters = {
  searchTerm: '',
  status: [],
  source: [],
  tags: [],
  dateRange: {
    start: '',
    end: '',
    field: 'createdAt'
  },
  engagement: {
    responseRateMin: 0,
    responseRateMax: 100,
    totalMessagesMin: 0,
    totalMessagesMax: 1000
  }
}

export default function AdvancedSearchFilter({ 
  contacts, 
  onFiltersChange, 
  onSearchChange 
}: AdvancedSearchFilterProps) {
  const [filters, setFilters] = useState<SearchFilters>(DEFAULT_FILTERS)
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([])
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [saveSearchName, setSaveSearchName] = useState('')
  const [showSavedSearches, setShowSavedSearches] = useState(false)

  // Extract unique values for filter options
  const uniqueSources = Array.from(new Set(contacts.map(c => c.source))).sort()
  const uniqueTags = Array.from(new Set(contacts.flatMap(c => c.tags || []))).sort()
  const statusOptions = ['ACTIVE', 'INACTIVE', 'BLOCKED']

  useEffect(() => {
    applyFilters()
  }, [filters, contacts])

  useEffect(() => {
    // Load saved searches from localStorage
    const saved = localStorage.getItem('contactSavedSearches')
    if (saved) {
      setSavedSearches(JSON.parse(saved))
    }
  }, [])

  const applyFilters = () => {
    let filtered = [...contacts]

    // Text search
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase()
      filtered = filtered.filter(contact => 
        contact.name.toLowerCase().includes(searchLower) ||
        contact.phone.includes(searchLower) ||
        contact.email?.toLowerCase().includes(searchLower) ||
        contact.tags?.some(tag => tag.toLowerCase().includes(searchLower)) ||
        contact.source.toLowerCase().includes(searchLower)
      )
    }

    // Status filter
    if (filters.status.length > 0) {
      filtered = filtered.filter(contact => filters.status.includes(contact.status))
    }

    // Source filter
    if (filters.source.length > 0) {
      filtered = filtered.filter(contact => filters.source.includes(contact.source))
    }

    // Tags filter
    if (filters.tags.length > 0) {
      filtered = filtered.filter(contact => 
        contact.tags?.some(tag => filters.tags.includes(tag))
      )
    }

    // Date range filter
    if (filters.dateRange.start || filters.dateRange.end) {
      filtered = filtered.filter(contact => {
        const dateField = filters.dateRange.field
        let contactDate: string | undefined
        
        switch (dateField) {
          case 'createdAt':
            contactDate = contact.createdAt
            break
          case 'updatedAt':
            contactDate = contact.updatedAt
            break
          case 'lastContact':
            contactDate = contact.lastContact
            break
        }

        if (!contactDate) return false

        const date = new Date(contactDate)
        const startDate = filters.dateRange.start ? new Date(filters.dateRange.start) : null
        const endDate = filters.dateRange.end ? new Date(filters.dateRange.end) : null

        if (startDate && date < startDate) return false
        if (endDate && date > endDate) return false

        return true
      })
    }

    // Engagement filters
    filtered = filtered.filter(contact => {
      const responseRate = contact.responseRate || 0
      const totalMessages = contact.totalMessages || 0

      return responseRate >= filters.engagement.responseRateMin &&
             responseRate <= filters.engagement.responseRateMax &&
             totalMessages >= filters.engagement.totalMessagesMin &&
             totalMessages <= filters.engagement.totalMessagesMax
    })

    onFiltersChange(filtered)
    onSearchChange(filters.searchTerm)
  }

  const updateFilter = (key: keyof SearchFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const toggleArrayFilter = (key: 'status' | 'source' | 'tags', value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: prev[key].includes(value)
        ? prev[key].filter(item => item !== value)
        : [...prev[key], value]
    }))
  }

  const clearAllFilters = () => {
    setFilters(DEFAULT_FILTERS)
  }

  const saveCurrentSearch = () => {
    if (!saveSearchName.trim()) return

    const newSearch: SavedSearch = {
      id: Date.now().toString(),
      name: saveSearchName.trim(),
      filters: { ...filters },
      createdAt: new Date().toISOString()
    }

    const updatedSearches = [...savedSearches, newSearch]
    setSavedSearches(updatedSearches)
    localStorage.setItem('contactSavedSearches', JSON.stringify(updatedSearches))
    
    setSaveSearchName('')
    setShowSaveModal(false)
  }

  const loadSavedSearch = (search: SavedSearch) => {
    setFilters(search.filters)
    setShowSavedSearches(false)
  }

  const deleteSavedSearch = (searchId: string) => {
    const updatedSearches = savedSearches.filter(s => s.id !== searchId)
    setSavedSearches(updatedSearches)
    localStorage.setItem('contactSavedSearches', JSON.stringify(updatedSearches))
  }

  const hasActiveFilters = () => {
    return filters.searchTerm !== '' ||
           filters.status.length > 0 ||
           filters.source.length > 0 ||
           filters.tags.length > 0 ||
           filters.dateRange.start !== '' ||
           filters.dateRange.end !== '' ||
           filters.engagement.responseRateMin > 0 ||
           filters.engagement.responseRateMax < 100 ||
           filters.engagement.totalMessagesMin > 0 ||
           filters.engagement.totalMessagesMax < 1000
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      {/* Main Search Bar */}
      <div className="flex flex-col md:flex-row gap-4 mb-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search contacts by name, phone, email, or tags..."
              value={filters.searchTerm}
              onChange={(e) => updateFilter('searchTerm', e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={`flex items-center px-4 py-2 border rounded-lg transition-colors ${
              showAdvancedFilters || hasActiveFilters()
                ? 'border-primary-500 bg-primary-50 text-primary-700'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Filter className="w-4 h-4 mr-2" />
            Advanced Filters
            <ChevronDown className={`w-4 h-4 ml-1 transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`} />
          </button>

          {savedSearches.length > 0 && (
            <button
              onClick={() => setShowSavedSearches(!showSavedSearches)}
              className="flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Save className="w-4 h-4 mr-2" />
              Saved
            </button>
          )}

          {hasActiveFilters() && (
            <button
              onClick={clearAllFilters}
              className="flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <X className="w-4 h-4 mr-2" />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Saved Searches Dropdown */}
      <AnimatePresence>
        {showSavedSearches && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200"
          >
            <h4 className="font-medium text-gray-900 mb-3">Saved Searches</h4>
            <div className="space-y-2">
              {savedSearches.map(search => (
                <div key={search.id} className="flex items-center justify-between p-2 bg-white rounded border">
                  <button
                    onClick={() => loadSavedSearch(search)}
                    className="flex-1 text-left text-sm text-gray-700 hover:text-primary-600"
                  >
                    {search.name}
                  </button>
                  <button
                    onClick={() => deleteSavedSearch(search.id)}
                    className="text-gray-400 hover:text-red-600 ml-2"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Advanced Filters */}
      <AnimatePresence>
        {showAdvancedFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-6 border-t border-gray-200 pt-6"
          >
            {/* Status and Source Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <div className="space-y-2">
                  {statusOptions.map(status => (
                    <label key={status} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={filters.status.includes(status)}
                        onChange={() => toggleArrayFilter('status', status)}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">{status}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Source</label>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {uniqueSources.map(source => (
                    <label key={source} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={filters.source.includes(source)}
                        onChange={() => toggleArrayFilter('source', source)}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">{source}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Tags Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                {uniqueTags.map(tag => (
                  <label key={tag} className="flex items-center bg-gray-50 rounded-lg px-3 py-1">
                    <input
                      type="checkbox"
                      checked={filters.tags.includes(tag)}
                      onChange={() => toggleArrayFilter('tags', tag)}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 mr-2"
                    />
                    <span className="text-sm text-gray-700">{tag}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Date Range Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <select
                  value={filters.dateRange.field}
                  onChange={(e) => updateFilter('dateRange', { ...filters.dateRange, field: e.target.value })}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="createdAt">Created Date</option>
                  <option value="updatedAt">Updated Date</option>
                  <option value="lastContact">Last Contact</option>
                </select>
                <input
                  type="date"
                  value={filters.dateRange.start}
                  onChange={(e) => updateFilter('dateRange', { ...filters.dateRange, start: e.target.value })}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="Start date"
                />
                <input
                  type="date"
                  value={filters.dateRange.end}
                  onChange={(e) => updateFilter('dateRange', { ...filters.dateRange, end: e.target.value })}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="End date"
                />
              </div>
            </div>

            {/* Engagement Filters */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Engagement Metrics</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Response Rate (%)</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={filters.engagement.responseRateMin}
                      onChange={(e) => updateFilter('engagement', { 
                        ...filters.engagement, 
                        responseRateMin: parseInt(e.target.value) || 0 
                      })}
                      className="w-20 border border-gray-300 rounded px-2 py-1 text-sm"
                    />
                    <span className="text-gray-500">to</span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={filters.engagement.responseRateMax}
                      onChange={(e) => updateFilter('engagement', { 
                        ...filters.engagement, 
                        responseRateMax: parseInt(e.target.value) || 100 
                      })}
                      className="w-20 border border-gray-300 rounded px-2 py-1 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-gray-600 mb-1">Total Messages</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      min="0"
                      value={filters.engagement.totalMessagesMin}
                      onChange={(e) => updateFilter('engagement', { 
                        ...filters.engagement, 
                        totalMessagesMin: parseInt(e.target.value) || 0 
                      })}
                      className="w-20 border border-gray-300 rounded px-2 py-1 text-sm"
                    />
                    <span className="text-gray-500">to</span>
                    <input
                      type="number"
                      min="0"
                      value={filters.engagement.totalMessagesMax}
                      onChange={(e) => updateFilter('engagement', { 
                        ...filters.engagement, 
                        totalMessagesMax: parseInt(e.target.value) || 1000 
                      })}
                      className="w-20 border border-gray-300 rounded px-2 py-1 text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Save Search */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <button
                onClick={() => setShowSaveModal(true)}
                className="flex items-center px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                <Save className="w-4 h-4 mr-2" />
                Save Search
              </button>
              
              <div className="text-sm text-gray-500">
                {hasActiveFilters() ? 'Filters applied' : 'No filters applied'}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Save Search Modal */}
      <AnimatePresence>
        {showSaveModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl shadow-xl max-w-md w-full"
            >
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Save Search</h3>
                <input
                  type="text"
                  value={saveSearchName}
                  onChange={(e) => setSaveSearchName(e.target.value)}
                  placeholder="Enter search name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent mb-4"
                />
                <div className="flex items-center justify-end space-x-3">
                  <button
                    onClick={() => setShowSaveModal(false)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveCurrentSearch}
                    disabled={!saveSearchName.trim()}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Save
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}