'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Activity, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Pause,
  Play,
  RefreshCw,
  Eye,
  Download,
  Filter,
  Search,
  Calendar,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Zap
} from 'lucide-react'

interface AutomationExecution {
  id: string
  automationId: string
  automationName: string
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'
  startedAt: Date
  completedAt?: Date
  targetCount: number
  successCount: number
  failureCount: number
  errors: AutomationError[]
  logs: AutomationLog[]
  triggerType: 'time_based' | 'event_based'
  triggerData?: any
}

interface AutomationError {
  step: string
  targetId?: string
  error: string
  timestamp: Date
  retryCount: number
}

interface AutomationLog {
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG'
  message: string
  timestamp: Date
  metadata?: Record<string, any>
}

interface AutomationStats {
  totalExecutions: number
  runningExecutions: number
  completedExecutions: number
  failedExecutions: number
  averageExecutionTime: number
  successRate: number
  totalTargetsProcessed: number
  totalErrors: number
}

interface AutomationMonitoringProps {
  automationId?: string // If provided, show monitoring for specific automation
  onClose?: () => void
}

export default function AutomationMonitoring({ automationId, onClose }: AutomationMonitoringProps) {
  const [executions, setExecutions] = useState<AutomationExecution[]>([])
  const [stats, setStats] = useState<AutomationStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedExecution, setSelectedExecution] = useState<AutomationExecution | null>(null)
  const [filter, setFilter] = useState<'all' | 'running' | 'completed' | 'failed'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'all'>('week')
  const [autoRefresh, setAutoRefresh] = useState(true)

  useEffect(() => {
    loadExecutions()
    loadStats()

    // Auto-refresh every 30 seconds if enabled
    let interval: NodeJS.Timeout | null = null
    if (autoRefresh) {
      interval = setInterval(() => {
        loadExecutions()
        loadStats()
      }, 30000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [automationId, filter, dateRange, autoRefresh])

  const loadExecutions = async () => {
    try {
      const url = automationId 
        ? `/api/automations/${automationId}/executions`
        : '/api/automations/executions'
      
      const params = new URLSearchParams()
      if (filter !== 'all') params.append('status', filter.toUpperCase())
      if (dateRange !== 'all') params.append('dateRange', dateRange)
      if (searchTerm) params.append('search', searchTerm)

      const response = await fetch(`${url}?${params}`)
      const data = await response.json()
      
      if (data.success) {
        setExecutions(data.executions.map((exec: any) => ({
          ...exec,
          startedAt: new Date(exec.startedAt),
          completedAt: exec.completedAt ? new Date(exec.completedAt) : undefined,
          errors: exec.errors.map((error: any) => ({
            ...error,
            timestamp: new Date(error.timestamp)
          })),
          logs: exec.logs.map((log: any) => ({
            ...log,
            timestamp: new Date(log.timestamp)
          }))
        })))
      }
    } catch (error) {
      console.error('Failed to load executions:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const url = automationId 
        ? `/api/automations/${automationId}/stats`
        : '/api/automations/stats'
      
      const response = await fetch(url)
      const data = await response.json()
      
      if (data.success) {
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Failed to load stats:', error)
    }
  }

  const cancelExecution = async (executionId: string) => {
    try {
      const response = await fetch(`/api/automations/executions/${executionId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        loadExecutions()
      }
    } catch (error) {
      console.error('Failed to cancel execution:', error)
    }
  }

  const exportExecutions = async () => {
    try {
      const params = new URLSearchParams()
      if (filter !== 'all') params.append('status', filter.toUpperCase())
      if (dateRange !== 'all') params.append('dateRange', dateRange)
      if (searchTerm) params.append('search', searchTerm)
      params.append('format', 'csv')

      const url = automationId 
        ? `/api/automations/${automationId}/executions/export?${params}`
        : `/api/automations/executions/export?${params}`
      
      const response = await fetch(url)
      const blob = await response.blob()
      
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = `automation-executions-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(downloadUrl)
    } catch (error) {
      console.error('Failed to export executions:', error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'text-green-600 bg-green-100'
      case 'RUNNING':
        return 'text-blue-600 bg-blue-100'
      case 'FAILED':
        return 'text-red-600 bg-red-100'
      case 'CANCELLED':
        return 'text-yellow-600 bg-yellow-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return CheckCircle
      case 'RUNNING':
        return Activity
      case 'FAILED':
        return XCircle
      case 'CANCELLED':
        return Pause
      default:
        return Clock
    }
  }

  const formatDuration = (startedAt: Date, completedAt?: Date) => {
    const end = completedAt || new Date()
    const duration = end.getTime() - startedAt.getTime()
    const seconds = Math.floor(duration / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`
    } else {
      return `${seconds}s`
    }
  }

  const filteredExecutions = executions.filter(execution => {
    if (filter !== 'all' && execution.status.toLowerCase() !== filter) {
      return false
    }
    
    if (searchTerm && !execution.automationName.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false
    }

    return true
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {automationId ? 'Automation Monitoring' : 'Execution Monitoring'}
          </h2>
          <p className="text-gray-600 mt-1">
            Monitor automation executions, performance, and errors
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`p-2 rounded-lg transition-colors ${
              autoRefresh 
                ? 'bg-green-100 text-green-600' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            title={autoRefresh ? 'Auto-refresh enabled' : 'Auto-refresh disabled'}
          >
            <RefreshCw className={`w-5 h-5 ${autoRefresh ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={exportExecutions}
            className="btn-secondary flex items-center"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="btn-ghost"
            >
              Close
            </button>
          )}
        </div>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
          >
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mr-4">
                <Activity className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total Executions</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalExecutions}</p>
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
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mr-4">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Success Rate</p>
                <p className="text-2xl font-bold text-gray-900">{stats.successRate.toFixed(1)}%</p>
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
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mr-4">
                <Clock className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Duration</p>
                <p className="text-2xl font-bold text-gray-900">
                  {Math.round(stats.averageExecutionTime / 1000)}s
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
            <div className="flex items-center">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mr-4">
                <AlertTriangle className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total Errors</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalErrors}</p>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">Status:</span>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All</option>
              <option value="running">Running</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">Period:</span>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as any)}
              className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
            >
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="all">All Time</option>
            </select>
          </div>

          <div className="flex items-center space-x-2 flex-1 max-w-md">
            <Search className="w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search automations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>
      </div>

      {/* Executions List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Recent Executions ({filteredExecutions.length})
          </h3>
        </div>

        <div className="divide-y divide-gray-200">
          {loading ? (
            <div className="p-6 text-center">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-gray-400" />
              <p className="text-gray-600">Loading executions...</p>
            </div>
          ) : filteredExecutions.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No executions found matching your criteria
            </div>
          ) : (
            filteredExecutions.map((execution, index) => {
              const StatusIcon = getStatusIcon(execution.status)
              
              return (
                <motion.div
                  key={execution.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-6 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-start space-x-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${getStatusColor(execution.status)}`}>
                        <StatusIcon className="w-5 h-5" />
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h4 className="text-lg font-semibold text-gray-900">
                            {execution.automationName}
                          </h4>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(execution.status)}`}>
                            {execution.status}
                          </span>
                          <span className="text-xs text-gray-500">
                            {execution.triggerType === 'time_based' ? '⏰ Scheduled' : '🎯 Event-based'}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                          <div>
                            <p className="text-gray-500">Started</p>
                            <p className="font-medium">
                              {execution.startedAt.toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500">Duration</p>
                            <p className="font-medium">
                              {formatDuration(execution.startedAt, execution.completedAt)}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500">Targets</p>
                            <p className="font-medium">{execution.targetCount}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Success</p>
                            <p className="font-medium text-green-600">{execution.successCount}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Errors</p>
                            <p className="font-medium text-red-600">{execution.failureCount}</p>
                          </div>
                        </div>

                        {execution.errors.length > 0 && (
                          <div className="mt-3 p-3 bg-red-50 rounded-lg">
                            <p className="text-sm text-red-800">
                              {execution.errors.length} error(s) occurred
                            </p>
                            <p className="text-xs text-red-600 mt-1">
                              Latest: {execution.errors[execution.errors.length - 1]?.error}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setSelectedExecution(execution)}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                      
                      {execution.status === 'RUNNING' && (
                        <button
                          onClick={() => cancelExecution(execution.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Cancel Execution"
                        >
                          <Pause className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              )
            })
          )}
        </div>
      </div>

      {/* Execution Details Modal */}
      <AnimatePresence>
        {selectedExecution && (
          <ExecutionDetailsModal
            execution={selectedExecution}
            onClose={() => setSelectedExecution(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// Execution Details Modal Component
function ExecutionDetailsModal({
  execution,
  onClose
}: {
  execution: AutomationExecution
  onClose: () => void
}) {
  const [activeTab, setActiveTab] = useState<'overview' | 'logs' | 'errors'>('overview')

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
      >
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Execution Details</h2>
              <p className="text-gray-600">{execution.automationName}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
            >
              ✕
            </button>
          </div>

          {/* Tabs */}
          <div className="flex space-x-6 mt-4">
            {[
              { key: 'overview', label: 'Overview' },
              { key: 'logs', label: `Logs (${execution.logs.length})` },
              { key: 'errors', label: `Errors (${execution.errors.length})` }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`pb-2 border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {activeTab === 'overview' && (
            <ExecutionOverview execution={execution} />
          )}
          
          {activeTab === 'logs' && (
            <ExecutionLogs logs={execution.logs} />
          )}
          
          {activeTab === 'errors' && (
            <ExecutionErrors errors={execution.errors} />
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

// Execution Overview Component
function ExecutionOverview({ execution }: { execution: AutomationExecution }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-900">Execution Info</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Execution ID:</span>
              <span className="font-mono text-sm">{execution.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Status:</span>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                execution.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                execution.status === 'RUNNING' ? 'bg-blue-100 text-blue-800' :
                execution.status === 'FAILED' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {execution.status}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Trigger Type:</span>
              <span>{execution.triggerType === 'time_based' ? 'Time-based' : 'Event-based'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Started:</span>
              <span>{execution.startedAt.toLocaleString()}</span>
            </div>
            {execution.completedAt && (
              <div className="flex justify-between">
                <span className="text-gray-600">Completed:</span>
                <span>{execution.completedAt.toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="font-semibold text-gray-900">Performance</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Targets:</span>
              <span className="font-medium">{execution.targetCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Successful:</span>
              <span className="font-medium text-green-600">{execution.successCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Failed:</span>
              <span className="font-medium text-red-600">{execution.failureCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Success Rate:</span>
              <span className="font-medium">
                {execution.targetCount > 0 
                  ? ((execution.successCount / execution.targetCount) * 100).toFixed(1)
                  : 0
                }%
              </span>
            </div>
          </div>
        </div>
      </div>

      {execution.triggerData && (
        <div>
          <h3 className="font-semibold text-gray-900 mb-2">Trigger Data</h3>
          <pre className="bg-gray-50 p-4 rounded-lg text-sm overflow-x-auto">
            {JSON.stringify(execution.triggerData, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}

// Execution Logs Component
function ExecutionLogs({ logs }: { logs: AutomationLog[] }) {
  const getLevelColor = (level: string) => {
    switch (level) {
      case 'ERROR':
        return 'text-red-600 bg-red-50'
      case 'WARN':
        return 'text-yellow-600 bg-yellow-50'
      case 'INFO':
        return 'text-blue-600 bg-blue-50'
      case 'DEBUG':
        return 'text-gray-600 bg-gray-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  return (
    <div className="space-y-2">
      {logs.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No logs available</p>
      ) : (
        logs.map((log, index) => (
          <div key={index} className="border border-gray-200 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className={`px-2 py-1 text-xs font-medium rounded ${getLevelColor(log.level)}`}>
                {log.level}
              </span>
              <span className="text-xs text-gray-500">
                {log.timestamp.toLocaleString()}
              </span>
            </div>
            <p className="text-sm text-gray-900">{log.message}</p>
            {log.metadata && (
              <pre className="mt-2 text-xs text-gray-600 bg-gray-50 p-2 rounded overflow-x-auto">
                {JSON.stringify(log.metadata, null, 2)}
              </pre>
            )}
          </div>
        ))
      )}
    </div>
  )
}

// Execution Errors Component
function ExecutionErrors({ errors }: { errors: AutomationError[] }) {
  return (
    <div className="space-y-3">
      {errors.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No errors occurred</p>
      ) : (
        errors.map((error, index) => (
          <div key={index} className="border border-red-200 rounded-lg p-4 bg-red-50">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-red-900">
                Step: {error.step}
              </span>
              <span className="text-sm text-red-600">
                {error.timestamp.toLocaleString()}
              </span>
            </div>
            {error.targetId && (
              <p className="text-sm text-red-700 mb-2">
                Target ID: {error.targetId}
              </p>
            )}
            <p className="text-sm text-red-800">{error.error}</p>
            {error.retryCount > 0 && (
              <p className="text-xs text-red-600 mt-2">
                Retried {error.retryCount} time(s)
              </p>
            )}
          </div>
        ))
      )}
    </div>
  )
}