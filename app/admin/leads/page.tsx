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
  TrendingUp,
  TrendingDown,
  Star,
  Clock,
  Edit,
  Eye,
  MessageSquare,
  User,
  Building,
  Home,
  CreditCard,
  GraduationCap,
  Car,
  Coins,
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react'
import AdminLayout from '../components/AdminLayout'
import toast from 'react-hot-toast'
import DataService, { Lead } from '../../../lib/dataService'

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)

  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [priorityFilter, setPriorityFilter] = useState('ALL')
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [showLeadModal, setShowLeadModal] = useState(false)

  useEffect(() => {
    loadLeads()
  }, [])

  useEffect(() => {
    let filtered = leads

    if (searchTerm) {
      filtered = filtered.filter(lead =>
        lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.phone.includes(searchTerm) ||
        lead.email?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(lead => lead.status === statusFilter)
    }

    if (priorityFilter !== 'ALL') {
      filtered = filtered.filter(lead => lead.priority === priorityFilter)
    }

    setFilteredLeads(filtered)
  }, [leads, searchTerm, statusFilter, priorityFilter])

  const loadLeads = async () => {
    try {
      setLoading(true)
      const data = await DataService.getLeads()
      setLeads(data)
    } catch (error) {
      toast.error('Failed to load leads')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'NEW': return 'bg-blue-100 text-blue-800'
      case 'CONTACTED': return 'bg-yellow-100 text-yellow-800'
      case 'INTERESTED': return 'bg-purple-100 text-purple-800'
      case 'QUALIFIED': return 'bg-green-100 text-green-800'
      case 'PROPOSAL_SENT': return 'bg-indigo-100 text-indigo-800'
      case 'NEGOTIATION': return 'bg-orange-100 text-orange-800'
      case 'CLOSED_WON': return 'bg-emerald-100 text-emerald-800'
      case 'CLOSED_LOST': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'bg-red-100 text-red-800'
      case 'HIGH': return 'bg-orange-100 text-orange-800'
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800'
      case 'LOW': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getLoanTypeIcon = (type: string) => {
    switch (type) {
      case 'PERSONAL': return CreditCard
      case 'BUSINESS': return Building
      case 'HOME': return Home
      case 'VEHICLE': return Car
      case 'EDUCATION': return GraduationCap
      case 'GOLD': return Coins
      default: return CreditCard
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const updateLeadStatus = async (leadId: string, newStatus: string) => {
    try {
      await DataService.updateLead(leadId, {
        status: newStatus as any,
        lastContact: new Date().toISOString()
      })
      setLeads(prev =>
        prev.map(lead =>
          lead.id === leadId
            ? { ...lead, status: newStatus as any, lastContact: new Date().toISOString() }
            : lead
        )
      )
      toast.success('Lead status updated')
    } catch (error) {
      toast.error('Failed to update lead status')
    }
  }

  const assignLead = async (leadId: string, assignee: string) => {
    try {
      await DataService.updateLead(leadId, { assignedTo: assignee })
      setLeads(prev =>
        prev.map(lead =>
          lead.id === leadId
            ? { ...lead, assignedTo: assignee }
            : lead
        )
      )
      toast.success('Lead assigned successfully')
    } catch (error) {
      toast.error('Failed to assign lead')
    }
  }

  const stats = {
    total: leads.length,
    new: leads.filter(l => l.status === 'NEW').length,
    qualified: leads.filter(l => l.status === 'QUALIFIED').length,
    won: leads.filter(l => l.status === 'CLOSED_WON').length,
    avgScore: Math.round(leads.reduce((sum, l) => sum + l.score, 0) / leads.length)
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Lead Management</h1>
            <p className="text-gray-600 mt-1">
              Track and manage your loan leads with intelligent scoring and prioritization
            </p>
          </div>
          <button
            onClick={() => setShowLeadModal(true)}
            className="btn-primary flex items-center"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Lead
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
              <Users className="w-8 h-8 text-blue-500 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Total Leads</p>
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
              <AlertCircle className="w-8 h-8 text-yellow-500 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">New Leads</p>
                <p className="text-2xl font-bold text-gray-900">{stats.new}</p>
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
              <CheckCircle className="w-8 h-8 text-green-500 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Qualified</p>
                <p className="text-2xl font-bold text-gray-900">{stats.qualified}</p>
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
              <TrendingUp className="w-8 h-8 text-emerald-500 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Converted</p>
                <p className="text-2xl font-bold text-gray-900">{stats.won}</p>
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
              <Star className="w-8 h-8 text-purple-500 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Score</p>
                <p className="text-2xl font-bold text-gray-900">{stats.avgScore}</p>
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
                  placeholder="Search leads by name, phone, or email..."
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
                <option value="NEW">New</option>
                <option value="CONTACTED">Contacted</option>
                <option value="INTERESTED">Interested</option>
                <option value="QUALIFIED">Qualified</option>
                <option value="PROPOSAL_SENT">Proposal Sent</option>
                <option value="NEGOTIATION">Negotiation</option>
                <option value="CLOSED_WON">Closed Won</option>
                <option value="CLOSED_LOST">Closed Lost</option>
              </select>

              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="ALL">All Priority</option>
                <option value="URGENT">Urgent</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>
          </div>
        </motion.div>

        {/* Leads Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
        >
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              <span className="ml-3 text-gray-600">Loading leads...</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Lead Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Loan Info
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Score
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Assigned To
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
                  {filteredLeads.map((lead, index) => {
                    const LoanIcon = getLoanTypeIcon(lead.loanType)

                    return (
                      <motion.tr
                        key={lead.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="hover:bg-gray-50"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center mr-3">
                              <User className="w-5 h-5 text-primary-600" />
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">{lead.name}</div>
                              <div className="text-sm text-gray-500">{lead.phone}</div>
                              {lead.email && (
                                <div className="text-sm text-gray-500">{lead.email}</div>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <LoanIcon className="w-5 h-5 text-gray-400 mr-2" />
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {lead.loanType.replace('_', ' ')}
                              </div>
                              <div className="text-sm text-gray-500">
                                ₹{lead.loanAmount.toLocaleString()}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="space-y-1">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(lead.status)}`}>
                              {lead.status.replace('_', ' ')}
                            </span>
                            <br />
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(lead.priority)}`}>
                              {lead.priority}
                            </span>
                          </div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className={`text-2xl font-bold ${getScoreColor(lead.score)}`}>
                              {lead.score}
                            </div>
                            <div className="ml-2">
                              {lead.score >= 80 ? (
                                <TrendingUp className="w-4 h-4 text-green-500" />
                              ) : (
                                <TrendingDown className="w-4 h-4 text-red-500" />
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {lead.assignedTo || (
                              <span className="text-gray-400 italic">Unassigned</span>
                            )}
                          </div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {lead.lastContact ? (
                              <div>
                                <div>{new Date(lead.lastContact).toLocaleDateString()}</div>
                                <div className="text-xs text-gray-500">
                                  {new Date(lead.lastContact).toLocaleTimeString()}
                                </div>
                              </div>
                            ) : (
                              <span className="text-red-500 text-xs">Never contacted</span>
                            )}
                          </div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => {
                                setSelectedLead(lead)
                                setShowLeadModal(true)
                              }}
                              className="text-primary-600 hover:text-primary-900"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button className="text-green-600 hover:text-green-900">
                              <Phone className="w-4 h-4" />
                            </button>
                            <button className="text-blue-600 hover:text-blue-900">
                              <MessageSquare className="w-4 h-4" />
                            </button>
                            <button className="text-gray-600 hover:text-gray-900">
                              <Edit className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          
            {filteredLeads.length === 0 && !loading && (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No leads found matching your criteria</p>
            </div>
          )}
          )}
        </motion.div>
      </div>
    </AdminLayout>
  )
}