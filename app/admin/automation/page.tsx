'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  Plus, 
  Play, 
  Pause, 
  Edit, 
  Trash2,
  Clock,
  Calendar,
  Target,
  Users,
  MessageSquare,
  Settings,
  CheckCircle,
  AlertCircle,
  RefreshCw
} from 'lucide-react'
import AdminLayout from '../components/AdminLayout'
import toast from 'react-hot-toast'

export default function AutomationPage() {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedJob, setSelectedJob] = useState(null)

  const cronJobs = [
    {
      id: '1',
      name: 'Daily Lead Follow-up',
      description: 'Send follow-up messages to leads who haven\'t responded in 24 hours',
      schedule: '0 9 * * *', // Daily at 9 AM
      scheduleText: 'Daily at 9:00 AM',
      isActive: true,
      status: 'IDLE',
      lastRun: '2024-10-24T09:00:00',
      nextRun: '2024-10-25T09:00:00',
      successCount: 145,
      errorCount: 2,
      type: 'FOLLOW_UP',
      config: {
        messageTemplate: 'Hi {name}, we noticed you were interested in our loan services. Would you like to know more?',
        targetSegment: 'unresponsive_leads',
        channel: 'WHATSAPP'
      }
    },
    {
      id: '2',
      name: 'Weekly Campaign Report',
      description: 'Generate and send weekly campaign performance reports',
      schedule: '0 8 * * 1', // Every Monday at 8 AM
      scheduleText: 'Every Monday at 8:00 AM',
      isActive: true,
      status: 'COMPLETED',
      lastRun: '2024-10-21T08:00:00',
      nextRun: '2024-10-28T08:00:00',
      successCount: 12,
      errorCount: 0,
      type: 'REPORT',
      config: {
        recipients: ['admin@quickloan.com', 'manager@quickloan.com'],
        includeCharts: true,
        format: 'PDF'
      }
    },
    {
      id: '3',
      name: 'High-Value Lead Alert',
      description: 'Send instant notifications for leads with loan amount > ₹10L',
      schedule: '*/15 * * * *', // Every 15 minutes
      scheduleText: 'Every 15 minutes',
      isActive: true,
      status: 'RUNNING',
      lastRun: '2024-10-24T14:45:00',
      nextRun: '2024-10-24T15:00:00',
      successCount: 23,
      errorCount: 1,
      type: 'ALERT',
      config: {
        threshold: 1000000,
        notifyUsers: ['admin', 'senior_manager'],
        channel: 'EMAIL'
      }
    },
    {
      id: '4',
      name: 'Data Cleanup',
      description: 'Clean up old message logs and optimize database',
      schedule: '0 2 1 * *', // First day of every month at 2 AM
      scheduleText: 'Monthly on 1st at 2:00 AM',
      isActive: false,
      status: 'IDLE',
      lastRun: '2024-10-01T02:00:00',
      nextRun: '2024-11-01T02:00:00',
      successCount: 8,
      errorCount: 0,
      type: 'MAINTENANCE',
      config: {
        retentionDays: 90,
        cleanupTables: ['messages', 'activities', 'logs']
      }
    }
  ]

  const jobTypes = [
    { value: 'CAMPAIGN', label: 'Campaign Automation', icon: Target },
    { value: 'FOLLOW_UP', label: 'Lead Follow-up', icon: Users },
    { value: 'REPORT', label: 'Report Generation', icon: Calendar },
    { value: 'ALERT', label: 'Alert System', icon: AlertCircle },
    { value: 'MAINTENANCE', label: 'Data Maintenance', icon: Settings }
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'RUNNING': return 'bg-green-100 text-green-800'
      case 'COMPLETED': return 'bg-blue-100 text-blue-800'
      case 'FAILED': return 'bg-red-100 text-red-800'
      case 'IDLE': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getTypeIcon = (type: string) => {
    const typeConfig = jobTypes.find(t => t.value === type)
    return typeConfig ? typeConfig.icon : Settings
  }

  const toggleJob = (jobId: string) => {
    // Toggle job active status
    toast.success('Job status updated')
  }

  const runJobNow = (jobId: string) => {
    // Trigger immediate job execution
    toast.success('Job execution started')
  }

  const deleteJob = (jobId: string) => {
    // Delete job
    toast.success('Job deleted successfully')
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Automation</h1>
            <p className="text-gray-600 mt-1">Manage automated campaigns and scheduled tasks</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary flex items-center"
          >
            <Plus className="w-5 h-5 mr-2" />
            Create Automation
          </button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="card text-center">
            <div className="bg-blue-100 w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-3">
              <Clock className="w-6 h-6 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{cronJobs.length}</p>
            <p className="text-sm text-gray-600">Total Jobs</p>
          </div>
          
          <div className="card text-center">
            <div className="bg-green-100 w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-3">
              <Play className="w-6 h-6 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{cronJobs.filter(j => j.isActive).length}</p>
            <p className="text-sm text-gray-600">Active Jobs</p>
          </div>
          
          <div className="card text-center">
            <div className="bg-purple-100 w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-3">
              <CheckCircle className="w-6 h-6 text-purple-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{cronJobs.reduce((sum, job) => sum + job.successCount, 0)}</p>
            <p className="text-sm text-gray-600">Successful Runs</p>
          </div>
          
          <div className="card text-center">
            <div className="bg-red-100 w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-3">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{cronJobs.reduce((sum, job) => sum + job.errorCount, 0)}</p>
            <p className="text-sm text-gray-600">Failed Runs</p>
          </div>
        </div>

        {/* Jobs List */}
        <div className="space-y-4">
          {cronJobs.map((job, index) => {
            const TypeIcon = getTypeIcon(job.type)
            return (
              <motion.div
                key={job.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="card"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <div className={`p-3 rounded-lg ${job.isActive ? 'bg-green-100' : 'bg-gray-100'}`}>
                      <TypeIcon className={`w-6 h-6 ${job.isActive ? 'text-green-600' : 'text-gray-500'}`} />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{job.name}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(job.status)}`}>
                          {job.status}
                        </span>
                        {!job.isActive && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                            PAUSED
                          </span>
                        )}
                      </div>
                      
                      <p className="text-gray-600 mb-3">{job.description}</p>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500">Schedule</p>
                          <p className="font-medium">{job.scheduleText}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Last Run</p>
                          <p className="font-medium">
                            {new Date(job.lastRun).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Next Run</p>
                          <p className="font-medium">
                            {new Date(job.nextRun).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Success Rate</p>
                          <p className="font-medium text-green-600">
                            {Math.round((job.successCount / (job.successCount + job.errorCount)) * 100)}%
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => runJobNow(job.id)}
                      className="p-2 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg"
                      title="Run Now"
                    >
                      <Play className="w-4 h-4" />
                    </button>
                    
                    <button
                      onClick={() => toggleJob(job.id)}
                      className={`p-2 rounded-lg ${
                        job.isActive 
                          ? 'text-orange-500 hover:text-orange-700 hover:bg-orange-50' 
                          : 'text-green-500 hover:text-green-700 hover:bg-green-50'
                      }`}
                      title={job.isActive ? 'Pause' : 'Resume'}
                    >
                      {job.isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>
                    
                    <button
                      onClick={() => setSelectedJob(job)}
                      className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    
                    <button
                      onClick={() => deleteJob(job.id)}
                      className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Create Automation Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Create New Automation</h2>
              </div>
              
              <div className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Automation Name</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Enter automation name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    rows={3}
                    className="input-field"
                    placeholder="Describe what this automation does"
                  ></textarea>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Automation Type</label>
                  <select className="input-field">
                    <option value="">Select type</option>
                    {jobTypes.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Schedule Type</label>
                    <select className="input-field">
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="custom">Custom Cron</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Time</label>
                    <input
                      type="time"
                      className="input-field"
                      defaultValue="09:00"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Target Audience</label>
                  <select className="input-field">
                    <option value="">Select audience</option>
                    <option value="all_contacts">All Contacts</option>
                    <option value="new_leads">New Leads</option>
                    <option value="unresponsive_leads">Unresponsive Leads</option>
                    <option value="high_value_leads">High Value Leads</option>
                    <option value="custom_segment">Custom Segment</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Message Template</label>
                  <textarea
                    rows={4}
                    className="input-field"
                    placeholder="Hi {name}, this is a follow-up message..."
                  ></textarea>
                  <p className="text-xs text-gray-500 mt-1">
                    Use {`{name}`}, {`{phone}`}, {`{loanAmount}`} for personalization
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Channel</label>
                  <div className="flex space-x-4">
                    <label className="flex items-center">
                      <input type="radio" name="channel" value="SMS" className="mr-2" />
                      SMS
                    </label>
                    <label className="flex items-center">
                      <input type="radio" name="channel" value="WHATSAPP" className="mr-2" />
                      WhatsApp
                    </label>
                    <label className="flex items-center">
                      <input type="radio" name="channel" value="EMAIL" className="mr-2" />
                      Email
                    </label>
                  </div>
                </div>
              </div>
              
              <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button className="btn-primary">
                  Create Automation
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}