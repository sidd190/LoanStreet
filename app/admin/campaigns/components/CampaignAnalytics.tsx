'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Send, 
  CheckCircle, 
  MessageSquare,
  Target,
  DollarSign,
  Download,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react'
import toast from 'react-hot-toast'

interface CampaignAnalyticsProps {
  campaignId?: string
  timeRange?: '7d' | '30d' | '90d' | 'all'
}

interface AnalyticsData {
  overview: {
    totalCampaigns: number
    totalMessages: number
    totalContacts: number
    averageDeliveryRate: number
    averageResponseRate: number
    totalCost: number
  }
  performance: {
    deliveryRate: number
    responseRate: number
    conversionRate: number
    averageResponseTime: number
    costPerMessage: number
    costPerResponse: number
  }
  campaignComparison: {
    id: string
    name: string
    type: string
    sent: number
    delivered: number
    responses: number
    deliveryRate: number
    responseRate: number
    cost: number
    roi: number
  }[]
  topPerformers: {
    id: string
    name: string
    type: string
    responseRate: number
    conversionRate: number
    roi: number
  }[]
  recommendations: string[]
}

export default function CampaignAnalytics({ campaignId, timeRange = '30d' }: CampaignAnalyticsProps) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showComparison, setShowComparison] = useState(false)

  useEffect(() => {
    loadAnalytics()
  }, [campaignId, timeRange])

  const loadAnalytics = async () => {
    try {
      setLoading(true)
      
      const url = campaignId 
        ? `/api/campaigns/${campaignId}/analytics?timeRange=${timeRange}`
        : `/api/campaigns/analytics?timeRange=${timeRange}`
      
      const response = await fetch(url, {
        credentials: 'include'
      })
      
      if (response.ok) {
        const data = await response.json()
        setAnalytics(data)
      } else {
        // Fallback to mock data for development
        setAnalytics(generateMockAnalytics())
      }
    } catch (error) {
      console.error('Failed to load analytics:', error)
      setAnalytics(generateMockAnalytics())
    } finally {
      setLoading(false)
    }
  }

  const generateMockAnalytics = (): AnalyticsData => {
    return {
      overview: {
        totalCampaigns: 24,
        totalMessages: 125000,
        totalContacts: 45000,
        averageDeliveryRate: 94.2,
        averageResponseRate: 12.8,
        totalCost: 3750
      },
      performance: {
        deliveryRate: 94.2,
        responseRate: 12.8,
        conversionRate: 3.4,
        averageResponseTime: 2.4,
        costPerMessage: 0.03,
        costPerResponse: 0.23
      },
      campaignComparison: [
        {
          id: '1',
          name: 'Personal Loan Summer Promo',
          type: 'WHATSAPP',
          sent: 15000,
          delivered: 14250,
          responses: 2130,
          deliveryRate: 95.0,
          responseRate: 14.2,
          cost: 450,
          roi: 320
        },
        {
          id: '2',
          name: 'Business Loan Campaign',
          type: 'SMS',
          sent: 8000,
          delivered: 7520,
          responses: 904,
          deliveryRate: 94.0,
          responseRate: 11.3,
          cost: 400,
          roi: 280
        }
      ],
      topPerformers: [
        {
          id: '1',
          name: 'Personal Loan Summer Promo',
          type: 'WHATSAPP',
          responseRate: 14.2,
          conversionRate: 4.1,
          roi: 320
        },
        {
          id: '2',
          name: 'Business Loan Campaign',
          type: 'SMS',
          responseRate: 11.3,
          conversionRate: 2.9,
          roi: 280
        }
      ],
      recommendations: [
        'WhatsApp campaigns show 25% higher response rates than SMS. Consider shifting budget allocation.',
        'Peak engagement occurs between 10 AM - 2 PM. Schedule campaigns accordingly.',
        'Personalized messages with customer names show 18% better performance.',
        'Follow-up campaigns within 24 hours increase conversion by 35%.'
      ]
    }
  }

  const exportReport = async () => {
    try {
      const response = await fetch(`/api/campaigns/analytics/export?timeRange=${timeRange}`, {
        credentials: 'include'
      })
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `campaign-analytics-${timeRange}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        toast.success('Report exported successfully')
      } else {
        toast.error('Failed to export report')
      }
    } catch (error) {
      toast.error('Failed to export report')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500">No analytics data available</p>
      </div>
    )
  }

  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`
  const formatPercentage = (value: number) => `${value.toFixed(1)}%`

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Campaign Analytics</h2>
          <p className="text-gray-600 mt-1">
            {campaignId ? 'Individual campaign performance' : 'Overall campaign performance and insights'}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowComparison(!showComparison)}
            className={`px-4 py-2 rounded-lg font-medium ${
              showComparison
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <BarChart3 className="w-4 h-4 mr-2 inline" />
            Compare
          </button>
          <button
            onClick={exportReport}
            className="flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </button>
          <button
            onClick={loadAnalytics}
            className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
        >
          <div className="flex items-center">
            <Target className="w-8 h-8 text-blue-500 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">Total Campaigns</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.overview.totalCampaigns}</p>
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
            <Send className="w-8 h-8 text-green-500 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">Messages Sent</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.overview.totalMessages.toLocaleString()}</p>
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
            <Users className="w-8 h-8 text-purple-500 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">Total Contacts</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.overview.totalContacts.toLocaleString()}</p>
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
            <CheckCircle className="w-8 h-8 text-emerald-500 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">Delivery Rate</p>
              <div className="flex items-center">
                <p className="text-2xl font-bold text-gray-900">{formatPercentage(analytics.overview.averageDeliveryRate)}</p>
                <TrendingUp className="w-4 h-4 text-green-500 ml-2" />
              </div>
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
            <MessageSquare className="w-8 h-8 text-orange-500 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">Response Rate</p>
              <div className="flex items-center">
                <p className="text-2xl font-bold text-gray-900">{formatPercentage(analytics.overview.averageResponseRate)}</p>
                <TrendingUp className="w-4 h-4 text-green-500 ml-2" />
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
        >
          <div className="flex items-center">
            <DollarSign className="w-8 h-8 text-red-500 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">Total Cost</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(analytics.overview.totalCost)}</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Performance Metrics and Top Performers */}
      <div className="grid lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Performance Metrics</h3>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-600">Delivery Rate</p>
                <p className="text-xl font-bold text-gray-900">{formatPercentage(analytics.performance.deliveryRate)}</p>
              </div>
              <div className="w-24 h-2 bg-gray-200 rounded-full">
                <div 
                  className="h-2 bg-green-500 rounded-full"
                  style={{ width: `${analytics.performance.deliveryRate}%` }}
                />
              </div>
            </div>

            <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-600">Response Rate</p>
                <p className="text-xl font-bold text-gray-900">{formatPercentage(analytics.performance.responseRate)}</p>
              </div>
              <div className="w-24 h-2 bg-gray-200 rounded-full">
                <div 
                  className="h-2 bg-blue-500 rounded-full"
                  style={{ width: `${analytics.performance.responseRate}%` }}
                />
              </div>
            </div>

            <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-600">Conversion Rate</p>
                <p className="text-xl font-bold text-gray-900">{formatPercentage(analytics.performance.conversionRate)}</p>
              </div>
              <div className="w-24 h-2 bg-gray-200 rounded-full">
                <div 
                  className="h-2 bg-purple-500 rounded-full"
                  style={{ width: `${analytics.performance.conversionRate * 10}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="text-center">
                <p className="text-sm text-gray-600">Avg Response Time</p>
                <p className="text-lg font-semibold text-gray-900">{analytics.performance.averageResponseTime}h</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">Cost per Response</p>
                <p className="text-lg font-semibold text-gray-900">{formatCurrency(analytics.performance.costPerResponse)}</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Top Performers */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Top Performing Campaigns</h3>
          
          <div className="space-y-4">
            {analytics.topPerformers.map((campaign, index) => (
              <div key={campaign.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                    index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : 'bg-orange-500'
                  }`}>
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{campaign.name}</p>
                    <p className="text-sm text-gray-500">{campaign.type}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{formatPercentage(campaign.responseRate)}</p>
                  <p className="text-xs text-gray-500">Response Rate</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Campaign Comparison Table */}
      {showComparison && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Campaign Comparison</h3>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Campaign</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Type</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600">Sent</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600">Delivered</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600">Responses</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600">Delivery Rate</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600">Response Rate</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600">Cost</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600">ROI</th>
                </tr>
              </thead>
              <tbody>
                {analytics.campaignComparison.map((campaign) => (
                  <tr key={campaign.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="font-medium text-gray-900">{campaign.name}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        campaign.type === 'WHATSAPP' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {campaign.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">{campaign.sent.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right">{campaign.delivered.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right">{campaign.responses.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right">{formatPercentage(campaign.deliveryRate)}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end">
                        {formatPercentage(campaign.responseRate)}
                        {campaign.responseRate > 12 ? (
                          <ArrowUpRight className="w-4 h-4 text-green-500 ml-1" />
                        ) : (
                          <ArrowDownRight className="w-4 h-4 text-red-500 ml-1" />
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">{formatCurrency(campaign.cost)}</td>
                    <td className="py-3 px-4 text-right">
                      <span className={`font-medium ${campaign.roi > 300 ? 'text-green-600' : 'text-gray-900'}`}>
                        {formatPercentage(campaign.roi)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* Recommendations */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
        className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Recommendations</h3>
        
        <div className="space-y-3">
          {analytics.recommendations.map((recommendation, index) => (
            <div key={index} className="flex items-start space-x-3 p-4 bg-blue-50 rounded-lg">
              <TrendingUp className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-blue-800">{recommendation}</p>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}