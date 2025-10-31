'use client'

import React from 'react'
import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { 
  Users, 
  MessageSquare, 
  TrendingUp, 
  Calendar,
  Phone,
  Target,
  Activity,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw
} from 'lucide-react'
import AdminLayout, { AdminContext } from '../components/AdminLayout'
import DataService from '../../../lib/dataService'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import WhatsAppTestModal from '../components/WhatsAppTestModal'

export default function AdminDashboard() {
  const router = useRouter()
  const { user, loading: userLoading } = React.useContext(AdminContext)
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showWhatsAppTest, setShowWhatsAppTest] = useState(false)

  // Load dashboard stats
  const loadStats = useCallback(async () => {
    try {
      setLoading(true)
      const data = await DataService.getDashboardStats(true)
      setStats(data)
    } catch (err) {
      console.error('Failed to load dashboard stats:', err)
      toast.error('Failed to load dashboard stats')
    } finally {
      setLoading(false)
    }
  }, [])

  // Load stats on mount and when user changes
  useEffect(() => {
    if (!userLoading) {
      if (user) {
        loadStats()
      } else {
        setLoading(false)
      }
    }
  }, [user, userLoading, loadStats])

  // Manual refresh function
  const handleRefresh = useCallback(async () => {
    try {
      await loadStats()
      toast.success('Dashboard refreshed successfully')
    } catch (error) {
      toast.error('Failed to refresh dashboard')
    }
  }, [loadStats])

  const testWhatsAppAPI = async () => {
    try {
      const response = await fetch('/api/test/whatsapp', {
        method: 'GET',
        credentials: 'include'
      })
      const result = await response.json()
      
      if (result.status === 'ready') {
        toast.success('WhatsApp API is configured and ready!')
        setShowWhatsAppTest(true)
      } else {
        toast.error('WhatsApp API needs configuration. Check environment variables.')
      }
    } catch (error) {
      toast.error('Failed to check WhatsApp API status')
    }
  }

  const statCards = [
    {
      title: 'Total Contacts',
      value: stats?.totalContacts?.toLocaleString() || '0',
      change: '+12%',
      changeType: 'positive',
      icon: Users,
      color: 'bg-blue-500'
    },
    {
      title: 'Active Campaigns',
      value: stats?.activeCampaigns?.toString() || '0',
      change: '+2',
      changeType: 'positive', 
      icon: Target,
      color: 'bg-green-500'
    },
    {
      title: 'Messages Sent',
      value: stats?.totalMessages?.toLocaleString() || '0',
      change: '+18%',
      changeType: 'positive',
      icon: MessageSquare,
      color: 'bg-purple-500'
    },
    {
      title: 'Response Rate',
      value: `${stats?.responseRate || 0}%`,
      change: stats?.deliveryRate ? `${stats.deliveryRate}% delivered` : 'N/A',
      changeType: 'positive',
      icon: TrendingUp,
      color: 'bg-orange-500'
    }
  ]

  const recentActivities = stats?.recentActivity || []

  // Show loading state while user context is loading
  if (userLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
        </div>
      </AdminLayout>
    )
  }

  // Show loading state while stats are loading
  if (loading && !stats) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-full"></div>
              </div>
            ))}
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-1 text-sm sm:text-base">
              Welcome back! Here's what's happening with your campaigns.
              {stats?.lastUpdated && (
                <span className="block sm:inline text-xs sm:text-sm text-gray-500 sm:ml-2 mt-1 sm:mt-0">
                  Last updated: {new Date(stats.lastUpdated).toLocaleTimeString()}
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="inline-flex items-center px-3 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Refresh dashboard"
            >
              <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
              <span className="ml-2 text-sm">Refresh</span>
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-600 truncate">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                </div>
                <div className={`${stat.color} p-3 rounded-lg flex-shrink-0 ml-3`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="flex items-center mt-4">
                <ArrowUpRight className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span className="text-sm font-medium ml-1 text-green-600">
                  {stat.change}
                </span>
                <span className="text-sm text-gray-500 ml-1 truncate">
                  {stat.title === 'Response Rate' ? '' : 'from last month'}
                </span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
            <Activity className="w-5 h-5 text-gray-400" />
          </div>
          
          <div className="space-y-4">
            {recentActivities.length > 0 ? (
              recentActivities.slice(0, 5).map((activity: any) => (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-primary-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{activity.title}</p>
                    <p className="text-xs text-gray-500">{activity.time} • {activity.user}</p>
                    {activity.description && (
                      <p className="text-xs text-gray-400 mt-1">{activity.description}</p>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-4">
                <Activity className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No recent activity</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Quick Actions</h3>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {user?.role === 'ADMIN' && (
              <>
                <button 
                  onClick={() => router.push('/admin/campaigns')}
                  className="flex flex-col items-center p-4 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors duration-200"
                >
                  <Target className="w-8 h-8 text-primary-600 mb-2" />
                  <span className="text-sm font-medium text-primary-700 text-center">Campaigns</span>
                </button>
                
                <button 
                  onClick={() => router.push('/admin/contacts')}
                  className="flex flex-col items-center p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors duration-200"
                >
                  <Users className="w-8 h-8 text-green-600 mb-2" />
                  <span className="text-sm font-medium text-green-700 text-center">Contacts</span>
                </button>
              </>
            )}
            
            <button 
              onClick={() => router.push('/admin/messages')}
              className="flex flex-col items-center p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors duration-200"
            >
              <MessageSquare className="w-8 h-8 text-purple-600 mb-2" />
              <span className="text-sm font-medium text-purple-700 text-center">Messages</span>
            </button>
            
            <button 
              onClick={() => router.push('/admin/leads')}
              className="flex flex-col items-center p-4 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors duration-200"
            >
              <Phone className="w-8 h-8 text-orange-600 mb-2" />
              <span className="text-sm font-medium text-orange-700 text-center">Leads</span>
            </button>
            
            {user?.role === 'ADMIN' && (
              <button 
                onClick={testWhatsAppAPI}
                className="flex flex-col items-center p-4 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors duration-200"
              >
                <MessageSquare className="w-8 h-8 text-indigo-600 mb-2" />
                <span className="text-sm font-medium text-indigo-700 text-center">Test WhatsApp</span>
              </button>
            )}
          </div>
        </motion.div>
      </div>
      
      {/* WhatsApp Test Modal */}
      <WhatsAppTestModal 
        isOpen={showWhatsAppTest}
        onClose={() => setShowWhatsAppTest(false)}
      />
    </AdminLayout>
  )
}