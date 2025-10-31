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
  ArrowRight,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react'
import toast from 'react-hot-toast'

interface PipelineStage {
  stage: string
  count: number
  percentage: number
  averageTimeInStage: number
  dropoffRate: number
  value: number
  conversionRate: number
}

interface PipelineData {
  stages: PipelineStage[]
  totalValue: number
  weightedValue: number
  velocity: number
  bottlenecks: string[]
  trends: Array<{
    date: string
    stage: string
    count: number
    value: number
  }>
}

interface LeadPipelineVisualizationProps {
  dateRange?: string
  onRefresh?: () => void
}

export default function LeadPipelineVisualization({ 
  dateRange = '30', 
  onRefresh 
}: LeadPipelineVisualizationProps) {
  const [pipelineData, setPipelineData] = useState<PipelineData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedStage, setSelectedStage] = useState<string | null>(null)

  useEffect(() => {
    loadPipelineData()
  }, [dateRange])

  const loadPipelineData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/leads/analytics?action=report&days=${dateRange}`)
      const data = await response.json()
      
      if (data.success && data.report.pipeline) {
        // Transform the pipeline data for visualization
        const pipeline = data.report.pipeline
        const transformedData: PipelineData = {
          stages: pipeline.stages.map((stage: any) => ({
            ...stage,
            value: stage.count * 500000, // Estimated value per lead
            conversionRate: stage.count > 0 ? (stage.count / pipeline.stages[0].count) * 100 : 0
          })),
          totalValue: pipeline.totalValue,
          weightedValue: pipeline.weightedValue,
          velocity: pipeline.velocity,
          bottlenecks: pipeline.bottlenecks,
          trends: [] // Would be populated from actual trend data
        }
        setPipelineData(transformedData)
      } else {
        toast.error('Failed to load pipeline data')
      }
    } catch (error) {
      toast.error('Error loading pipeline data')
    } finally {
      setLoading(false)
    }
  }

  const getStageColor = (stage: string) => {
    const colors: Record<string, { bg: string; text: string; border: string }> = {
      'NEW': { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300' },
      'CONTACTED': { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300' },
      'INTERESTED': { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-300' },
      'QUALIFIED': { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300' },
      'PROPOSAL_SENT': { bg: 'bg-indigo-100', text: 'text-indigo-800', border: 'border-indigo-300' },
      'NEGOTIATION': { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-300' },
      'CLOSED_WON': { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-300' },
      'CLOSED_LOST': { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300' }
    }
    return colors[stage] || { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-300' }
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        <span className="ml-3 text-gray-600">Loading pipeline...</span>
      </div>
    )
  }

  if (!pipelineData) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500">No pipeline data available</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Pipeline Overview */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Lead Pipeline Visualization</h3>
            <p className="text-gray-600 text-sm">Track leads through each stage of your sales process</p>
          </div>
          
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
              <span className="text-gray-600">Total Value: {formatCurrency(pipelineData.totalValue)}</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
              <span className="text-gray-600">Weighted: {formatCurrency(pipelineData.weightedValue)}</span>
            </div>
          </div>
        </div>

        {/* Pipeline Funnel */}
        <div className="relative">
          <div className="flex items-center justify-between mb-8">
            {pipelineData.stages.map((stage, index) => {
              const colors = getStageColor(stage.stage)
              const isSelected = selectedStage === stage.stage
              const maxCount = Math.max(...pipelineData.stages.map(s => s.count))
              const width = Math.max((stage.count / maxCount) * 100, 10)
              
              return (
                <div key={stage.stage} className="flex-1 mx-1">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`relative cursor-pointer transition-all duration-200 ${
                      isSelected ? 'transform scale-105' : ''
                    }`}
                    onClick={() => setSelectedStage(isSelected ? null : stage.stage)}
                  >
                    {/* Stage Bar */}
                    <div 
                      className={`${colors.bg} ${colors.border} border-2 rounded-lg p-4 text-center ${
                        isSelected ? 'ring-2 ring-primary-500' : ''
                      }`}
                      style={{ minHeight: `${Math.max(width * 2, 80)}px` }}
                    >
                      <div className={`text-xs font-semibold ${colors.text} mb-2`}>
                        {stage.stage.replace('_', ' ')}
                      </div>
                      <div className="text-2xl font-bold text-gray-900 mb-1">
                        {formatNumber(stage.count)}
                      </div>
                      <div className="text-xs text-gray-600">
                        {stage.percentage.toFixed(1)}%
                      </div>
                      <div className="text-xs text-gray-500 mt-2">
                        {formatCurrency(stage.value)}
                      </div>
                    </div>

                    {/* Conversion Rate */}
                    {index < pipelineData.stages.length - 1 && (
                      <div className="absolute -right-4 top-1/2 transform -translate-y-1/2 z-10">
                        <div className="bg-white border border-gray-300 rounded-full p-2 shadow-sm">
                          <ArrowRight className="w-4 h-4 text-gray-600" />
                        </div>
                        <div className="absolute top-full mt-1 left-1/2 transform -translate-x-1/2 text-xs text-gray-600 whitespace-nowrap">
                          {stage.conversionRate.toFixed(1)}%
                        </div>
                      </div>
                    )}

                    {/* Time in Stage */}
                    {stage.averageTimeInStage > 0 && (
                      <div className="absolute -top-2 -right-2">
                        <div className={`bg-white border rounded-full p-1 text-xs ${
                          stage.averageTimeInStage > 7 ? 'text-red-600 border-red-300' : 'text-gray-600 border-gray-300'
                        }`}>
                          <Clock className="w-3 h-3" />
                        </div>
                        <div className="absolute top-full mt-1 left-1/2 transform -translate-x-1/2 text-xs text-gray-600 whitespace-nowrap">
                          {stage.averageTimeInStage.toFixed(1)}d
                        </div>
                      </div>
                    )}
                  </motion.div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Stage Details */}
        {selectedStage && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-6 p-4 bg-gray-50 rounded-lg"
          >
            {(() => {
              const stage = pipelineData.stages.find(s => s.stage === selectedStage)
              if (!stage) return null
              
              return (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">{formatNumber(stage.count)}</div>
                    <div className="text-sm text-gray-600">Total Leads</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">{stage.percentage.toFixed(1)}%</div>
                    <div className="text-sm text-gray-600">Of Pipeline</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">{stage.averageTimeInStage.toFixed(1)}</div>
                    <div className="text-sm text-gray-600">Avg Days</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">{formatCurrency(stage.value)}</div>
                    <div className="text-sm text-gray-600">Total Value</div>
                  </div>
                </div>
              )
            })()}
          </motion.div>
        )}
      </div>

      {/* Pipeline Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Target className="w-8 h-8 text-blue-500 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Pipeline Velocity</p>
                <p className="text-2xl font-bold text-gray-900">{pipelineData.velocity.toFixed(1)}</p>
              </div>
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-600">
            Leads moving through pipeline per day
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
              <Award className="w-8 h-8 text-green-500 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Conversion Rate</p>
                <p className="text-2xl font-bold text-gray-900">
                  {pipelineData.stages.length > 0 
                    ? ((pipelineData.stages.find(s => s.stage === 'CLOSED_WON')?.count || 0) / pipelineData.stages[0].count * 100).toFixed(1)
                    : 0}%
                </p>
              </div>
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-600">
            Overall pipeline conversion rate
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
              <Activity className="w-8 h-8 text-purple-500 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Active Stages</p>
                <p className="text-2xl font-bold text-gray-900">
                  {pipelineData.stages.filter(s => s.count > 0 && !['CLOSED_WON', 'CLOSED_LOST'].includes(s.stage)).length}
                </p>
              </div>
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-600">
            Stages with active leads
          </div>
        </motion.div>
      </div>

      {/* Bottlenecks and Recommendations */}
      {pipelineData.bottlenecks.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
        >
          <div className="flex items-center mb-4">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Pipeline Bottlenecks</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pipelineData.bottlenecks.map((bottleneck, index) => (
              <div key={index} className="flex items-start p-4 bg-yellow-50 rounded-lg">
                <Clock className="w-5 h-5 text-yellow-600 mr-3 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-yellow-800">{bottleneck}</p>
                  <p className="text-xs text-yellow-600 mt-1">
                    Consider reviewing processes for this stage
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center mb-2">
              <CheckCircle className="w-5 h-5 text-blue-600 mr-2" />
              <h4 className="font-medium text-blue-800">Recommendations</h4>
            </div>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Set up automated follow-up reminders for stages with long durations</li>
              <li>• Review qualification criteria to improve lead quality</li>
              <li>• Implement stage-specific training for team members</li>
              <li>• Consider splitting complex stages into smaller steps</li>
            </ul>
          </div>
        </motion.div>
      )}
    </div>
  )
}