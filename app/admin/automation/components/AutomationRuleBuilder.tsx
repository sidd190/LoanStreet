'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Plus, 
  X, 
  Clock, 
  Calendar, 
  MessageSquare, 
  Users, 
  Target, 
  Settings,
  Play,
  Save,
  Eye,
  ChevronDown,
  ChevronRight,
  Zap,
  Filter,
  ArrowRight
} from 'lucide-react'

export interface TriggerConfig {
  type: 'time' | 'event'
  timeConfig?: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'custom'
    time?: string
    days?: number[]
    cronExpression?: string
  }
  eventConfig?: {
    event: 'new_lead' | 'message_received' | 'campaign_completed' | 'lead_status_changed'
    conditions?: Record<string, any>
  }
}

export interface ConditionConfig {
  field: string
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'not_in'
  value: any
  logicalOperator?: 'AND' | 'OR'
}

export interface ActionConfig {
  type: 'send_message' | 'update_lead_status' | 'assign_lead' | 'create_task' | 'update_tags' | 'wait'
  config: Record<string, any>
  delay?: number // in minutes
}

export interface AutomationWorkflow {
  id: string
  name: string
  description?: string
  trigger: TriggerConfig
  conditions: ConditionConfig[]
  actions: ActionConfig[]
  isActive: boolean
}

interface AutomationRuleBuilderProps {
  workflow?: AutomationWorkflow
  onSave: (workflow: AutomationWorkflow) => void
  onCancel: () => void
  onPreview: (workflow: AutomationWorkflow) => void
}

export default function AutomationRuleBuilder({ 
  workflow, 
  onSave, 
  onCancel, 
  onPreview 
}: AutomationRuleBuilderProps) {
  const [currentWorkflow, setCurrentWorkflow] = useState<AutomationWorkflow>(
    workflow || {
      id: '',
      name: '',
      description: '',
      trigger: { type: 'time' },
      conditions: [],
      actions: [],
      isActive: false
    }
  )

  const [activeStep, setActiveStep] = useState<'trigger' | 'conditions' | 'actions'>('trigger')
  const [showPreview, setShowPreview] = useState(false)

  const updateWorkflow = useCallback((updates: Partial<AutomationWorkflow>) => {
    setCurrentWorkflow(prev => ({ ...prev, ...updates }))
  }, [])

  const addCondition = () => {
    const newCondition: ConditionConfig = {
      field: 'status',
      operator: 'equals',
      value: '',
      logicalOperator: currentWorkflow.conditions.length > 0 ? 'AND' : undefined
    }
    updateWorkflow({
      conditions: [...currentWorkflow.conditions, newCondition]
    })
  }

  const updateCondition = (index: number, updates: Partial<ConditionConfig>) => {
    const updatedConditions = [...currentWorkflow.conditions]
    updatedConditions[index] = { ...updatedConditions[index], ...updates }
    updateWorkflow({ conditions: updatedConditions })
  }

  const removeCondition = (index: number) => {
    const updatedConditions = currentWorkflow.conditions.filter((_, i) => i !== index)
    updateWorkflow({ conditions: updatedConditions })
  }

  const addAction = (type: ActionConfig['type']) => {
    const newAction: ActionConfig = {
      type,
      config: getDefaultActionConfig(type)
    }
    updateWorkflow({
      actions: [...currentWorkflow.actions, newAction]
    })
  }

  const updateAction = (index: number, updates: Partial<ActionConfig>) => {
    const updatedActions = [...currentWorkflow.actions]
    updatedActions[index] = { ...updatedActions[index], ...updates }
    updateWorkflow({ actions: updatedActions })
  }

  const removeAction = (index: number) => {
    const updatedActions = currentWorkflow.actions.filter((_, i) => i !== index)
    updateWorkflow({ actions: updatedActions })
  }

  const getDefaultActionConfig = (type: ActionConfig['type']): Record<string, any> => {
    switch (type) {
      case 'send_message':
        return { messageTemplate: '', messageType: 'WHATSAPP' }
      case 'update_lead_status':
        return { newStatus: 'CONTACTED' }
      case 'assign_lead':
        return { assignToUserId: '' }
      case 'create_task':
        return { taskTitle: '', taskDescription: '' }
      case 'update_tags':
        return { tags: [] }
      case 'wait':
        return { duration: 60 } // minutes
      default:
        return {}
    }
  }

  const handleSave = () => {
    if (!currentWorkflow.name.trim()) {
      alert('Please enter a workflow name')
      return
    }
    onSave(currentWorkflow)
  }

  const handlePreview = () => {
    setShowPreview(true)
    onPreview(currentWorkflow)
  }

  return (
    <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-lg">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {workflow ? 'Edit Automation Rule' : 'Create Automation Rule'}
            </h2>
            <p className="text-gray-600 mt-1">
              Build automated workflows with triggers, conditions, and actions
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handlePreview}
              className="btn-secondary flex items-center"
            >
              <Eye className="w-4 h-4 mr-2" />
              Preview
            </button>
            <button
              onClick={handleSave}
              className="btn-primary flex items-center"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Rule
            </button>
            <button
              onClick={onCancel}
              className="btn-ghost"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Basic Info */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Workflow Name *
            </label>
            <input
              type="text"
              value={currentWorkflow.name}
              onChange={(e) => updateWorkflow({ name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Enter workflow name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <input
              type="text"
              value={currentWorkflow.description}
              onChange={(e) => updateWorkflow({ description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Describe what this workflow does"
            />
          </div>
        </div>
      </div>

      {/* Step Navigation */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center space-x-8">
          {[
            { key: 'trigger', label: 'Trigger', icon: Zap },
            { key: 'conditions', label: 'Conditions', icon: Filter },
            { key: 'actions', label: 'Actions', icon: Settings }
          ].map(({ key, label, icon: Icon }, index) => (
            <button
              key={key}
              onClick={() => setActiveStep(key as any)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                activeStep === key
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{label}</span>
              {index < 2 && <ArrowRight className="w-4 h-4 ml-2 text-gray-400" />}
            </button>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="p-6">
        <AnimatePresence mode="wait">
          {activeStep === 'trigger' && (
            <TriggerBuilder
              trigger={currentWorkflow.trigger}
              onChange={(trigger) => updateWorkflow({ trigger })}
            />
          )}
          
          {activeStep === 'conditions' && (
            <ConditionsBuilder
              conditions={currentWorkflow.conditions}
              onAdd={addCondition}
              onUpdate={updateCondition}
              onRemove={removeCondition}
            />
          )}
          
          {activeStep === 'actions' && (
            <ActionsBuilder
              actions={currentWorkflow.actions}
              onAdd={addAction}
              onUpdate={updateAction}
              onRemove={removeAction}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Preview Modal */}
      <AnimatePresence>
        {showPreview && (
          <WorkflowPreview
            workflow={currentWorkflow}
            onClose={() => setShowPreview(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// Trigger Builder Component
function TriggerBuilder({ 
  trigger, 
  onChange 
}: { 
  trigger: TriggerConfig
  onChange: (trigger: TriggerConfig) => void 
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          When should this automation run?
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            onClick={() => onChange({ ...trigger, type: 'time' })}
            className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
              trigger.type === 'time'
                ? 'border-primary-500 bg-primary-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center mb-2">
              <Clock className="w-6 h-6 text-primary-600 mr-3" />
              <h4 className="font-medium text-gray-900">Time-based</h4>
            </div>
            <p className="text-sm text-gray-600">
              Run on a schedule (daily, weekly, monthly, or custom)
            </p>
          </div>

          <div
            onClick={() => onChange({ ...trigger, type: 'event' })}
            className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
              trigger.type === 'event'
                ? 'border-primary-500 bg-primary-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center mb-2">
              <Zap className="w-6 h-6 text-primary-600 mr-3" />
              <h4 className="font-medium text-gray-900">Event-based</h4>
            </div>
            <p className="text-sm text-gray-600">
              Run when something happens (new lead, message received, etc.)
            </p>
          </div>
        </div>
      </div>

      {trigger.type === 'time' && (
        <TimeBasedTrigger
          config={trigger.timeConfig || {}}
          onChange={(timeConfig) => onChange({ ...trigger, timeConfig })}
        />
      )}

      {trigger.type === 'event' && (
        <EventBasedTrigger
          config={trigger.eventConfig || {}}
          onChange={(eventConfig) => onChange({ ...trigger, eventConfig })}
        />
      )}
    </motion.div>
  )
}

// Time-based Trigger Component
function TimeBasedTrigger({ 
  config, 
  onChange 
}: { 
  config: any
  onChange: (config: any) => void 
}) {
  return (
    <div className="bg-gray-50 rounded-lg p-4 space-y-4">
      <h4 className="font-medium text-gray-900">Schedule Configuration</h4>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Frequency
          </label>
          <select
            value={config.frequency || 'daily'}
            onChange={(e) => onChange({ ...config, frequency: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="custom">Custom (Cron)</option>
          </select>
        </div>

        {config.frequency !== 'custom' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Time
            </label>
            <input
              type="time"
              value={config.time || '09:00'}
              onChange={(e) => onChange({ ...config, time: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>
        )}

        {config.frequency === 'custom' && (
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cron Expression
            </label>
            <input
              type="text"
              value={config.cronExpression || ''}
              onChange={(e) => onChange({ ...config, cronExpression: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder="0 9 * * * (every day at 9 AM)"
            />
          </div>
        )}
      </div>

      {config.frequency === 'weekly' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Days of Week
          </label>
          <div className="flex flex-wrap gap-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
              <button
                key={day}
                onClick={() => {
                  const days = config.days || []
                  const newDays = days.includes(index)
                    ? days.filter((d: number) => d !== index)
                    : [...days, index]
                  onChange({ ...config, days: newDays })
                }}
                className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                  (config.days || []).includes(index)
                    ? 'bg-primary-100 text-primary-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {day}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Event-based Trigger Component
function EventBasedTrigger({ 
  config, 
  onChange 
}: { 
  config: any
  onChange: (config: any) => void 
}) {
  const eventOptions = [
    { value: 'new_lead', label: 'New Lead Created', icon: Users },
    { value: 'message_received', label: 'Message Received', icon: MessageSquare },
    { value: 'campaign_completed', label: 'Campaign Completed', icon: Target },
    { value: 'lead_status_changed', label: 'Lead Status Changed', icon: Settings }
  ]

  return (
    <div className="bg-gray-50 rounded-lg p-4 space-y-4">
      <h4 className="font-medium text-gray-900">Event Configuration</h4>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Trigger Event
        </label>
        <select
          value={config.event || ''}
          onChange={(e) => onChange({ ...config, event: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
        >
          <option value="">Select an event</option>
          {eventOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {config.event && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Additional Conditions (Optional)
          </label>
          <textarea
            value={JSON.stringify(config.conditions || {}, null, 2)}
            onChange={(e) => {
              try {
                const conditions = JSON.parse(e.target.value)
                onChange({ ...config, conditions })
              } catch {
                // Invalid JSON, ignore
              }
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            rows={3}
            placeholder='{"loanType": "personal", "amount": {"$gt": 10000}}'
          />
        </div>
      )}
    </div>
  )
}

// Conditions Builder Component
function ConditionsBuilder({
  conditions,
  onAdd,
  onUpdate,
  onRemove
}: {
  conditions: ConditionConfig[]
  onAdd: () => void
  onUpdate: (index: number, updates: Partial<ConditionConfig>) => void
  onRemove: (index: number) => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Filter Conditions
          </h3>
          <p className="text-gray-600 mt-1">
            Define who or what this automation should target
          </p>
        </div>
        <button
          onClick={onAdd}
          className="btn-primary flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Condition
        </button>
      </div>

      {conditions.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Filter className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">
            No conditions set. This automation will run for all targets.
          </p>
          <button
            onClick={onAdd}
            className="mt-4 btn-secondary"
          >
            Add First Condition
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {conditions.map((condition, index) => (
            <ConditionRow
              key={index}
              condition={condition}
              index={index}
              showLogicalOperator={index > 0}
              onUpdate={onUpdate}
              onRemove={onRemove}
            />
          ))}
        </div>
      )}
    </motion.div>
  )
}

// Condition Row Component
function ConditionRow({
  condition,
  index,
  showLogicalOperator,
  onUpdate,
  onRemove
}: {
  condition: ConditionConfig
  index: number
  showLogicalOperator: boolean
  onUpdate: (index: number, updates: Partial<ConditionConfig>) => void
  onRemove: (index: number) => void
}) {
  const fieldOptions = [
    { value: 'status', label: 'Lead Status' },
    { value: 'loanType', label: 'Loan Type' },
    { value: 'loanAmount', label: 'Loan Amount' },
    { value: 'source', label: 'Lead Source' },
    { value: 'tags', label: 'Contact Tags' },
    { value: 'createdAt', label: 'Created Date' },
    { value: 'lastContact', label: 'Last Contact Date' }
  ]

  const operatorOptions = [
    { value: 'equals', label: 'equals' },
    { value: 'not_equals', label: 'does not equal' },
    { value: 'contains', label: 'contains' },
    { value: 'greater_than', label: 'greater than' },
    { value: 'less_than', label: 'less than' },
    { value: 'in', label: 'is one of' },
    { value: 'not_in', label: 'is not one of' }
  ]

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      {showLogicalOperator && (
        <div className="mb-4">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onUpdate(index, { logicalOperator: 'AND' })}
              className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                condition.logicalOperator === 'AND'
                  ? 'bg-primary-100 text-primary-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              AND
            </button>
            <button
              onClick={() => onUpdate(index, { logicalOperator: 'OR' })}
              className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                condition.logicalOperator === 'OR'
                  ? 'bg-primary-100 text-primary-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              OR
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Field
          </label>
          <select
            value={condition.field}
            onChange={(e) => onUpdate(index, { field: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          >
            {fieldOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Operator
          </label>
          <select
            value={condition.operator}
            onChange={(e) => onUpdate(index, { operator: e.target.value as any })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          >
            {operatorOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Value
          </label>
          <input
            type="text"
            value={condition.value}
            onChange={(e) => onUpdate(index, { value: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            placeholder="Enter value"
          />
        </div>

        <div>
          <button
            onClick={() => onRemove(index)}
            className="w-full p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 mx-auto" />
          </button>
        </div>
      </div>
    </div>
  )
}

// Actions Builder Component
function ActionsBuilder({
  actions,
  onAdd,
  onUpdate,
  onRemove
}: {
  actions: ActionConfig[]
  onAdd: (type: ActionConfig['type']) => void
  onUpdate: (index: number, updates: Partial<ActionConfig>) => void
  onRemove: (index: number) => void
}) {
  const actionTypes = [
    { type: 'send_message', label: 'Send Message', icon: MessageSquare, color: 'blue' },
    { type: 'update_lead_status', label: 'Update Lead Status', icon: Target, color: 'green' },
    { type: 'assign_lead', label: 'Assign Lead', icon: Users, color: 'purple' },
    { type: 'create_task', label: 'Create Task', icon: Calendar, color: 'orange' },
    { type: 'update_tags', label: 'Update Tags', icon: Settings, color: 'gray' },
    { type: 'wait', label: 'Wait/Delay', icon: Clock, color: 'yellow' }
  ]

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          What should happen?
        </h3>
        <p className="text-gray-600 mb-6">
          Add actions that will be executed when the trigger fires and conditions are met
        </p>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
          {actionTypes.map(({ type, label, icon: Icon, color }) => (
            <button
              key={type}
              onClick={() => onAdd(type)}
              className={`p-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-${color}-300 hover:bg-${color}-50 transition-colors group`}
            >
              <Icon className={`w-6 h-6 text-${color}-600 mx-auto mb-2`} />
              <p className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                {label}
              </p>
            </button>
          ))}
        </div>
      </div>

      {actions.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Settings className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">
            No actions configured. Add actions to define what happens when this automation runs.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {actions.map((action, index) => (
            <ActionRow
              key={index}
              action={action}
              index={index}
              onUpdate={onUpdate}
              onRemove={onRemove}
            />
          ))}
        </div>
      )}
    </motion.div>
  )
}

// Action Row Component
function ActionRow({
  action,
  index,
  onUpdate,
  onRemove
}: {
  action: ActionConfig
  index: number
  onUpdate: (index: number, updates: Partial<ActionConfig>) => void
  onRemove: (index: number) => void
}) {
  const getActionIcon = (type: string) => {
    switch (type) {
      case 'send_message': return MessageSquare
      case 'update_lead_status': return Target
      case 'assign_lead': return Users
      case 'create_task': return Calendar
      case 'update_tags': return Settings
      case 'wait': return Clock
      default: return Settings
    }
  }

  const getActionColor = (type: string) => {
    switch (type) {
      case 'send_message': return 'blue'
      case 'update_lead_status': return 'green'
      case 'assign_lead': return 'purple'
      case 'create_task': return 'orange'
      case 'update_tags': return 'gray'
      case 'wait': return 'yellow'
      default: return 'gray'
    }
  }

  const ActionIcon = getActionIcon(action.type)
  const color = getActionColor(action.type)

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <div className={`w-10 h-10 bg-${color}-100 rounded-lg flex items-center justify-center mr-3`}>
            <ActionIcon className={`w-5 h-5 text-${color}-600`} />
          </div>
          <div>
            <h4 className="font-medium text-gray-900">
              {action.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </h4>
            <p className="text-sm text-gray-600">Step {index + 1}</p>
          </div>
        </div>
        <button
          onClick={() => onRemove(index)}
          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <ActionConfigForm
        action={action}
        onChange={(updates) => onUpdate(index, updates)}
      />
    </div>
  )
}

// Action Config Form Component
function ActionConfigForm({
  action,
  onChange
}: {
  action: ActionConfig
  onChange: (updates: Partial<ActionConfig>) => void
}) {
  const updateConfig = (configUpdates: Record<string, any>) => {
    onChange({
      config: { ...action.config, ...configUpdates }
    })
  }

  switch (action.type) {
    case 'send_message':
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Message Template
            </label>
            <textarea
              value={action.config.messageTemplate || ''}
              onChange={(e) => updateConfig({ messageTemplate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              rows={3}
              placeholder="Hi {name}, thank you for your interest in our {loanType} loan..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Message Type
            </label>
            <select
              value={action.config.messageType || 'WHATSAPP'}
              onChange={(e) => updateConfig({ messageType: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="WHATSAPP">WhatsApp</option>
              <option value="SMS">SMS</option>
            </select>
          </div>
        </div>
      )

    case 'update_lead_status':
      return (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            New Status
          </label>
          <select
            value={action.config.newStatus || ''}
            onChange={(e) => updateConfig({ newStatus: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Select status</option>
            <option value="NEW">New</option>
            <option value="CONTACTED">Contacted</option>
            <option value="QUALIFIED">Qualified</option>
            <option value="PROPOSAL_SENT">Proposal Sent</option>
            <option value="CLOSED_WON">Closed Won</option>
            <option value="CLOSED_LOST">Closed Lost</option>
          </select>
        </div>
      )

    case 'assign_lead':
      return (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Assign To User ID
          </label>
          <input
            type="text"
            value={action.config.assignToUserId || ''}
            onChange={(e) => updateConfig({ assignToUserId: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            placeholder="Enter user ID or email"
          />
        </div>
      )

    case 'create_task':
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Task Title
            </label>
            <input
              type="text"
              value={action.config.taskTitle || ''}
              onChange={(e) => updateConfig({ taskTitle: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder="Follow up with lead"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Task Description
            </label>
            <textarea
              value={action.config.taskDescription || ''}
              onChange={(e) => updateConfig({ taskDescription: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              rows={2}
              placeholder="Detailed description of the task"
            />
          </div>
        </div>
      )

    case 'update_tags':
      return (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tags (comma-separated)
          </label>
          <input
            type="text"
            value={(action.config.tags || []).join(', ')}
            onChange={(e) => updateConfig({ 
              tags: e.target.value.split(',').map(tag => tag.trim()).filter(Boolean)
            })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            placeholder="hot-lead, follow-up-needed, qualified"
          />
        </div>
      )

    case 'wait':
      return (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Wait Duration (minutes)
          </label>
          <input
            type="number"
            value={action.config.duration || 60}
            onChange={(e) => updateConfig({ duration: parseInt(e.target.value) || 60 })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            min="1"
            placeholder="60"
          />
        </div>
      )

    default:
      return (
        <div className="text-gray-500 text-sm">
          No configuration needed for this action type.
        </div>
      )
  }
}

// Workflow Preview Component
function WorkflowPreview({
  workflow,
  onClose
}: {
  workflow: AutomationWorkflow
  onClose: () => void
}) {
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
        className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Workflow Preview</h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="space-y-6">
            {/* Basic Info */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {workflow.name}
              </h3>
              {workflow.description && (
                <p className="text-gray-600">{workflow.description}</p>
              )}
            </div>

            {/* Trigger */}
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Trigger</h4>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center">
                  <Zap className="w-5 h-5 text-blue-600 mr-2" />
                  <span className="text-blue-800">
                    {workflow.trigger.type === 'time' ? 'Time-based' : 'Event-based'} trigger
                  </span>
                </div>
              </div>
            </div>

            {/* Conditions */}
            {workflow.conditions.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Conditions</h4>
                <div className="space-y-2">
                  {workflow.conditions.map((condition, index) => (
                    <div key={index} className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <div className="flex items-center">
                        <Filter className="w-5 h-5 text-yellow-600 mr-2" />
                        <span className="text-yellow-800">
                          {index > 0 && `${condition.logicalOperator} `}
                          {condition.field} {condition.operator} {condition.value}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            {workflow.actions.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Actions</h4>
                <div className="space-y-2">
                  {workflow.actions.map((action, index) => (
                    <div key={index} className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <div className="flex items-center">
                        <Settings className="w-5 h-5 text-green-600 mr-2" />
                        <span className="text-green-800">
                          Step {index + 1}: {action.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-gray-200">
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="btn-secondary"
            >
              Close Preview
            </button>
            <button
              onClick={() => {
                // Test workflow functionality would go here
                alert('Test functionality not implemented yet')
              }}
              className="btn-primary flex items-center"
            >
              <Play className="w-4 h-4 mr-2" />
              Test Workflow
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}