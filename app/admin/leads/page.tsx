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
  XCircle,
  BarChart3,
  Target,
  Award,
  Zap,
  RefreshCw,
  Download,
  SortAsc,
  SortDesc,
  Filter as FilterIcon,
  UserCheck,
  Activity
} from 'lucide-react'
import AdminLayout from '../components/AdminLayout'
import LeadDashboard from './components/LeadDashboard'
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
  const [sortBy, setSortBy] = useState<'score' | 'createdAt' | 'loanAmount' | 'lastContact'>('score')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [showScoreInsights, setShowScoreInsights] = useState(false)
  const [bulkSelectedLeads, setBulkSelectedLeads] = useState<string[]>([])
  const [showBulkActions, setShowBulkActions] = useState(false)
  const [showAnalytics, setShowAnalytics] = useState(false)

  useEffect(() => {
    loadLeads()
  }, [])

  useEffect(() => {
    let filtered = leads

    if (searchTerm) {
      filtered = filtered.filter(lead =>
        lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.phone.includes(searchTerm) ||
        lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.source.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(lead => lead.status === statusFilter)
    }

    if (priorityFilter !== 'ALL') {
      filtered = filtered.filter(lead => lead.priority === priorityFilter)
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any, bValue: any
      
      switch (sortBy) {
        case 'score':
          aValue = a.score
          bValue = b.score
          break
        case 'createdAt':
          aValue = new Date(a.createdAt).getTime()
          bValue = new Date(b.createdAt).getTime()
          break
        case 'loanAmount':
          aValue = a.loanAmount
          bValue = b.loanAmount
          break
        case 'lastContact':
          aValue = a.lastContact ? new Date(a.lastContact).getTime() : 0
          bValue = b.lastContact ? new Date(b.lastContact).getTime() : 0
          break
        default:
          aValue = a.score
          bValue = b.score
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

    setFilteredLeads(filtered)
  }, [leads, searchTerm, statusFilter, priorityFilter, sortBy, sortOrder])

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
      // The API will handle converting the assignee ID to the proper object
      await DataService.updateLead(leadId, { assignedToId: assignee } as any)
      // Refetch leads to get updated assignedTo object
      await loadLeads()
      toast.success('Lead assigned successfully')
    } catch (error) {
      toast.error('Failed to assign lead')
    }
  }

  const bulkUpdateStatus = async (status: string) => {
    try {
      // Simulate bulk update
      await Promise.all(bulkSelectedLeads.map(id => 
        DataService.updateLead(id, { status: status as any })
      ))
      
      setLeads(prev =>
        prev.map(lead =>
          bulkSelectedLeads.includes(lead.id)
            ? { ...lead, status: status as any }
            : lead
        )
      )
      
      setBulkSelectedLeads([])
      setShowBulkActions(false)
      toast.success(`Updated ${bulkSelectedLeads.length} leads`)
    } catch (error) {
      toast.error('Failed to update leads')
    }
  }

  const bulkAssignLeads = async (assignee: string) => {
    try {
      await Promise.all(bulkSelectedLeads.map(id => 
        DataService.updateLead(id, { assignedToId: assignee } as any)
      ))
      
      // Refetch leads to get updated assignedTo objects
      await loadLeads()
      setBulkSelectedLeads([])
      setShowBulkActions(false)
      toast.success(`Assigned ${bulkSelectedLeads.length} leads`)
    } catch (error) {
      toast.error('Failed to assign leads')
    }
  }

  const exportLeads = () => {
    const csvContent = `Name,Phone,Email,Loan Type,Loan Amount,Status,Priority,Score,Source,Created At,Last Contact
${filteredLeads.map(lead => 
      `${lead.name},${lead.phone},${lead.email || ''},${lead.loanType},${lead.loanAmount},${lead.status},${lead.priority},${lead.score},${lead.source},${lead.createdAt},${lead.lastContact || ''}`
    ).join('\n')}`
    
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `leads_export_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
    toast.success('Leads exported successfully')
  }

  const refreshLeadScores = async () => {
    try {
      // Simulate lead score refresh
      setLoading(true)
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Update scores (in real implementation, this would call the scoring API)
      setLeads(prev => prev.map(lead => ({
        ...lead,
        score: Math.min(100, lead.score + Math.floor(Math.random() * 10 - 5)) // Random adjustment for demo
      })))
      
      toast.success('Lead scores refreshed successfully')
    } catch (error) {
      toast.error('Failed to refresh lead scores')
    } finally {
      setLoading(false)
    }
  }

  const wonLeads = leads.filter(l => l.status === 'CLOSED_WON').length
  const stats = {
    total: leads.length,
    new: leads.filter(l => l.status === 'NEW').length,
    qualified: leads.filter(l => l.status === 'QUALIFIED').length,
    won: wonLeads,
    avgScore: Math.round(leads.reduce((sum, l) => sum + l.score, 0) / leads.length) || 0,
    highPriority: leads.filter(l => l.priority === 'HIGH' || l.priority === 'URGENT').length,
    conversionRate: leads.length > 0 ? (wonLeads / leads.length * 100) : 0,
    scoreDistribution: {
      excellent: leads.filter(l => l.score >= 80).length,
      good: leads.filter(l => l.score >= 60 && l.score < 80).length,
      average: leads.filter(l => l.score >= 40 && l.score < 60).length,
      poor: leads.filter(l => l.score < 40).length
    }
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
          
          <div className="flex items-center space-x-3">
            <button
              onClick={refreshLeadScores}
              disabled={loading}
              className="btn-secondary flex items-center"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh Scores
            </button>
            
            <button
              onClick={exportLeads}
              className="btn-secondary flex items-center"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </button>
            
            <button
              onClick={() => setShowScoreInsights(!showScoreInsights)}
              className="btn-secondary flex items-center"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Insights
            </button>
            
            <button
              onClick={() => setShowAnalytics(!showAnalytics)}
              className="btn-secondary flex items-center"
            >
              <Activity className="w-4 h-4 mr-2" />
              Analytics
            </button>
            
            <button
              onClick={() => setShowLeadModal(true)}
              className="btn-primary flex items-center"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Lead
            </button>
          </div>
        </div>

        {/* Lead Analytics Dashboard */}
        {showAnalytics && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <LeadDashboard onRefresh={loadLeads} />
          </motion.div>
        )}

        {/* Enhanced Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Users className="w-8 h-8 text-blue-500 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Leads</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">This month</p>
                <p className="text-sm font-medium text-green-600">+12%</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Target className="w-8 h-8 text-red-500 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-600">High Priority</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.highPriority}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Urgent + High</p>
                <p className="text-sm font-medium text-red-600">{((stats.highPriority/stats.total)*100).toFixed(1)}%</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Award className="w-8 h-8 text-yellow-500 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg Score</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.avgScore}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Quality index</p>
                <p className={`text-sm font-medium ${stats.avgScore >= 70 ? 'text-green-600' : stats.avgScore >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {stats.avgScore >= 70 ? 'Excellent' : stats.avgScore >= 50 ? 'Good' : 'Needs Work'}
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <TrendingUp className="w-8 h-8 text-green-500 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Conversion</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.conversionRate.toFixed(1)}%</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Won/Total</p>
                <p className="text-sm font-medium text-green-600">{stats.won}/{stats.total}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Zap className="w-8 h-8 text-purple-500 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Hot Leads</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.scoreDistribution.excellent}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Score 80+</p>
                <p className="text-sm font-medium text-purple-600">Ready to convert</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Activity className="w-8 h-8 text-indigo-500 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Active</p>
                  <p className="text-2xl font-bold text-gray-900">{leads.filter(l => l.lastContact && new Date(l.lastContact) > new Date(Date.now() - 7*24*60*60*1000)).length}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Last 7 days</p>
                <p className="text-sm font-medium text-indigo-600">Recent contact</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Lead Scoring Insights */}
        {showScoreInsights && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Lead Scoring Insights</h3>
              <button
                onClick={() => setShowScoreInsights(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Score Distribution */}
              <div>
                <h4 className="font-medium text-gray-900 mb-4">Score Distribution</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                      <span className="text-sm text-gray-600">Excellent (80+)</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-sm font-medium mr-2">{stats.scoreDistribution.excellent}</span>
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full"
                          style={{ width: `${(stats.scoreDistribution.excellent/stats.total)*100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                      <span className="text-sm text-gray-600">Good (60-79)</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-sm font-medium mr-2">{stats.scoreDistribution.good}</span>
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full"
                          style={{ width: `${(stats.scoreDistribution.good/stats.total)*100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
                      <span className="text-sm text-gray-600">Average (40-59)</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-sm font-medium mr-2">{stats.scoreDistribution.average}</span>
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-yellow-500 h-2 rounded-full"
                          style={{ width: `${(stats.scoreDistribution.average/stats.total)*100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                      <span className="text-sm text-gray-600">Poor (0-39)</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-sm font-medium mr-2">{stats.scoreDistribution.poor}</span>
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-red-500 h-2 rounded-full"
                          style={{ width: `${(stats.scoreDistribution.poor/stats.total)*100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Top Performing Sources */}
              <div>
                <h4 className="font-medium text-gray-900 mb-4">Top Lead Sources</h4>
                <div className="space-y-3">
                  {Array.from(new Set(leads.map(l => l.source)))
                    .map(source => ({
                      source,
                      count: leads.filter(l => l.source === source).length,
                      avgScore: Math.round(leads.filter(l => l.source === source).reduce((sum, l) => sum + l.score, 0) / leads.filter(l => l.source === source).length)
                    }))
                    .sort((a, b) => b.avgScore - a.avgScore)
                    .slice(0, 4)
                    .map((sourceData, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{sourceData.source}</p>
                          <p className="text-xs text-gray-500">{sourceData.count} leads</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-gray-900">{sourceData.avgScore}</p>
                          <p className="text-xs text-gray-500">avg score</p>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
              
              {/* Recommendations */}
              <div>
                <h4 className="font-medium text-gray-900 mb-4">Recommendations</h4>
                <div className="space-y-3">
                  {stats.scoreDistribution.excellent > stats.total * 0.3 && (
                    <div className="p-3 bg-green-50 rounded-lg">
                      <p className="text-sm text-green-800">🎯 High-quality leads! Focus on quick follow-up for hot prospects.</p>
                    </div>
                  )}
                  
                  {stats.scoreDistribution.poor > stats.total * 0.4 && (
                    <div className="p-3 bg-red-50 rounded-lg">
                      <p className="text-sm text-red-800">⚠️ Many low-scoring leads. Review qualification criteria.</p>
                    </div>
                  )}
                  
                  {stats.highPriority < stats.total * 0.2 && (
                    <div className="p-3 bg-yellow-50 rounded-lg">
                      <p className="text-sm text-yellow-800">📈 Consider improving lead targeting to increase priority leads.</p>
                    </div>
                  )}
                  
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-800">💡 Best conversion window: Contact leads within 2 hours for 5x better results.</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
        >
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search leads by name, phone, email, or source..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
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

              <div className="flex items-center border border-gray-300 rounded-lg">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="border-none rounded-l-lg px-3 py-2 text-sm focus:ring-0"
                >
                  <option value="score">Sort by Score</option>
                  <option value="createdAt">Sort by Date</option>
                  <option value="loanAmount">Sort by Amount</option>
                  <option value="lastContact">Sort by Last Contact</option>
                </select>
                <button
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="px-2 py-2 border-l border-gray-300 hover:bg-gray-50"
                >
                  {sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Bulk Actions */}
          {bulkSelectedLeads.length > 0 && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <UserCheck className="w-5 h-5 text-blue-600 mr-2" />
                  <span className="text-sm font-medium text-blue-900">
                    {bulkSelectedLeads.length} leads selected
                  </span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <select
                    onChange={(e) => e.target.value && bulkUpdateStatus(e.target.value)}
                    className="text-sm border border-blue-300 rounded px-2 py-1"
                    defaultValue=""
                  >
                    <option value="">Update Status</option>
                    <option value="CONTACTED">Mark as Contacted</option>
                    <option value="INTERESTED">Mark as Interested</option>
                    <option value="QUALIFIED">Mark as Qualified</option>
                    <option value="CLOSED_LOST">Mark as Lost</option>
                  </select>
                  
                  <select
                    onChange={(e) => e.target.value && bulkAssignLeads(e.target.value)}
                    className="text-sm border border-blue-300 rounded px-2 py-1"
                    defaultValue=""
                  >
                    <option value="">Assign To</option>
                    <option value="John Smith">John Smith</option>
                    <option value="Sarah Johnson">Sarah Johnson</option>
                    <option value="Mike Wilson">Mike Wilson</option>
                  </select>
                  
                  <button
                    onClick={() => setBulkSelectedLeads([])}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Clear Selection
                  </button>
                </div>
              </div>
            </div>
          )}
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
                      <input
                        type="checkbox"
                        checked={bulkSelectedLeads.length === filteredLeads.length && filteredLeads.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setBulkSelectedLeads(filteredLeads.map(lead => lead.id))
                          } else {
                            setBulkSelectedLeads([])
                          }
                        }}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Lead Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Loan Info
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status & Priority
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Lead Score
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Source & Assignment
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Activity
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
                        className={`hover:bg-gray-50 ${bulkSelectedLeads.includes(lead.id) ? 'bg-blue-50' : ''}`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={bulkSelectedLeads.includes(lead.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setBulkSelectedLeads([...bulkSelectedLeads, lead.id])
                              } else {
                                setBulkSelectedLeads(bulkSelectedLeads.filter(id => id !== lead.id))
                              }
                            }}
                            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          />
                        </td>

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
                            <div className="mr-3">
                              <div className={`text-2xl font-bold ${getScoreColor(lead.score)}`}>
                                {lead.score}
                              </div>
                              <div className="w-12 bg-gray-200 rounded-full h-1 mt-1">
                                <div 
                                  className={`h-1 rounded-full ${lead.score >= 80 ? 'bg-green-500' : lead.score >= 60 ? 'bg-blue-500' : lead.score >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                  style={{ width: `${lead.score}%` }}
                                ></div>
                              </div>
                            </div>
                            <div>
                              {lead.score >= 80 ? (
                                <div className="flex items-center text-green-600">
                                  <Zap className="w-4 h-4 mr-1" />
                                  <span className="text-xs font-medium">Hot</span>
                                </div>
                              ) : lead.score >= 60 ? (
                                <div className="flex items-center text-blue-600">
                                  <TrendingUp className="w-4 h-4 mr-1" />
                                  <span className="text-xs font-medium">Warm</span>
                                </div>
                              ) : (
                                <div className="flex items-center text-gray-500">
                                  <Clock className="w-4 h-4 mr-1" />
                                  <span className="text-xs font-medium">Cold</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {lead.source.replace('_', ' ')}
                            </div>
                            <div className="text-sm text-gray-500">
                              {lead.assignedTo?.name || (
                                <span className="text-gray-400 italic">Unassigned</span>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {lead.lastContact ? (
                              <div>
                                <div>{new Date(lead.lastContact).toLocaleDateString()}</div>
                                <div className="text-xs text-gray-500">
                                  {Math.floor((Date.now() - new Date(lead.lastContact).getTime()) / (1000 * 60 * 60 * 24))} days ago
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
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button 
                              className="text-green-600 hover:text-green-900"
                              title="Call Lead"
                            >
                              <Phone className="w-4 h-4" />
                            </button>
                            <button 
                              className="text-blue-600 hover:text-blue-900"
                              title="Send Message"
                            >
                              <MessageSquare className="w-4 h-4" />
                            </button>
                            <button 
                              className="text-gray-600 hover:text-gray-900"
                              title="Edit Lead"
                            >
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
          )}
          
          {filteredLeads.length === 0 && !loading && (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No leads found matching your criteria</p>
            </div>
          )}
        </motion.div>
      </div>
    </AdminLayout>
  )
}