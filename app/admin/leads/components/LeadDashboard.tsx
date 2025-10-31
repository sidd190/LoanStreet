'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  Target,
  Award,
  Zap,
  Activity,
  RefreshCw,
  Download,
  Calendar,
  Filter,
  Eye,
  ArrowUp,
  ArrowDown,
  Minus,
  Clock,
  DollarSign,
  Percent,
  Star,
  AlertCircle,
  CheckCircle,
  XCircle,
  PieChart,
  LineChart,
  FileText
} from 'lucide-react'
import toast from 'react-hot-toast'
import LeadPipelineVisualization from './LeadPipelineVisualization'
import LeadConversionTracker from './LeadConversionTracker'
import LeadReporting from './LeadReporting'

interface LeadDashboardProps {
  onRefresh?: () => void
}

interface AnalyticsData {
  period: string
  summary: {
    totalLeads: number
    newLeads: number
    convertedLeads: number
    lostLeads: number
    conversionRate: number
    totalRevenue: number
    averageLeadValue: number
    averageConversionTime: number
  }
  conversion: {
    totalLeads: number
    convertedLeads: number
    conversionRate: number
    averageConversionTime: number
    conversionsByStage: Record<string, number>
    conversionTrends: Array<{ date: string; leads: number; conversions: number; rate: number }>
  }
  sources: Array<{
    source: string
    totalLeads: number
    convertedLeads: number
    conversionRate: number
    averageScore: number
    averageAmount: number
    revenue: number
  }>
  pipeline: {
    stages: Array<{
      stage: string
      count: number
      percentage: number
      averageTimeInStage: number
      dropoffRate: number
    }>
    totalValue: number
    weightedValue: number
    velocity: number
    bottlenecks: string[]
  }
  performance: Array<{
    employeeId: string
    employeeName: string
    assignedLeads: number
    convertedLeads: number
    conversionRate: number
    averageResponseTime: number
    averageScore: number
    revenue: number
    activities: number
    rank: number
  }>
  trends: {
    leadGeneration: Array<{ date: string; count: number }>
    conversionRates: Array<{ date: string; rate: number }>
    sourcePerformance: Array<{ date: string; source: string; leads: number }>
  }
  insights: string[]
  recommendations: string[]
}

interface FunnelData {
  stages: Array<{
    stage: string
    count: number
    percentage: number
    conversionRate: number
  }>
  dropoffPoints: Array<{
    from: string
    to: string
    dropoffRate: number
    count: number
  }>
}

interface CohortData {
  cohorts: Array<{
    cohort: string
    totalLeads: number
    conversions: Array<{ month: number; count: number; rate: number }>
  }>
}

export default function LeadDashboard({ onRefresh }: LeadDashboardProps) {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [funnelData, setFunnelData] = useState<FunnelData | null>(null)
  const [cohortData, setCohortData] = useState<CohortData | null>(null)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState('30')
  const [selectedView, setSelectedView] = useState<'overview' | 'conversion' | 'sources' | 'performance' | 'pipeline' | 'funnel' | 'cohort' | 'reports'>('overview')

  useEffect(() => {
    loadAnalytics()
  }, [dateRange])

  const loadAnalytics = async () => {
    try {
      setLoading(true)
      
      // Load main analytics report
      const reportResponse = await fetch(`/api/leads/analytics?action=report&days=${dateRange}`)
      const reportData = await reportResponse.json()
      
      if (reportData.success) {
        setAnalyticsData(reportData.report)
      }

      // Load funnel analysis
      const funnelResponse = await fetch(`/api/leads/analytics?action=funnel&days=${dateRange}`)
      const funnelResult = await funnelResponse.json()
      
      if (funnelResult.success) {
        setFunnelData(funnelResult.funnel)
      }

      // Load cohort analysis
      const cohortResponse = await fetch(`/api/leads/analytics?action=cohort&months=6`)
      const cohortResult = await cohortResponse.json()
      
      if (cohortResult.success) {
        setCohortData(cohortResult.cohort)
      }

      if (!reportData.success) {
        toast.error('Failed to load analytics data')
      }
    } catch (error) {
      toast.error('Error loading analytics')
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async (type: 'leads' | 'conversions' | 'sources' | 'performance') => {
    try {
      const response = await fetch(`/api/leads/analytics?action=export&type=${type}&days=${dateRange}`)
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `lead_${type}_export.csv`
        a.click()
        window.URL.revokeObjectURL(url)
        toast.success(`${type} data exported successfully`)
      } else {
        toast.error('Export failed')
      }
    } catch (error) {
      toast.error('Error exporting data')
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-IN').format(num)
  }

  const getTrendIcon = (current: number, previous: number) => {
    if (current > previous) return <ArrowUp className="w-4 h-4 text-green-500" />
    if (current < previous) return <ArrowDown className="w-4 h-4 text-red-500" />
    return <Minus className="w-4 h-4 text-gray-500" />
  }

  const getStageColor = (stage: string) => {
    const colors: Record<string, string> = {
      'NEW': 'bg-blue-100 text-blue-800',
      'CONTACTED': 'bg-yellow-100 text-yellow-800',
      'INTERESTED': 'bg-purple-100 text-purple-800',
      'QUALIFIED': 'bg-green-100 text-green-800',
      'PROPOSAL_SENT': 'bg-indigo-100 text-indigo-800',
      'NEGOTIATION': 'bg-orange-100 text-orange-800',
      'CLOSED_WON': 'bg-emerald-100 text-emerald-800',
      'CLOSED_LOST': 'bg-red-100 text-red-800'
    }
    return colors[stage] || 'bg-gray-100 text-gray-800'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        <span className="ml-3 text-gray-600">Loading analytics...</span>
      </div>
    )
  }

  if (!analyticsData) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500">No analytics data available</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Lead Analytics Dashboard</h2>
          <p className="text-gray-600 mt-1">
            Comprehensive insights into lead performance and conversion metrics ({analyticsData.period})
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="365">Last year</option>
          </select>
          
          <button
            onClick={loadAnalytics}
            disabled={loading}
            className="btn-secondary flex items-center"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          
          <div className="relative">
            <select
              onChange={(e) => e.target.value && handleExport(e.target.value as any)}
              className="btn-secondary appearance-none pr-8"
              defaultValue=""
            >
              <option value="">Export Data</option>
              <option value="leads">Export Leads</option>
              <option value="conversions">Export Conversions</option>
              <option value="sources">Export Sources</option>
              <option value="performance">Export Performance</option>
            </select>
            <Download className="w-4 h-4 absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* View Selector */}
      <div className="flex space-x-1 bg-gray-100 rounded-lg p-1 overflow-x-auto">
        {[
          { key: 'overview', label: 'Overview', icon: BarChart3 },
          { key: 'conversion', label: 'Conversion', icon: TrendingUp },
          { key: 'sources', label: 'Sources', icon: Target },
          { key: 'performance', label: 'Performance', icon: Award },
          { key: 'pipeline', label: 'Pipeline', icon: PieChart },
          { key: 'funnel', label: 'Funnel', icon: LineChart },
          { key: 'cohort', label: 'Cohort', icon: Calendar },
          { key: 'reports', label: 'Reports', icon: FileText }
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setSelectedView(key as any)}
            className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
              selectedView === key
                ? 'bg-white text-primary-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Icon className="w-4 h-4 mr-2" />
            {label}
          </button>
        ))}
      </div>

      {/* Overview View */}
      {selectedView === 'overview' && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
                    <p className="text-2xl font-bold text-gray-900">{formatNumber(analyticsData.summary.totalLeads)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">New: {analyticsData.summary.newLeads}</p>
                  {getTrendIcon(analyticsData.summary.totalLeads, analyticsData.summary.totalLeads * 0.9)}
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
                  <TrendingUp className="w-8 h-8 text-green-500 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">Conversion Rate</p>
                    <p className="text-2xl font-bold text-gray-900">{analyticsData.summary.conversionRate.toFixed(1)}%</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Won: {analyticsData.summary.convertedLeads}</p>
                  {getTrendIcon(analyticsData.summary.conversionRate, 10)}
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
                  <DollarSign className="w-8 h-8 text-yellow-500 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(analyticsData.summary.totalRevenue)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Avg: {formatCurrency(analyticsData.summary.averageLeadValue)}</p>
                  {getTrendIcon(analyticsData.summary.totalRevenue, analyticsData.summary.totalRevenue * 0.8)}
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
                  <Clock className="w-8 h-8 text-purple-500 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">Avg Conversion Time</p>
                    <p className="text-2xl font-bold text-gray-900">{analyticsData.summary.averageConversionTime.toFixed(1)} days</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Lost: {analyticsData.summary.lostLeads}</p>
                  {getTrendIcon(15, analyticsData.summary.averageConversionTime)}
                </div>
              </div>
            </motion.div>
          </div>

          {/* Pipeline Overview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Lead Pipeline Overview</h3>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                  Total Value: {formatCurrency(analyticsData.pipeline.totalValue)}
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                  Weighted: {formatCurrency(analyticsData.pipeline.weightedValue)}
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
              {analyticsData.pipeline.stages.map((stage, index) => (
                <div key={stage.stage} className="text-center">
                  <div className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getStageColor(stage.stage)} mb-2`}>
                    {stage.stage.replace('_', ' ')}
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{stage.count}</div>
                  <div className="text-sm text-gray-500">{stage.percentage.toFixed(1)}%</div>
                  {stage.averageTimeInStage > 0 && (
                    <div className="text-xs text-gray-400 mt-1">
                      {stage.averageTimeInStage.toFixed(1)} days avg
                    </div>
                  )}
                </div>
              ))}
            </div>

            {analyticsData.pipeline.bottlenecks.length > 0 && (
              <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
                <div className="flex items-center mb-2">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mr-2" />
                  <h4 className="font-medium text-yellow-800">Pipeline Bottlenecks</h4>
                </div>
                <ul className="text-sm text-yellow-700 space-y-1">
                  {analyticsData.pipeline.bottlenecks.map((bottleneck, index) => (
                    <li key={index}>• {bottleneck}</li>
                  ))}
                </ul>
              </div>
            )}
          </motion.div>

          {/* Insights and Recommendations */}
          <div className="grid lg:grid-cols-2 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
            >
              <div className="flex items-center mb-4">
                <Eye className="w-5 h-5 text-blue-600 mr-2" />
                <h3 className="text-lg font-semibold text-gray-900">Key Insights</h3>
              </div>
              <div className="space-y-3">
                {analyticsData.insights.map((insight, index) => (
                  <div key={index} className="flex items-start p-3 bg-blue-50 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-blue-800">{insight}</p>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
            >
              <div className="flex items-center mb-4">
                <Zap className="w-5 h-5 text-green-600 mr-2" />
                <h3 className="text-lg font-semibold text-gray-900">Recommendations</h3>
              </div>
              <div className="space-y-3">
                {analyticsData.recommendations.map((recommendation, index) => (
                  <div key={index} className="flex items-start p-3 bg-green-50 rounded-lg">
                    <Star className="w-5 h-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-green-800">{recommendation}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </>
      )}

      {/* Conversion View */}
      {selectedView === 'conversion' && (
        <LeadConversionTracker dateRange={dateRange} onRefresh={onRefresh} />
      )}

      {/* Pipeline View */}
      {selectedView === 'pipeline' && (
        <LeadPipelineVisualization dateRange={dateRange} onRefresh={onRefresh} />
      )}

      {/* Sources View */}
      {selectedView === 'sources' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Lead Source Analysis</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3">Source</th>
                  <th className="text-right py-3">Total Leads</th>
                  <th className="text-right py-3">Converted</th>
                  <th className="text-right py-3">Conversion Rate</th>
                  <th className="text-right py-3">Avg Score</th>
                  <th className="text-right py-3">Avg Amount</th>
                  <th className="text-right py-3">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {analyticsData.sources.map((source, index) => (
                  <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-4">
                      <div className="font-medium text-gray-900">{source.source}</div>
                    </td>
                    <td className="text-right py-4">{source.totalLeads}</td>
                    <td className="text-right py-4">{source.convertedLeads}</td>
                    <td className="text-right py-4">
                      <span className={`font-medium ${
                        source.conversionRate >= 20 ? 'text-green-600' : 
                        source.conversionRate >= 10 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {source.conversionRate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="text-right py-4">{source.averageScore.toFixed(1)}</td>
                    <td className="text-right py-4">{formatCurrency(source.averageAmount)}</td>
                    <td className="text-right py-4 font-medium">{formatCurrency(source.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* Performance View */}
      {selectedView === 'performance' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Employee Performance</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3">Rank</th>
                  <th className="text-left py-3">Employee</th>
                  <th className="text-right py-3">Assigned</th>
                  <th className="text-right py-3">Converted</th>
                  <th className="text-right py-3">Rate</th>
                  <th className="text-right py-3">Avg Response</th>
                  <th className="text-right py-3">Avg Score</th>
                  <th className="text-right py-3">Revenue</th>
                  <th className="text-right py-3">Activities</th>
                </tr>
              </thead>
              <tbody>
                {analyticsData.performance.map((perf, index) => (
                  <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-4">
                      <div className="flex items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          perf.rank === 1 ? 'bg-yellow-100 text-yellow-800' :
                          perf.rank === 2 ? 'bg-gray-100 text-gray-800' :
                          perf.rank === 3 ? 'bg-orange-100 text-orange-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {perf.rank}
                        </div>
                      </div>
                    </td>
                    <td className="py-4">
                      <div className="font-medium text-gray-900">{perf.employeeName}</div>
                    </td>
                    <td className="text-right py-4">{perf.assignedLeads}</td>
                    <td className="text-right py-4">{perf.convertedLeads}</td>
                    <td className="text-right py-4">
                      <span className={`font-medium ${
                        perf.conversionRate >= 20 ? 'text-green-600' : 
                        perf.conversionRate >= 10 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {perf.conversionRate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="text-right py-4">{perf.averageResponseTime.toFixed(1)}h</td>
                    <td className="text-right py-4">{perf.averageScore.toFixed(1)}</td>
                    <td className="text-right py-4 font-medium">{formatCurrency(perf.revenue)}</td>
                    <td className="text-right py-4">{perf.activities}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* Funnel View */}
      {selectedView === 'funnel' && funnelData && (
        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Lead Funnel Analysis</h3>
            <div className="space-y-4">
              {funnelData.stages.map((stage, index) => (
                <div key={stage.stage} className="relative">
                  <div className="flex items-center justify-between mb-2">
                    <div className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStageColor(stage.stage)}`}>
                      {stage.stage.replace('_', ' ')}
                    </div>
                    <div className="text-sm text-gray-600">
                      {stage.count} leads ({stage.percentage.toFixed(1)}%)
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-8 relative overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-blue-600 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
                      style={{ width: `${Math.max(stage.percentage, 5)}%` }}
                    >
                      {stage.count}
                    </div>
                  </div>
                  {stage.conversionRate > 0 && (
                    <div className="text-xs text-gray-500 mt-1">
                      {stage.conversionRate.toFixed(1)}% conversion to next stage
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>

          {funnelData.dropoffPoints.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Major Dropoff Points</h3>
              <div className="space-y-4">
                {funnelData.dropoffPoints.map((dropoff, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
                    <div>
                      <div className="font-medium text-red-800">
                        {dropoff.from.replace('_', ' ')} → {dropoff.to.replace('_', ' ')}
                      </div>
                      <div className="text-sm text-red-600">
                        {dropoff.count} leads lost ({dropoff.dropoffRate.toFixed(1)}% dropoff rate)
                      </div>
                    </div>
                    <XCircle className="w-6 h-6 text-red-500" />
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* Cohort View */}
      {selectedView === 'cohort' && cohortData && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Lead Cohort Analysis</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3">Cohort</th>
                  <th className="text-right py-3">Total Leads</th>
                  {Array.from({ length: 6 }, (_, i) => (
                    <th key={i} className="text-right py-3">Month {i + 1}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cohortData.cohorts.map((cohort, index) => (
                  <tr key={index} className="border-b border-gray-100">
                    <td className="py-3 font-medium">{cohort.cohort}</td>
                    <td className="text-right py-3">{cohort.totalLeads}</td>
                    {cohort.conversions.map((conv, convIndex) => (
                      <td key={convIndex} className="text-right py-3">
                        <div className={`px-2 py-1 rounded text-xs ${
                          conv.rate >= 20 ? 'bg-green-100 text-green-800' :
                          conv.rate >= 10 ? 'bg-yellow-100 text-yellow-800' :
                          conv.rate > 0 ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {conv.rate.toFixed(1)}%
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* Reports View */}
      {selectedView === 'reports' && (
        <LeadReporting onRefresh={onRefresh} />
      )}
    </div>
  )
}