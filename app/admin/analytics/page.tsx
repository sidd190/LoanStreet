'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  Users, 
  MessageSquare, 
  Target,
  Phone,
  Mail,
  Calendar,
  Download,
  Filter,
  RefreshCw,
  Eye,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react'
import AdminLayout from '../components/AdminLayout'
import DataService from '../../../lib/dataService'
import toast from 'react-hot-toast'

interface AnalyticsData {
  overview: {
    totalCampaigns: number
    totalMessages: number
    totalContacts: number
    totalLeads: number
    responseRate: number
    conversionRate: number
    avgResponseTime: number
    activeUsers: number
  }
  campaignPerformance: {
    name: string
    sent: number
    delivered: number
    opened: number
    clicked: number
    responded: number
    converted: number
  }[]
  messageStats: {
    whatsapp: { sent: number, delivered: number, read: number, replied: number }
    sms: { sent: number, delivered: number, clicked: number, replied: number }
    email: { sent: number, delivered: number, opened: number, clicked: number }
  }
  leadSources: {
    source: string
    leads: number
    conversions: number
    conversionRate: number
  }[]
  timeSeriesData: {
    date: string
    messages: number
    responses: number
    conversions: number
  }[]
}

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState('30d')
  const [isLoading, setIsLoading] = useState(true)
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)

  const loadAnalytics = async () => {
    try {
      setIsLoading(true)
      const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90
      const data = await DataService.getAnalytics(days)
      setAnalytics(data)
    } catch (error) {
      console.error('Error loading analytics:', error)
      toast.error('Failed to load analytics data')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadAnalytics()
  }, [dateRange])

  // Fallback data for when analytics is null
  const fallbackAnalytics: AnalyticsData = {
    overview: {
      totalCampaigns: 45,
      totalMessages: 125430,
      totalContacts: 15670,
      totalLeads: 3240,
      responseRate: 24.5,
      conversionRate: 12.8,
      avgResponseTime: 2.4,
      activeUsers: 8
    },
    campaignPerformance: [
      {
        name: 'Personal Loan Promo',
        sent: 5000,
        delivered: 4950,
        opened: 2475,
        clicked: 495,
        responded: 247,
        converted: 62
      },
      {
        name: 'Business Loan Campaign',
        sent: 3000,
        delivered: 2970,
        opened: 1485,
        clicked: 297,
        responded: 148,
        converted: 44
      },
      {
        name: 'Home Loan Special',
        sent: 8000,
        delivered: 7920,
        opened: 3960,
        clicked: 792,
        responded: 396,
        converted: 119
      }
    ],
    messageStats: {
      whatsapp: { sent: 85000, delivered: 84150, read: 67320, replied: 16830 },
      sms: { sent: 35000, delivered: 34650, clicked: 3465, replied: 8662 },
      email: { sent: 5430, delivered: 5320, opened: 2660, clicked: 532 }
    },
    leadSources: [
      { source: 'WhatsApp Campaign', leads: 1250, conversions: 187, conversionRate: 15.0 },
      { source: 'SMS Campaign', leads: 890, conversions: 98, conversionRate: 11.0 },
      { source: 'Email Campaign', leads: 340, conversions: 51, conversionRate: 15.0 },
      { source: 'Website Form', leads: 560, conversions: 84, conversionRate: 15.0 },
      { source: 'Referral', leads: 200, conversions: 40, conversionRate: 20.0 }
    ],
    timeSeriesData: [
      { date: '2024-10-01', messages: 4200, responses: 1050, conversions: 134 },
      { date: '2024-10-02', messages: 3800, responses: 950, conversions: 121 },
      { date: '2024-10-03', messages: 4500, responses: 1125, conversions: 146 },
      { date: '2024-10-04', messages: 4100, responses: 1025, conversions: 131 },
      { date: '2024-10-05', messages: 3900, responses: 975, conversions: 124 }
    ]
  }

  const currentAnalytics = analytics || fallbackAnalytics

  const refreshData = async () => {
    await loadAnalytics()
    toast.success('Analytics data refreshed')
  }

  const exportReport = () => {
    // Simulate report export
    const csvContent = `Campaign,Sent,Delivered,Opened,Clicked,Responded,Converted
${currentAnalytics.campaignPerformance.map(c => 
  `${c.name},${c.sent},${c.delivered},${c.opened},${c.clicked},${c.responded},${c.converted}`
).join('\n')}`
    
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `analytics_report_${dateRange}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const getChangeIndicator = (current: number, previous: number) => {
    const change = ((current - previous) / previous) * 100
    const isPositive = change > 0
    
    return (
      <div className={`flex items-center ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
        {isPositive ? (
          <ArrowUpRight className="w-4 h-4 mr-1" />
        ) : (
          <ArrowDownRight className="w-4 h-4 mr-1" />
        )}
        <span className="text-sm font-medium">
          {Math.abs(change).toFixed(1)}%
        </span>
      </div>
    )
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Analytics & Reports</h1>
            <p className="text-gray-600 mt-1">
              Track campaign performance, engagement metrics, and conversion rates
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="1y">Last year</option>
            </select>
            
            <button
              onClick={refreshData}
              disabled={isLoading}
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <RefreshCw className={`w-5 h-5 text-gray-600 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            
            <button
              onClick={exportReport}
              className="btn-primary flex items-center"
            >
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </button>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && !analytics && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <RefreshCw className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Loading analytics data...</p>
            </div>
          </div>
        )}

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Target className="w-6 h-6 text-blue-600" />
              </div>
              {getChangeIndicator(currentAnalytics.overview.totalCampaigns, 38)}
            </div>
            <p className="text-sm font-medium text-gray-600">Total Campaigns</p>
            <p className="text-2xl font-bold text-gray-900">{currentAnalytics.overview.totalCampaigns}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-green-600" />
              </div>
              {getChangeIndicator(currentAnalytics.overview.totalMessages, 98750)}
            </div>
            <p className="text-sm font-medium text-gray-600">Messages Sent</p>
            <p className="text-2xl font-bold text-gray-900">{currentAnalytics.overview.totalMessages.toLocaleString()}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
              {getChangeIndicator(currentAnalytics.overview.responseRate, 21.2)}
            </div>
            <p className="text-sm font-medium text-gray-600">Response Rate</p>
            <p className="text-2xl font-bold text-gray-900">{currentAnalytics.overview.responseRate}%</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-orange-600" />
              </div>
              {getChangeIndicator(currentAnalytics.overview.conversionRate, 10.5)}
            </div>
            <p className="text-sm font-medium text-gray-600">Conversion Rate</p>
            <p className="text-2xl font-bold text-gray-900">{currentAnalytics.overview.conversionRate}%</p>
          </motion.div>
        </div>

        {/* Charts Row */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Campaign Performance */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Campaign Performance</h3>
              <button className="text-sm text-primary-600 hover:text-primary-700 flex items-center">
                <Eye className="w-4 h-4 mr-1" />
                View Details
              </button>
            </div>

            <div className="space-y-4">
              {currentAnalytics.campaignPerformance.map((campaign, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-gray-900">{campaign.name}</h4>
                    <span className="text-sm text-gray-500">
                      {((campaign.converted / campaign.sent) * 100).toFixed(1)}% conversion
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Sent</p>
                      <p className="font-semibold">{campaign.sent.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Responded</p>
                      <p className="font-semibold">{campaign.responded.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Converted</p>
                      <p className="font-semibold text-green-600">{campaign.converted.toLocaleString()}</p>
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="mt-3 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-primary-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${(campaign.responded / campaign.sent) * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Message Channel Performance */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Channel Performance</h3>

            <div className="space-y-6">
              {/* WhatsApp */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                      <MessageSquare className="w-4 h-4 text-green-600" />
                    </div>
                    <span className="font-medium">WhatsApp</span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {((currentAnalytics.messageStats.whatsapp.replied / currentAnalytics.messageStats.whatsapp.sent) * 100).toFixed(1)}% response rate
                  </span>
                </div>
                
                <div className="grid grid-cols-4 gap-3 text-sm">
                  <div>
                    <p className="text-gray-500">Sent</p>
                    <p className="font-semibold">{currentAnalytics.messageStats.whatsapp.sent.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Delivered</p>
                    <p className="font-semibold">{currentAnalytics.messageStats.whatsapp.delivered.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Read</p>
                    <p className="font-semibold">{currentAnalytics.messageStats.whatsapp.read.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Replied</p>
                    <p className="font-semibold text-green-600">{currentAnalytics.messageStats.whatsapp.replied.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* SMS */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                      <Phone className="w-4 h-4 text-blue-600" />
                    </div>
                    <span className="font-medium">SMS</span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {((currentAnalytics.messageStats.sms.replied / currentAnalytics.messageStats.sms.sent) * 100).toFixed(1)}% response rate
                  </span>
                </div>
                
                <div className="grid grid-cols-4 gap-3 text-sm">
                  <div>
                    <p className="text-gray-500">Sent</p>
                    <p className="font-semibold">{currentAnalytics.messageStats.sms.sent.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Delivered</p>
                    <p className="font-semibold">{currentAnalytics.messageStats.sms.delivered.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Clicked</p>
                    <p className="font-semibold">{currentAnalytics.messageStats.sms.clicked.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Replied</p>
                    <p className="font-semibold text-blue-600">{currentAnalytics.messageStats.sms.replied.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* Email */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                      <Mail className="w-4 h-4 text-purple-600" />
                    </div>
                    <span className="font-medium">Email</span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {((currentAnalytics.messageStats.email.opened / currentAnalytics.messageStats.email.sent) * 100).toFixed(1)}% open rate
                  </span>
                </div>
                
                <div className="grid grid-cols-4 gap-3 text-sm">
                  <div>
                    <p className="text-gray-500">Sent</p>
                    <p className="font-semibold">{currentAnalytics.messageStats.email.sent.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Delivered</p>
                    <p className="font-semibold">{currentAnalytics.messageStats.email.delivered.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Opened</p>
                    <p className="font-semibold">{currentAnalytics.messageStats.email.opened.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Clicked</p>
                    <p className="font-semibold text-purple-600">{currentAnalytics.messageStats.email.clicked.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Lead Sources */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Lead Sources Performance</h3>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Source</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Leads</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Conversions</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Conversion Rate</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Performance</th>
                </tr>
              </thead>
              <tbody>
                {currentAnalytics.leadSources.map((source, index) => (
                  <tr key={index} className="border-b border-gray-100">
                    <td className="py-3 px-4 font-medium text-gray-900">{source.source}</td>
                    <td className="py-3 px-4">{source.leads.toLocaleString()}</td>
                    <td className="py-3 px-4 text-green-600 font-medium">{source.conversions.toLocaleString()}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        source.conversionRate >= 15 
                          ? 'bg-green-100 text-green-800'
                          : source.conversionRate >= 10
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {source.conversionRate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-primary-600 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${(source.conversionRate / 25) * 100}%` }}
                        ></div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </AdminLayout>
  )
}