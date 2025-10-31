'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  Users,
  Target,
  Award,
  Clock,
  BarChart3,
  LineChart,
  PieChart,
  RefreshCw,
  Download,
  Filter,
  ArrowUp,
  ArrowDown,
  Minus
} from 'lucide-react'
import toast from 'react-hot-toast'

interface ConversionMetrics {
  totalLeads: number
  convertedLeads: number
  conversionRate: number
  averageConversionTime: number
  conversionsByStage: Record<string, number>
  conversionTrends: Array<{
    date: string
    leads: number
    conversions: number
    rate: number
  }>
}

interface ConversionGoal {
  target: number
  current: number
  period: string
}

interface LeadConversionTrackerProps {
  dateRange?: string
  onRefresh?: () => void
}

export default function LeadConversionTracker({ 
  dateRange = '30', 
  onRefresh 
}: LeadConversionTrackerProps) {
  const [conversionData, setConversionData] = useState<ConversionMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState(dateRange)
  const [viewType, setViewType] = useState<'trends' | 'stages' | 'goals'>('trends')

  // Conversion goals (would typically come from settings/API)
  const conversionGoals: ConversionGoal[] = [
    { target: 15, current: 0, period: 'Monthly' },
    { target: 12, current: 0, period: 'Quarterly' },
    { target: 10, current: 0, period: 'Yearly' }
  ]

  useEffect(() => {
    loadConversionData()
  }, [selectedPeriod])

  const loadConversionData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/leads/analytics?action=report&days=${selectedPeriod}`)
      const data = await response.json()
      
      if (data.success && data.report.conversion) {
        setConversionData(data.report.conversion)
        
        // Update current goals with actual data
        conversionGoals[0].current = data.report.conversion.conversionRate
        conversionGoals[1].current = data.report.conversion.conversionRate
        conversionGoals[2].current = data.report.conversion.conversionRate
      } else {
        toast.error('Failed to load conversion data')
      }
    } catch (error) {
      toast.error('Error loading conversion data')
    } finally {
      setLoading(false)
    }
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-IN').format(num)
  }

  const getTrendIcon = (current: number, previous: number) => {
    if (current > previous) return <ArrowUp className="w-4 h-4 text-green-500" />
    if (current < previous) return <ArrowDown className="w-4 h-4 text-red-500" />
    return <Minus className="w-4 h-4 text-gray-500" />
  }

  const getConversionColor = (rate: number) => {
    if (rate >= 20) return 'text-green-600'
    if (rate >= 15) return 'text-blue-600'
    if (rate >= 10) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getGoalProgress = (current: number, target: number) => {
    return Math.min((current / target) * 100, 100)
  }

  const getGoalStatus = (current: number, target: number) => {
    const progress = (current / target) * 100
    if (progress >= 100) return { color: 'text-green-600', bg: 'bg-green-100', status: 'Achieved' }
    if (progress >= 80) return { color: 'text-blue-600', bg: 'bg-blue-100', status: 'On Track' }
    if (progress >= 60) return { color: 'text-yellow-600', bg: 'bg-yellow-100', status: 'At Risk' }
    return { color: 'text-red-600', bg: 'bg-red-100', status: 'Behind' }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        <span className="ml-3 text-gray-600">Loading conversion data...</span>
      </div>
    )
  }

  if (!conversionData) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500">No conversion data available</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Lead Conversion Tracking</h3>
          <p className="text-gray-600 text-sm">Monitor conversion rates and track progress toward goals</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="365">Last year</option>
          </select>
          
          <button
            onClick={loadConversionData}
            disabled={loading}
            className="btn-secondary flex items-center"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* View Selector */}
      <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
        {[
          { key: 'trends', label: 'Trends', icon: LineChart },
          { key: 'stages', label: 'By Stage', icon: PieChart },
          { key: 'goals', label: 'Goals', icon: Target }
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setViewType(key as any)}
            className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              viewType === key
                ? 'bg-white text-primary-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Icon className="w-4 h-4 mr-2" />
            {label}
          </button>
        ))}
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <TrendingUp className="w-8 h-8 text-green-500 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Conversion Rate</p>
                <p className={`text-2xl font-bold ${getConversionColor(conversionData.conversionRate)}`}>
                  {conversionData.conversionRate.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-600">
            {conversionData.convertedLeads} of {conversionData.totalLeads} leads
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
              <Users className="w-8 h-8 text-blue-500 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Total Conversions</p>
                <p className="text-2xl font-bold text-gray-900">{formatNumber(conversionData.convertedLeads)}</p>
              </div>
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-600">
            Successful lead conversions
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
              <Clock className="w-8 h-8 text-purple-500 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Time to Convert</p>
                <p className="text-2xl font-bold text-gray-900">{conversionData.averageConversionTime.toFixed(1)}</p>
              </div>
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-600">
            Days from lead to conversion
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
              <Award className="w-8 h-8 text-yellow-500 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Best Performance</p>
                <p className="text-2xl font-bold text-gray-900">
                  {Math.max(...conversionData.conversionTrends.map(t => t.rate)).toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-600">
            Highest daily conversion rate
          </div>
        </motion.div>
      </div>

      {/* Trends View */}
      {viewType === 'trends' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
        >
          <h4 className="text-lg font-semibold text-gray-900 mb-6">Conversion Trends</h4>
          
          {/* Trend Chart Placeholder */}
          <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center mb-6">
            <div className="text-center">
              <LineChart className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">Conversion trend chart would be displayed here</p>
              <p className="text-sm text-gray-400">Integration with charting library needed</p>
            </div>
          </div>

          {/* Trend Data Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2">Date</th>
                  <th className="text-right py-2">Leads</th>
                  <th className="text-right py-2">Conversions</th>
                  <th className="text-right py-2">Rate</th>
                  <th className="text-right py-2">Trend</th>
                </tr>
              </thead>
              <tbody>
                {conversionData.conversionTrends.slice(-10).map((trend, index, array) => {
                  const previousRate = index > 0 ? array[index - 1].rate : trend.rate
                  return (
                    <tr key={index} className="border-b border-gray-100">
                      <td className="py-2">{new Date(trend.date).toLocaleDateString()}</td>
                      <td className="text-right py-2">{trend.leads}</td>
                      <td className="text-right py-2">{trend.conversions}</td>
                      <td className="text-right py-2">
                        <span className={`font-medium ${getConversionColor(trend.rate)}`}>
                          {trend.rate.toFixed(1)}%
                        </span>
                      </td>
                      <td className="text-right py-2">
                        {getTrendIcon(trend.rate, previousRate)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* Stages View */}
      {viewType === 'stages' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
        >
          <h4 className="text-lg font-semibold text-gray-900 mb-6">Conversions by Stage</h4>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(conversionData.conversionsByStage).map(([stage, count]) => {
              const percentage = conversionData.totalLeads > 0 
                ? (count / conversionData.totalLeads) * 100 
                : 0
              
              return (
                <div key={stage} className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm font-medium text-gray-600 mb-2">
                    {stage.replace('_', ' ')}
                  </div>
                  <div className="text-2xl font-bold text-gray-900 mb-1">
                    {formatNumber(count)}
                  </div>
                  <div className="text-sm text-gray-500">
                    {percentage.toFixed(1)}%
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.max(percentage, 2)}%` }}
                    ></div>
                  </div>
                </div>
              )
            })}
          </div>
        </motion.div>
      )}

      {/* Goals View */}
      {viewType === 'goals' && (
        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
          >
            <h4 className="text-lg font-semibold text-gray-900 mb-6">Conversion Goals</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {conversionGoals.map((goal, index) => {
                const progress = getGoalProgress(goal.current, goal.target)
                const status = getGoalStatus(goal.current, goal.target)
                
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="p-6 border border-gray-200 rounded-lg"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h5 className="font-medium text-gray-900">{goal.period} Goal</h5>
                        <p className="text-sm text-gray-600">Target: {goal.target}%</p>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-medium ${status.bg} ${status.color}`}>
                        {status.status}
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-gray-600">Progress</span>
                        <span className="font-medium">{goal.current.toFixed(1)}% / {goal.target}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div 
                          className={`h-3 rounded-full transition-all duration-500 ${
                            progress >= 100 ? 'bg-green-500' :
                            progress >= 80 ? 'bg-blue-500' :
                            progress >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    <div className="text-center">
                      <div className={`text-2xl font-bold ${status.color}`}>
                        {progress.toFixed(1)}%
                      </div>
                      <div className="text-sm text-gray-600">Complete</div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>

          {/* Goal Insights */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
          >
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Goal Insights</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h5 className="font-medium text-gray-900 mb-3">Performance Summary</h5>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Current Rate:</span>
                    <span className={`font-medium ${getConversionColor(conversionData.conversionRate)}`}>
                      {conversionData.conversionRate.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Monthly Target:</span>
                    <span className="font-medium">{conversionGoals[0].target}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Gap to Goal:</span>
                    <span className={`font-medium ${
                      conversionData.conversionRate >= conversionGoals[0].target ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {(conversionData.conversionRate - conversionGoals[0].target).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
              
              <div>
                <h5 className="font-medium text-gray-900 mb-3">Recommendations</h5>
                <div className="space-y-2 text-sm text-gray-600">
                  {conversionData.conversionRate < conversionGoals[0].target ? (
                    <>
                      <p>• Focus on lead qualification to improve conversion rates</p>
                      <p>• Implement faster follow-up processes</p>
                      <p>• Review and optimize sales scripts</p>
                    </>
                  ) : (
                    <>
                      <p>• Great job! You're meeting your conversion goals</p>
                      <p>• Consider increasing lead volume to scale results</p>
                      <p>• Share best practices with the team</p>
                    </>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}