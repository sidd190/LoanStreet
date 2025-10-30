'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Play, 
  Pause, 
  Square, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  Clock,
  Send,
  MessageSquare,
  Users,
  TrendingUp,
  AlertCircle
} from 'lucide-react'
import toast from 'react-hot-toast'

interface CampaignProgressProps {
  campaignId: string
  onStatusChange?: (status: string) => void
}

interface ProgressData {
  status: string
  totalContacts: number
  sentCount: number
  deliveredCount: number
  failedCount: number
  pendingCount: number
  progress: number
  estimatedTimeRemaining?: number
  messagesPerMinute?: number
  errors?: string[]
}

export default function CampaignProgress({ campaignId, onStatusChange }: CampaignProgressProps) {
  const [progress, setProgress] = useState<ProgressData>({
    status: 'DRAFT',
    totalContacts: 0,
    sentCount: 0,
    deliveredCount: 0,
    failedCount: 0,
    pendingCount: 0,
    progress: 0
  })
  const [loading, setLoading] = useState(false)
  const [executing, setExecuting] = useState(false)

  useEffect(() => {
    if (campaignId) {
      loadProgress()
      
      // Set up polling for real-time updates when campaign is running
      let interval: NodeJS.Timeout
      if (progress.status === 'RUNNING') {
        interval = setInterval(loadProgress, 2000) // Poll every 2 seconds
      }
      
      return () => {
        if (interval) clearInterval(interval)
      }
    }
  }, [campaignId, progress.status])

  const loadProgress = async () => {
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/execute`, {
        credentials: 'include'
      })
      
      if (response.ok) {
        const data = await response.json()
        const progressPercentage = data.totalContacts > 0 
          ? Math.round(((data.sentCount + data.failedCount) / data.totalContacts) * 100)
          : 0
          
        setProgress({
          ...data,
          progress: progressPercentage,
          messagesPerMinute: calculateMessagesPerMinute(data),
          estimatedTimeRemaining: calculateTimeRemaining(data)
        })
        
        if (onStatusChange) {
          onStatusChange(data.status)
        }
      }
    } catch (error) {
      console.error('Failed to load campaign progress:', error)
    }
  }

  const calculateMessagesPerMinute = (data: any): number => {
    // This would be calculated based on actual execution time
    // For now, return a reasonable estimate
    return data.sentCount > 0 ? Math.round(data.sentCount / 5) : 0
  }

  const calculateTimeRemaining = (data: any): number => {
    if (data.pendingCount === 0 || data.messagesPerMinute === 0) return 0
    return Math.round(data.pendingCount / (data.messagesPerMinute || 10))
  }

  const executeCampaign = async () => {
    try {
      setExecuting(true)
      setLoading(true)
      
      const response = await fetch(`/api/campaigns/${campaignId}/execute`, {
        method: 'POST',
        credentials: 'include'
      })
      
      const result = await response.json()
      
      if (response.ok) {
        toast.success('Campaign execution started')
        loadProgress() // Refresh progress immediately
      } else {
        toast.error(result.error || 'Failed to execute campaign')
      }
    } catch (error) {
      toast.error('Failed to execute campaign')
    } finally {
      setExecuting(false)
      setLoading(false)
    }
  }

  const pauseCampaign = async () => {
    try {
      setLoading(true)
      
      const response = await fetch(`/api/campaigns/${campaignId}/pause`, {
        method: 'POST',
        credentials: 'include'
      })
      
      const result = await response.json()
      
      if (response.ok && result.success) {
        toast.success('Campaign paused')
        loadProgress()
      } else {
        toast.error(result.message || 'Failed to pause campaign')
      }
    } catch (error) {
      toast.error('Failed to pause campaign')
    } finally {
      setLoading(false)
    }
  }

  const resumeCampaign = async () => {
    try {
      setLoading(true)
      
      const response = await fetch(`/api/campaigns/${campaignId}/resume`, {
        method: 'POST',
        credentials: 'include'
      })
      
      const result = await response.json()
      
      if (response.ok && result.success) {
        toast.success('Campaign resumed')
        loadProgress()
      } else {
        toast.error(result.message || 'Failed to resume campaign')
      }
    } catch (error) {
      toast.error('Failed to resume campaign')
    } finally {
      setLoading(false)
    }
  }

  const cancelCampaign = async () => {
    if (!confirm('Are you sure you want to cancel this campaign? This action cannot be undone.')) {
      return
    }
    
    try {
      setLoading(true)
      
      const response = await fetch(`/api/campaigns/${campaignId}/cancel`, {
        method: 'POST',
        credentials: 'include'
      })
      
      const result = await response.json()
      
      if (response.ok && result.success) {
        toast.success('Campaign cancelled')
        loadProgress()
      } else {
        toast.error(result.message || 'Failed to cancel campaign')
      }
    } catch (error) {
      toast.error('Failed to cancel campaign')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'text-gray-600 bg-gray-100'
      case 'SCHEDULED': return 'text-blue-600 bg-blue-100'
      case 'RUNNING': return 'text-green-600 bg-green-100'
      case 'COMPLETED': return 'text-emerald-600 bg-emerald-100'
      case 'PAUSED': return 'text-yellow-600 bg-yellow-100'
      case 'CANCELLED': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'RUNNING': return RefreshCw
      case 'COMPLETED': return CheckCircle
      case 'PAUSED': return Pause
      case 'CANCELLED': return XCircle
      case 'SCHEDULED': return Clock
      default: return AlertCircle
    }
  }

  const StatusIcon = getStatusIcon(progress.status)
  const deliveryRate = progress.sentCount > 0 ? Math.round((progress.deliveredCount / progress.sentCount) * 100) : 0

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Campaign Progress</h3>
        <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(progress.status)}`}>
          <StatusIcon className={`w-4 h-4 mr-2 ${progress.status === 'RUNNING' ? 'animate-spin' : ''}`} />
          {progress.status}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Overall Progress</span>
          <span>{progress.progress}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <motion.div
            className="bg-primary-600 h-3 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress.progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <Users className="w-5 h-5 text-gray-600 mx-auto mb-1" />
          <div className="text-lg font-bold text-gray-900">{progress.totalContacts}</div>
          <div className="text-xs text-gray-500">Total Contacts</div>
        </div>
        
        <div className="text-center p-3 bg-green-50 rounded-lg">
          <Send className="w-5 h-5 text-green-600 mx-auto mb-1" />
          <div className="text-lg font-bold text-green-600">{progress.sentCount}</div>
          <div className="text-xs text-gray-500">Messages Sent</div>
        </div>
        
        <div className="text-center p-3 bg-blue-50 rounded-lg">
          <CheckCircle className="w-5 h-5 text-blue-600 mx-auto mb-1" />
          <div className="text-lg font-bold text-blue-600">{progress.deliveredCount}</div>
          <div className="text-xs text-gray-500">Delivered</div>
        </div>
        
        <div className="text-center p-3 bg-red-50 rounded-lg">
          <XCircle className="w-5 h-5 text-red-600 mx-auto mb-1" />
          <div className="text-lg font-bold text-red-600">{progress.failedCount}</div>
          <div className="text-xs text-gray-500">Failed</div>
        </div>
      </div>

      {/* Performance Metrics */}
      {progress.status === 'RUNNING' && (
        <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
          <div>
            <div className="text-sm text-gray-600">Delivery Rate</div>
            <div className="text-lg font-semibold text-gray-900">{deliveryRate}%</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Messages/Min</div>
            <div className="text-lg font-semibold text-gray-900">{progress.messagesPerMinute || 0}</div>
          </div>
          {progress.estimatedTimeRemaining && progress.estimatedTimeRemaining > 0 && (
            <div className="col-span-2">
              <div className="text-sm text-gray-600">Est. Time Remaining</div>
              <div className="text-lg font-semibold text-gray-900">{progress.estimatedTimeRemaining} minutes</div>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center space-x-3">
        {progress.status === 'DRAFT' && (
          <button
            onClick={executeCampaign}
            disabled={loading || executing}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            <Play className="w-4 h-4 mr-2" />
            {executing ? 'Starting...' : 'Start Campaign'}
          </button>
        )}
        
        {progress.status === 'SCHEDULED' && (
          <button
            onClick={executeCampaign}
            disabled={loading}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            <Play className="w-4 h-4 mr-2" />
            Execute Now
          </button>
        )}
        
        {progress.status === 'RUNNING' && (
          <>
            <button
              onClick={pauseCampaign}
              disabled={loading}
              className="flex items-center px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50"
            >
              <Pause className="w-4 h-4 mr-2" />
              Pause
            </button>
            <button
              onClick={cancelCampaign}
              disabled={loading}
              className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              <Square className="w-4 h-4 mr-2" />
              Cancel
            </button>
          </>
        )}
        
        {progress.status === 'PAUSED' && (
          <>
            <button
              onClick={resumeCampaign}
              disabled={loading}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              <Play className="w-4 h-4 mr-2" />
              Resume
            </button>
            <button
              onClick={cancelCampaign}
              disabled={loading}
              className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              <Square className="w-4 h-4 mr-2" />
              Cancel
            </button>
          </>
        )}
        
        <button
          onClick={loadProgress}
          disabled={loading}
          className="flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Error Messages */}
      {progress.errors && progress.errors.length > 0 && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="text-sm font-medium text-red-800 mb-2">Execution Errors:</div>
          <ul className="text-sm text-red-700 space-y-1">
            {progress.errors.map((error, index) => (
              <li key={index}>• {error}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}