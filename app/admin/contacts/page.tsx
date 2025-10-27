'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Users, 
  Search, 
  Filter, 
  Plus,
  Phone,
  Mail,
  Calendar,
  Tag,
  Edit,
  Trash2,
  MessageSquare,
  Download,
  Upload,
  User,
  CheckCircle,
  XCircle,
  Clock,
  MoreVertical
} from 'lucide-react'
import AdminLayout from '../components/AdminLayout'
import toast from 'react-hot-toast'
import DataService, { Contact } from '../../../lib/dataService'

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)

  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [sourceFilter, setSourceFilter] = useState('ALL')
  const [selectedContacts, setSelectedContacts] = useState<string[]>([])
  const [showBulkActions, setShowBulkActions] = useState(false)

  useEffect(() => {
    loadContacts()
  }, [])

  useEffect(() => {
    let filtered = contacts

    if (searchTerm) {
      filtered = filtered.filter(contact => 
        contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.phone.includes(searchTerm) ||
        contact.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(contact => contact.status === statusFilter)
    }

    if (sourceFilter !== 'ALL') {
      filtered = filtered.filter(contact => contact.source === sourceFilter)
    }

    setFilteredContacts(filtered)
  }, [contacts, searchTerm, statusFilter, sourceFilter])

  const loadContacts = async () => {
    try {
      setLoading(true)
      const data = await DataService.getContacts()
      setContacts(data)
    } catch (error) {
      toast.error('Failed to load contacts')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-800'
      case 'INACTIVE': return 'bg-yellow-100 text-yellow-800'
      case 'BLOCKED': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACTIVE': return CheckCircle
      case 'INACTIVE': return Clock
      case 'BLOCKED': return XCircle
      default: return User
    }
  }

  const toggleContactSelection = (contactId: string) => {
    setSelectedContacts(prev => 
      prev.includes(contactId) 
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    )
  }

  const selectAllContacts = () => {
    if (selectedContacts.length === filteredContacts.length) {
      setSelectedContacts([])
    } else {
      setSelectedContacts(filteredContacts.map(c => c.id))
    }
  }

  const updateContactStatus = async (contactId: string, newStatus: string) => {
    try {
      await DataService.updateContact(contactId, { 
        status: newStatus as any, 
        updatedAt: new Date().toISOString() 
      })
      setContacts(prev => 
        prev.map(contact => 
          contact.id === contactId 
            ? { ...contact, status: newStatus as any, updatedAt: new Date().toISOString() }
            : contact
        )
      )
      toast.success('Contact status updated')
    } catch (error) {
      toast.error('Failed to update contact status')
    }
  }

  const deleteContact = async (contactId: string) => {
    if (confirm('Are you sure you want to delete this contact?')) {
      try {
        await DataService.deleteContact(contactId)
        setContacts(prev => prev.filter(contact => contact.id !== contactId))
        toast.success('Contact deleted')
      } catch (error) {
        toast.error('Failed to delete contact')
      }
    }
  }

  const bulkUpdateStatus = async (status: string) => {
    try {
      await DataService.bulkUpdateContacts(selectedContacts, { 
        status: status as any, 
        updatedAt: new Date().toISOString() 
      })
      setContacts(prev => 
        prev.map(contact => 
          selectedContacts.includes(contact.id)
            ? { ...contact, status: status as any, updatedAt: new Date().toISOString() }
            : contact
        )
      )
      setSelectedContacts([])
      toast.success(`${selectedContacts.length} contacts updated`)
    } catch (error) {
      toast.error('Failed to update contacts')
    }
  }

  const exportContacts = () => {
    const csvContent = [
      ['Name', 'Phone', 'Email', 'Tags', 'Source', 'Status', 'Created At'].join(','),
      ...filteredContacts.map(contact => [
        contact.name,
        contact.phone,
        contact.email || '',
        contact.tags.join(';'),
        contact.source,
        contact.status,
        new Date(contact.createdAt).toLocaleDateString()
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `contacts_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
    toast.success('Contacts exported successfully')
  }

  const stats = {
    total: contacts.length,
    active: contacts.filter(c => c.status === 'ACTIVE').length,
    inactive: contacts.filter(c => c.status === 'INACTIVE').length,
    blocked: contacts.filter(c => c.status === 'BLOCKED').length,
    avgResponseRate: Math.round(contacts.reduce((sum, c) => sum + c.responseRate, 0) / contacts.length)
  }

  const sources = [...new Set(contacts.map(c => c.source))]

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Contact Management</h1>
            <p className="text-gray-600 mt-1">
              Manage your contact database with advanced filtering and bulk operations
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={exportContacts}
              className="btn-secondary flex items-center"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </button>
            <button className="btn-primary flex items-center">
              <Plus className="w-5 h-5 mr-2" />
              Add Contact
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
          >
            <div className="flex items-center">
              <Users className="w-8 h-8 text-blue-500 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Total Contacts</p>
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
              <CheckCircle className="w-8 h-8 text-green-500 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Active</p>
                <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
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
              <Clock className="w-8 h-8 text-yellow-500 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Inactive</p>
                <p className="text-2xl font-bold text-gray-900">{stats.inactive}</p>
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
              <XCircle className="w-8 h-8 text-red-500 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Blocked</p>
                <p className="text-2xl font-bold text-gray-900">{stats.blocked}</p>
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
              <MessageSquare className="w-8 h-8 text-purple-500 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Response</p>
                <p className="text-2xl font-bold text-gray-900">{stats.avgResponseRate}%</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Filters and Search */}
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
                  placeholder="Search contacts by name, phone, email, or tags..."
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
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="BLOCKED">Blocked</option>
              </select>
              
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="ALL">All Sources</option>
                {sources.map(source => (
                  <option key={source} value={source}>{source}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedContacts.length > 0 && (
            <div className="mt-4 p-4 bg-primary-50 rounded-lg border border-primary-200">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-primary-700">
                  {selectedContacts.length} contacts selected
                </span>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => bulkUpdateStatus('ACTIVE')}
                    className="text-sm bg-green-100 text-green-700 px-3 py-1 rounded-lg hover:bg-green-200"
                  >
                    Mark Active
                  </button>
                  <button
                    onClick={() => bulkUpdateStatus('INACTIVE')}
                    className="text-sm bg-yellow-100 text-yellow-700 px-3 py-1 rounded-lg hover:bg-yellow-200"
                  >
                    Mark Inactive
                  </button>
                  <button
                    onClick={() => bulkUpdateStatus('BLOCKED')}
                    className="text-sm bg-red-100 text-red-700 px-3 py-1 rounded-lg hover:bg-red-200"
                  >
                    Block
                  </button>
                </div>
              </div>
            </div>
          )}
        </motion.div>

        {/* Contacts Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedContacts.length === filteredContacts.length && filteredContacts.length > 0}
                      onChange={selectAllContacts}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tags
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Source
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Engagement
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredContacts.map((contact, index) => {
                  const StatusIcon = getStatusIcon(contact.status)
                  
                  return (
                    <motion.tr
                      key={contact.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedContacts.includes(contact.id)}
                          onChange={() => toggleContactSelection(contact.id)}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center mr-3">
                            <User className="w-5 h-5 text-primary-600" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{contact.name}</div>
                            <div className="text-sm text-gray-500">{contact.phone}</div>
                            {contact.email && (
                              <div className="text-sm text-gray-500">{contact.email}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {contact.tags.slice(0, 3).map((tag, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                            >
                              {tag}
                            </span>
                          ))}
                          {contact.tags.length > 3 && (
                            <span className="text-xs text-gray-500">
                              +{contact.tags.length - 3} more
                            </span>
                          )}
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{contact.source}</div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <StatusIcon className="w-4 h-4 mr-2" />
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(contact.status)}`}>
                            {contact.status}
                          </span>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          <div>{contact.totalMessages} messages</div>
                          <div className="text-xs text-gray-500">
                            {contact.responseRate}% response rate
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {contact.lastContact ? (
                            <div>
                              <div>{new Date(contact.lastContact).toLocaleDateString()}</div>
                              <div className="text-xs text-gray-500">
                                {new Date(contact.lastContact).toLocaleTimeString()}
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-400 italic">Never</span>
                          )}
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button className="text-green-600 hover:text-green-900">
                            <Phone className="w-4 h-4" />
                          </button>
                          <button className="text-blue-600 hover:text-blue-900">
                            <MessageSquare className="w-4 h-4" />
                          </button>
                          <button className="text-gray-600 hover:text-gray-900">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteContact(contact.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          
          {filteredContacts.length === 0 && (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No contacts found matching your criteria</p>
            </div>
          )}
        </motion.div>
      </div>
    </AdminLayout>
  )
}