'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  MessageSquare,
  Target,
  Calendar,
  Download,
  Filter,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react'
import AdminLayout from '../components/AdminLayout'

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState('30d')
  const [campaignType, setCampaignType] = useState('ALL')
  const [loading, setLoading] = useState(false)

  const analyticsData = {
    overview: {
      totalCampaigns: 24,
      totalMessages: 125430,
      totalResponses: 15678,
      conversionRate: 12.5,
      responseRate: 24.8,
      avgResponseTime: '2.3 hours'
    },
    campaignPerformance: [
      {
        id: '1',
        name: 'Personal Loan Diwali Campaign',
        type: 'WHATSAPP',
        sent: 5000,
        delivered: 4850,
        read: 3200,
        replied: 450,
        conversions: 89,
        conversionRate: 1.78,
        responseRate: 14.06,
        roi: 340
      },
      {
        id: '2',
        name: 'Business Loan October',
        type: 'SMS',
        sent: 3000,
        delivered: 2950,
        read: 1800,
        replied: 180,
        conversions: 45,
        conversionRate: 1.5,
        responseRate: 10.0,
        roi: 280
      },
      {
        id: '3',
        name: 'Home Loan Weekend Special',
        type: 'WHATSAPP',
        sent: 2500,
        delivered: 2400,
        read: 1900,
        replied: 320,
        conversions: 78,
        conversionRate: 3.12,
        responseRate: 16.84,
        roi: 420
      }
    ],
    timeSeriesData: {
      labels: ['Oct 1', 'Oct 8', 'Oct 15', 'Oct 22', 'Oct 29'],
      messagesSent: [8500, 12000, 15000, 18500, 22000],
      responses: [1200, 1800, 2400, 2900, 3500],
      conversions: [150, 220, 300, 380, 450]
    },
    channelPerformance: {
      whatsapp: {
        sent: 45000,
        delivered: 43200,
        responseRate: 18.5,
        conversionRate: 2.1
      },
      sms: {
        sent: 35000,
        delivered: 34300,
        responseRate: 12.3,
        conversionRate: 1.4
      }
    },
    topPerformingSegments: [
      { segment: 'High Income (>50K)', responseRate: 28.5, conversionRate: 3.2 },
      { segment: 'Business Owners', responseRate: 24.1, conversionRate: 2.8 },
      { segment: 'Salaried (25-40K)', responseRate: 22.3, conversionRate: 2.1 },
      { segment: 'Young Professionals', responseRate: 19.8, conversionRate: 1.9 }
    ]
  }

  const refreshData = () => {
    setLoading(true)
    // Simulate API call
    setTimeout(() => {
      setLoading(false)
    }, 1000)
  }

  const exportReport = () => {
    // Generate and download analytics report
    const reportData = {
      generatedAt: new Date().toISOString(),
      dateRange,
      campaignType,
      ...analyticsData
    }
    
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `analytics-report-${dateRange}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
            <p className="text-gray-600 mt-1">Campaign performance and conversion tracking</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={refreshData}
              disabled={loading}
              className="btn-secondary flex items-center"
            >
              <RefreshCw className={`w-5 h-5 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={exportReport}
              className="btn-primary flex items-center"
            >
              <Download className="w-5 h-5 mr-2" />
              Export Report
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="card">
          <div className="flex flex-col sm:flex-row gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="input-field"
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
                <option value="1y">Last year</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Campaign Type</label>
              <select
                value={campaignType}
                onChange={(e) => setCampaignType(e.target.value)}
                className="input-field"
              >
                <option value="ALL">All Campaigns</option>
                <option value="SMS">SMS Only</option>
                <option value="WHATSAPP">WhatsApp Only</option>
              </select>
            </div>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Campaigns</p>
                <p className="text-3xl font-bold text-gray-900">{analyticsData.overview.totalCampaigns}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <Target className="w-8 h-8 text-blue-600" />
              </div>
            </div>
            <div className="flex items-center mt-4">
              <ArrowUpRight className="w-4 h-4 text-green-500" />
              <span className="text-sm font-medium text-green-600 ml-1">+15%</span>
              <span className="text-sm text-gray-500 ml-1">from last month</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="card"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Messages Sent</p>
                <p className="text-3xl font-bold text-gray-900">{analyticsData.overview.totalMessages.toLocaleString()}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <MessageSquare className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <div className="flex items-center mt-4">
              <ArrowUpRight className="w-4 h-4 text-green-500" />
              <span className="text-sm font-medium text-green-600 ml-1">+22%</span>
              <span className="text-sm text-gray-500 ml-1">from last month</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="card"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Response Rate</p>
                <p className="text-3xl font-bold text-gray-900">{analyticsData.overview.responseRate}%</p>
              </div>
              <div className="bg-purple-100 p-3 rounded-lg">
                <TrendingUp className="w-8 h-8 text-purple-600" />
              </div>
            </div>
            <div className="flex items-center mt-4">
              <ArrowDownRight className="w-4 h-4 text-red-500" />
              <span className="text-sm font-medium text-red-600 ml-1">-2.1%</span>
              <span className="text-sm text-gray-500 ml-1">from last month</span>
            </div>
          </motion.div>
        </div>

        {/* Performance Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Campaign Performance Trends</h3>
            <div className="flex items-center space-x-2">
              <button className="text-sm text-gray-500 hover:text-gray-700">Messages</button>
              <button className="text-sm bg-primary-100 text-primary-600 px-3 py-1 rounded-lg">Responses</button>
              <button className="text-sm text-gray-500 hover:text-gray-700">Conversions</button>
            </div>
          </div>
          
          {/* Placeholder for chart */}
          <div className="h-80 bg-gray-50 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">Performance Chart</p>
              <p className="text-gray-400 text-sm">Interactive analytics chart will be displayed here</p>
            </div>
          </div>
        </motion.div>

        {/* Campaign Performance Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="card"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Campaign Performance Details</h3>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Campaign</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Type</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Sent</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Delivered</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Response Rate</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Conversion Rate</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">ROI</th>
                </tr>
              </thead>
              <tbody>
                {analyticsData.campaignPerformance.map((campaign) => (
                  <tr key={campaign.id} className="border-b border-gray-100">
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium text-gray-900">{campaign.name}</p>
                        <p className="text-sm text-gray-500">{campaign.conversions} conversions</p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        campaign.type === 'WHATSAPP' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {campaign.type}
                      </span>
                    </td>
                    <td className="py-3 px-4">{campaign.sent.toLocaleString()}</td>
                    <td className="py-3 px-4">{campaign.delivered.toLocaleString()}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center">
                        <span className="font-medium">{campaign.responseRate}%</span>
                        <div className="ml-2 w-16 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${Math.min(campaign.responseRate * 5, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-medium text-green-600">{campaign.conversionRate}%</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-medium text-purple-600">{campaign.roi}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Channel Performance & Top Segments */}
        <div className="grid lg:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="card"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Channel Performance</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                <div className="flex items-center">
                  <div className="text-2xl mr-3">📱</div>
                  <div>
                    <p className="font-medium text-gray-900">WhatsApp</p>
                    <p className="text-sm text-gray-600">{analyticsData.channelPerformance.whatsapp.sent.toLocaleString()} sent</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-green-600">{analyticsData.channelPerformance.whatsapp.responseRate}%</p>
                  <p className="text-sm text-gray-500">Response Rate</p>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center">
                  <div className="text-2xl mr-3">💬</div>
                  <div>
                    <p className="font-medium text-gray-900">SMS</p>
                    <p className="text-sm text-gray-600">{analyticsData.channelPerformance.sms.sent.toLocaleString()} sent</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-blue-600">{analyticsData.channelPerformance.sms.responseRate}%</p>
                  <p className="text-sm text-gray-500">Response Rate</p>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="card"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Top Performing Segments</h3>
            
            <div className="space-y-3">
              {analyticsData.topPerformingSegments.map((segment, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{segment.segment}</p>
                    <p className="text-sm text-gray-600">Response: {segment.responseRate}%</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-purple-600">{segment.conversionRate}%</p>
                    <p className="text-xs text-gray-500">Conversion</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </AdminLayout>
  )
}