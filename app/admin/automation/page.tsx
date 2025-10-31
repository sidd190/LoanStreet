'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import RouteProtection from '../../components/RouteProtection'
import { 
  Calendar, 
  Clock, 
  Play, 
  Pause, 
  Plus,
  Settings,
  Target,
  MessageSquare,
  Users,
  BarChart3,
  Edit,
  Trash2,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Activity,
  Eye,
  Zap
} from 'lucide-react'
import AdminLayout from '../components/AdminLayout'
import toast from 'react-hot-toast'
import DataService, { AutomationRule } from '../../../lib/dataService'
import AutomationRuleBuilder, { AutomationWorkflow } from './components/AutomationRuleBuilder'
import AutomationMonitoring from './components/AutomationMonitoring'

function AutomationPageContent() {
  const [automations, setAutomations] = useState<AutomationRule[]>([])
  const [loading, setLoading] = useState(true)

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedAutomation, setSelectedAutomation] = useState<AutomationRule | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showRuleBuilder, setShowRuleBuilder] = useState(false)
  const [editingWorkflow, setEditingWorkflow] = useState<AutomationWorkflow | null>(null)
  const [executions, setExecutions] = useState<any[]>([])
  const [showExecutions, setShowExecutions] = useState(false)
  const [showMonitoring, setShowMonitoring] = useState(false)
  const [monitoringAutomationId, setMonitoringAutomationId] = useState<string | null>(null)

  useEffect(() => {
    loadAutomations()
    loadExecutions()
  }, [])

  const loadExecutions = async () => {
    try {
      const response = await fetch('/api/automations/executions')
      const data = await response.json()
      if (data.success) {
        setExecutions(data.executions)
      }
    } catch (error) {
      console.error('Failed to load executions:', error)
    }
  }

  const loadAutomations = async () => {
    try {
      setLoading(true)
      const data = await DataService.getAutomations()
      setAutomations(data)
    } catch (error) {
      toast.error('Failed to load automations')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'paused':
        return 'bg-yellow-100 text-yellow-800'
      case 'draft':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'campaign':
        return Target
      case 'followup':
        return MessageSquare
      case 'data_processing':
        return BarChart3
      default:
        return Settings
    }
  }

  const toggleAutomationStatus = async (id: string, currentStatus: string) => {
    setIsLoading(true)
    try {
      const newStatus = currentStatus === 'active' ? 'paused' : 'active'
      
      await DataService.toggleAutomation(id, newStatus === 'active')
      
      setAutomations(prev => 
        prev.map(automation => 
          automation.id === id 
            ? { ...automation, status: newStatus as any }
            : automation
        )
      )
      
      toast.success(`Automation ${newStatus === 'active' ? 'activated' : 'paused'}`)
    } catch (error) {
      toast.error('Failed to update automation status')
    } finally {
      setIsLoading(false)
    }
  }

  const deleteAutomation = async (id: string) => {
    if (!confirm('Are you sure you want to delete this automation?')) return
    
    setIsLoading(true)
    try {
      // In real implementation, this would call DataService.deleteAutomation(id)
      setAutomations(prev => prev.filter(automation => automation.id !== id))
      toast.success('Automation deleted successfully')
    } catch (error) {
      toast.error('Failed to delete automation')
    } finally {
      setIsLoading(false)
    }
  }

  const runAutomationNow = async (id: string) => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/automations/${id}/execute`, {
        method: 'POST'
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast.success(`Automation execution started (ID: ${data.executionId})`)
        loadExecutions() // Refresh executions list
        loadAutomations() // Refresh automations to update stats
      } else {
        throw new Error(data.error || 'Failed to execute automation')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to run automation')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveWorkflow = async (workflow: AutomationWorkflow) => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/automations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: workflow.name,
          description: workflow.description,
          status: workflow.isActive ? 'active' : 'draft',
          trigger: workflow.trigger,
          conditions: workflow.conditions,
          actions: workflow.actions
        })
      })

      const data = await response.json()
      
      if (data.success) {
        toast.success('Automation rule saved successfully')
        setShowRuleBuilder(false)
        setEditingWorkflow(null)
        loadAutomations()
      } else {
        throw new Error(data.error || 'Failed to save automation')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save automation')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePreviewWorkflow = (workflow: AutomationWorkflow) => {
    // Preview functionality - could show a modal with workflow visualization
    console.log('Preview workflow:', workflow)
  }

  const editAutomation = (automation: AutomationRule) => {
    // Convert AutomationRule to AutomationWorkflow format
    const workflow: AutomationWorkflow = {
      id: automation.id,
      name: automation.name,
      description: automation.description,
      trigger: {
        type: 'time' // Default, should be parsed from automation.schedule
      } as any,
      conditions: [], // Should be parsed from automation conditions
      actions: [], // Should be parsed from automation actions
      isActive: automation.status === 'active'
    }
    
    setEditingWorkflow(workflow)
    setShowRuleBuilder(true)
  }

  const formatNextRun = (nextRun: string) => {
    const date = new Date(nextRun)
    const now = new Date()
    const diffMs = date.getTime() - now.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMins < 60) {
      return `in ${diffMins} minutes`
    } else if (diffHours < 24) {
      return `in ${diffHours} hours`
    } else {
      return `in ${diffDays} days`
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Automation & Workflows</h1>
            <p className="text-gray-600 mt-1">
              Automate your marketing campaigns, follow-ups, and data processing tasks
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowExecutions(!showExecutions)}
              className="btn-secondary flex items-center"
            >
              <Activity className="w-5 h-5 mr-2" />
              {showExecutions ? 'Hide' : 'Show'} Executions
            </button>
            <button
              onClick={() => setShowMonitoring(true)}
              className="btn-secondary flex items-center"
            >
              <BarChart3 className="w-5 h-5 mr-2" />
              Monitoring
            </button>
            <button
              onClick={() => setShowRuleBuilder(true)}
              className="btn-primary flex items-center"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create Automation
            </button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
          >
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mr-4">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Active Automations</p>
                <p className="text-2xl font-bold text-gray-900">
                  {automations.filter(a => a.status === 'active').length}
                </p>
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
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mr-4">
                <RefreshCw className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total Executions</p>
                <p className="text-2xl font-bold text-gray-900">
                  {automations.reduce((sum, a) => sum + a.stats.totalRuns, 0).toLocaleString()}
                </p>
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
                <BarChart3 className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Success Rate</p>
                <p className="text-2xl font-bold text-gray-900">
                  {Math.round(
                    (automations.reduce((sum, a) => sum + a.stats.successfulRuns, 0) /
                     automations.reduce((sum, a) => sum + a.stats.totalRuns, 0)) * 100
                  )}%
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
                <Clock className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Next Execution</p>
                <p className="text-sm font-bold text-gray-900">
                  {automations
                    .filter(a => a.status === 'active' && a.stats.nextRun)
                    .sort((a, b) => new Date(a.stats.nextRun!).getTime() - new Date(b.stats.nextRun!).getTime())[0]
                    ?.stats.nextRun 
                    ? formatNextRun(automations
                        .filter(a => a.status === 'active' && a.stats.nextRun)
                        .sort((a, b) => new Date(a.stats.nextRun!).getTime() - new Date(b.stats.nextRun!).getTime())[0]
                        .stats.nextRun!)
                    : 'None scheduled'
                  }
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Automations List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-xl shadow-sm border border-gray-100"
        >
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Automation Rules</h2>
          </div>

          <div className="divide-y divide-gray-200">
            {automations.map((automation, index) => {
              const TypeIcon = getTypeIcon(automation.type)
              
              return (
                <motion.div
                  key={automation.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="p-6 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
                        <TypeIcon className="w-6 h-6 text-primary-600" />
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {automation.name}
                          </h3>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(automation.status)}`}>
                            {automation.status}
                          </span>
                        </div>
                        
                        <p className="text-gray-600 mb-3">{automation.description}</p>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-gray-500">Schedule</p>
                            <p className="font-medium">
                              {automation.schedule.frequency === 'custom' 
                                ? 'Every 5 minutes' 
                                : `${automation.schedule.frequency} at ${automation.schedule.time}`
                              }
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500">Total Runs</p>
                            <p className="font-medium">{automation.stats.totalRuns.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Success Rate</p>
                            <p className="font-medium">
                              {Math.round((automation.stats.successfulRuns / automation.stats.totalRuns) * 100)}%
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500">Next Run</p>
                            <p className="font-medium">
                              {automation.stats.nextRun 
                                ? formatNextRun(automation.stats.nextRun)
                                : 'Not scheduled'
                              }
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => runAutomationNow(automation.id)}
                        disabled={isLoading}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Run Now"
                      >
                        <Play className="w-5 h-5" />
                      </button>

                      <button
                        onClick={() => {
                          setMonitoringAutomationId(automation.id)
                          setShowMonitoring(true)
                        }}
                        className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                        title="View Monitoring"
                      >
                        <BarChart3 className="w-5 h-5" />
                      </button>
                      
                      <button
                        onClick={() => toggleAutomationStatus(automation.id, automation.status)}
                        disabled={isLoading}
                        className={`p-2 rounded-lg transition-colors ${
                          automation.status === 'active'
                            ? 'text-yellow-600 hover:bg-yellow-50'
                            : 'text-green-600 hover:bg-green-50'
                        }`}
                        title={automation.status === 'active' ? 'Pause' : 'Activate'}
                      >
                        {automation.status === 'active' ? (
                          <Pause className="w-5 h-5" />
                        ) : (
                          <Play className="w-5 h-5" />
                        )}
                      </button>
                      
                      <button
                        onClick={() => editAutomation(automation)}
                        className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      
                      <button
                        onClick={() => deleteAutomation(automation.id)}
                        disabled={isLoading}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </motion.div>

        {/* Executions Panel */}
        <AnimatePresence>
          {showExecutions && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-white rounded-xl shadow-sm border border-gray-100"
            >
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900">Recent Executions</h2>
                  <button
                    onClick={loadExecutions}
                    className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <RefreshCw className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="divide-y divide-gray-200">
                {executions.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    No recent executions
                  </div>
                ) : (
                  executions.map((execution, index) => (
                    <div key={execution.id} className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className={`w-3 h-3 rounded-full ${
                            execution.status === 'COMPLETED' ? 'bg-green-500' :
                            execution.status === 'RUNNING' ? 'bg-blue-500' :
                            execution.status === 'FAILED' ? 'bg-red-500' :
                            'bg-yellow-500'
                          }`} />
                          <div>
                            <p className="font-medium text-gray-900">
                              Execution {execution.id}
                            </p>
                            <p className="text-sm text-gray-600">
                              {execution.status} • {execution.successCount}/{execution.targetCount} successful
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600">
                            {new Date(execution.startedAt).toLocaleString()}
                          </p>
                          {execution.completedAt && (
                            <p className="text-xs text-gray-500">
                              Duration: {Math.round((new Date(execution.completedAt).getTime() - new Date(execution.startedAt).getTime()) / 1000)}s
                            </p>
                          )}
                        </div>
                      </div>
                      
                      {execution.errors.length > 0 && (
                        <div className="mt-3 p-3 bg-red-50 rounded-lg">
                          <p className="text-sm text-red-800">
                            {execution.errors.length} error(s) occurred
                          </p>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quick Templates */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
        >
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Quick Templates</h2>
          
          <div className="grid md:grid-cols-3 gap-4">
            <div 
              onClick={() => {
                const welcomeWorkflow: AutomationWorkflow = {
                  id: '',
                  name: 'Welcome Series',
                  description: 'Automated welcome messages for new leads',
                  trigger: {
                    type: 'event'
                  } as any,
                  conditions: [],
                  actions: [
                    {
                      type: 'send_message',
                      config: {
                        messageTemplate: 'Hi {name}, welcome! Thank you for your interest in our {loanType} loan.',
                        messageType: 'WHATSAPP'
                      }
                    }
                  ],
                  isActive: false
                }
                setEditingWorkflow(welcomeWorkflow)
                setShowRuleBuilder(true)
              }}
              className="border border-gray-200 rounded-lg p-4 hover:border-primary-300 cursor-pointer transition-colors"
            >
              <div className="flex items-center mb-3">
                <MessageSquare className="w-6 h-6 text-blue-600 mr-2" />
                <h3 className="font-medium">Welcome Series</h3>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                Automated welcome messages for new leads with follow-up sequence
              </p>
              <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                Use Template
              </button>
            </div>
            
            <div 
              onClick={() => {
                const reengagementWorkflow: AutomationWorkflow = {
                  id: '',
                  name: 'Re-engagement Campaign',
                  description: 'Win back inactive leads',
                  trigger: {
                    type: 'time'
                  } as any,
                  conditions: [
                    {
                      field: 'lastContact',
                      operator: 'less_than',
                      value: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
                    }
                  ],
                  actions: [
                    {
                      type: 'send_message',
                      config: {
                        messageTemplate: 'Hi {name}, we noticed you haven\'t been in touch. Let us help you with your {loanType} loan!',
                        messageType: 'WHATSAPP'
                      }
                    }
                  ],
                  isActive: false
                }
                setEditingWorkflow(reengagementWorkflow)
                setShowRuleBuilder(true)
              }}
              className="border border-gray-200 rounded-lg p-4 hover:border-primary-300 cursor-pointer transition-colors"
            >
              <div className="flex items-center mb-3">
                <Target className="w-6 h-6 text-green-600 mr-2" />
                <h3 className="font-medium">Re-engagement Campaign</h3>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                Win back inactive leads with personalized offers and messages
              </p>
              <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                Use Template
              </button>
            </div>
            
            <div 
              onClick={() => {
                const leadScoringWorkflow: AutomationWorkflow = {
                  id: '',
                  name: 'Lead Scoring Automation',
                  description: 'Automatically score and prioritize leads',
                  trigger: {
                    type: 'event'
                  } as any,
                  conditions: [],
                  actions: [
                    {
                      type: 'update_tags',
                      config: {
                        tags: ['engaged', 'high-priority']
                      }
                    },
                    {
                      type: 'update_lead_status',
                      config: {
                        newStatus: 'QUALIFIED'
                      }
                    }
                  ],
                  isActive: false
                }
                setEditingWorkflow(leadScoringWorkflow)
                setShowRuleBuilder(true)
              }}
              className="border border-gray-200 rounded-lg p-4 hover:border-primary-300 cursor-pointer transition-colors"
            >
              <div className="flex items-center mb-3">
                <BarChart3 className="w-6 h-6 text-purple-600 mr-2" />
                <h3 className="font-medium">Lead Scoring</h3>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                Automatically score and prioritize leads based on engagement
              </p>
              <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                Use Template
              </button>
            </div>
          </div>
        </motion.div>

        {/* Automation Rule Builder Modal */}
        <AnimatePresence>
          {showRuleBuilder && (
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
                className="w-full max-w-7xl max-h-[95vh] overflow-y-auto"
              >
                <AutomationRuleBuilder
                  workflow={editingWorkflow || undefined}
                  onSave={handleSaveWorkflow}
                  onCancel={() => {
                    setShowRuleBuilder(false)
                    setEditingWorkflow(null)
                  }}
                  onPreview={handlePreviewWorkflow}
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Automation Monitoring Modal */}
        <AnimatePresence>
          {showMonitoring && (
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
                className="w-full max-w-7xl max-h-[95vh] overflow-y-auto bg-white rounded-xl"
              >
                <AutomationMonitoring
                  automationId={monitoringAutomationId || undefined}
                  onClose={() => {
                    setShowMonitoring(false)
                    setMonitoringAutomationId(null)
                  }}
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AdminLayout>
  )
}

export default function AutomationPage() {
  return (
    <RouteProtection requiredRole="ADMIN">
      <AutomationPageContent />
    </RouteProtection>
  )
}