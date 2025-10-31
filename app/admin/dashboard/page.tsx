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
import { DashboardSkeleton } from '../../components/SkeletonLoader'
import { DashboardErrorBoundary } from '../../components/ErrorBoundary'
import { RetryableComponent, useRetryableState } from '../../components/RetryableComponent'
import { useLiveStats } from '../../hooks/useLiveData'
import { ConnectionStatusIndicator } from '../../components/ConnectionStatus'
import NotificationCenter from '../../components/NotificationCenter'
import NotificationToast from '../../components/NotificationToast'

export default function AdminDashboard() {
  const router = useRouter()
  const { user, loading: userLoading } = React.useContext(AdminContext)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  // Use live stats hook for real-time updates
  const {
    stats,
    loading: statsLoading,
    error: statsError,
    lastUpdated,
    isConnected,
    refresh: refreshStats
  } = useLiveStats()

  // Fallback to retryable state for compatibility
  const {
    data: fallbackStats,
    error: fallbackError,
    loading: fallbackLoading,
    retry: retryStats
  } = useRetryableState(
    () => DataService.getDashboardStats(),
    [user?.id, lastRefresh]
  )

  // Use live stats if available, otherwise fallback
  const finalStats = stats || fallbackStats
  const finalError = (() => {
    if (statsError) {
      return typeof statsError === 'string' ? new Error(statsError) : statsError
    }
    return fallbackError
  })()
  const finalLoading = statsLoading || fallbackLoading

  // Manual refresh function
  const handleRefresh = useCallback(async () => {
    try {
      setLastRefresh(new Date())
      
      // Use live stats refresh if available
      if (refreshStats) {
        await refreshStats()
      } else {
        await DataService.getDashboardStats(true) // Force refresh
      }
      
      // Also trigger server-side stats update
      await fetch('/api/live-sync/stats', { method: 'POST' })
      
      toast.success('Dashboard refreshed successfully')
    } catch (error) {
      toast.error('Failed to refresh dashboard')
    }
  }, [refreshStats])

  // Auto-refresh every 5 minutes
  useEffect(() => {
    if (!user || userLoading) return

    const interval = setInterval(() => {
      setLastRefresh(new Date())
    }, 5 * 60 * 1000) // 5 minutes

    return () => clearInterval(interval)
  }, [user, userLoading])

  const handleNewCampaign = () => {
    router.push('/admin/campaigns/create')
  }

  const handleImportContacts = () => {
    router.push('/admin/import')
  }

  const handleViewMessages = () => {
    router.push('/admin/messages')
  }

  const handleManageLeads = () => {
    router.push('/admin/leads')
  }

  const testWhatsAppAPI = async () => {
    try {
      const response = await fetch('/api/test/whatsapp', {
        method: 'GET',
        credentials: 'include'
      })
      const result = await response.json()
      
      if (result.status === 'ready') {
        toast.success('WhatsApp API is configured and ready!')
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
      value: finalStats?.totalContacts?.toLocaleString() || '0',
      change: '+12%',
      changeType: 'positive',
      icon: Users,
      color: 'bg-blue-500'
    },
    {
      title: 'Active Campaigns',
      value: finalStats?.activeCampaigns?.toString() || '0',
      change: '+2',
      changeType: 'positive', 
      icon: Target,
      color: 'bg-green-500'
    },
    {
      title: 'Messages Sent',
      value: finalStats?.totalMessages?.toLocaleString() || '0',
      change: '+18%',
      changeType: 'positive',
      icon: MessageSquare,
      color: 'bg-purple-500'
    },
    {
      title: 'Response Rate',
      value: `${finalStats?.responseRate || 0}%`,
      change: finalStats?.deliveryRate ? `${finalStats.deliveryRate}% delivered` : 'N/A',
      changeType: 'positive',
      icon: TrendingUp,
      color: 'bg-orange-500'
    }
  ]

  const recentActivities = finalStats?.recentActivity || []

  // Show loading state while user context is loading
  if (userLoading) {
    return (
      <AdminLayout>
        <DashboardSkeleton />
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <DashboardErrorBoundary>
        <RetryableComponent
          onRetry={retryStats}
          error={finalError}
          loading={finalLoading}
          maxRetries={3}
          retryDelay={2000}
          useFallbackDashboard={true}
        >
          <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
              <div className="flex-1">
                <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Dashboard</h1>
                  <ConnectionStatusIndicator />
                </div>
                <p className="text-gray-600 mt-1 text-sm sm:text-base">
                  Welcome back! Here's what's happening with your campaigns.
                  {(lastUpdated || finalStats?.lastUpdated) && (
                    <span className="block sm:inline text-xs sm:text-sm text-gray-500 sm:ml-2 mt-1 sm:mt-0">
                      Last updated: {new Date(lastUpdated || finalStats.lastUpdated).toLocaleTimeString()}
                      {isConnected && <span className="text-green-600 ml-1">• Live</span>}
                    </span>
                  )}
                </p>
              </div>
              <div className="flex items-center justify-between sm:justify-end space-x-2 sm:space-x-3">
                <NotificationCenter />
                <button
                  onClick={handleRefresh}
                  disabled={finalLoading}
                  className="inline-flex items-center px-2 sm:px-3 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="Refresh dashboard"
                >
                  <RefreshCw className={`w-4 h-4 text-gray-500 ${finalLoading ? 'animate-spin' : ''}`} />
                  <span className="ml-2 text-sm hidden sm:inline">Refresh</span>
                </button>
                <div className="hidden md:block bg-white px-3 sm:px-4 py-2 rounded-lg border border-gray-200">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <span className="text-xs sm:text-sm text-gray-600">
                      {new Date().toLocaleDateString('en-IN', { 
                        weekday: 'short', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {statCards.map((stat, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">{stat.title}</p>
                      <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                    </div>
                    <div className={`${stat.color} p-2 sm:p-3 rounded-lg flex-shrink-0 ml-3`}>
                      <stat.icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </div>
                  </div>
                  <div className="flex items-center mt-3 sm:mt-4">
                    {stat.changeType === 'positive' ? (
                      <ArrowUpRight className="w-3 h-3 sm:w-4 sm:h-4 text-green-500 flex-shrink-0" />
                    ) : (
                      <ArrowDownRight className="w-3 h-3 sm:w-4 sm:h-4 text-red-500 flex-shrink-0" />
                    )}
                    <span className={`text-xs sm:text-sm font-medium ml-1 ${
                      stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {stat.change}
                    </span>
                    <span className="text-xs sm:text-sm text-gray-500 ml-1 truncate">
                      {stat.title === 'Response Rate' ? '' : 'from last month'}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Charts and Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Campaign Performance Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="lg:col-span-2 bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 space-y-3 sm:space-y-0">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">Campaign Performance</h3>
              <div className="flex items-center space-x-1 sm:space-x-2">
                <button className="text-xs sm:text-sm text-gray-500 hover:text-gray-700 px-2 py-1">7D</button>
                <button className="text-xs sm:text-sm bg-primary-100 text-primary-600 px-2 sm:px-3 py-1 rounded-lg">30D</button>
                <button className="text-xs sm:text-sm text-gray-500 hover:text-gray-700 px-2 py-1">90D</button>
              </div>
            </div>
            
            {/* Placeholder for chart */}
            <div className="h-48 sm:h-64 bg-gray-50 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <BarChart3 className="w-8 h-8 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-sm sm:text-base text-gray-500 px-4">Campaign analytics chart will be displayed here</p>
              </div>
            </div>
          </motion.div>

          {/* Recent Activity */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6"
          >
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">Recent Activity</h3>
              <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
            </div>
            
            <div className="space-y-3 sm:space-y-4">
              {recentActivities.length > 0 ? (
                recentActivities.map((activity: any) => (
                  <div key={activity.id} className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-primary-500 rounded-full mt-2 flex-shrink-0"></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{activity.title}</p>
                      <p className="text-xs text-gray-500">{activity.time} • {activity.user}</p>
                      {activity.description && (
                        <p className="text-xs text-gray-400 mt-1 line-clamp-2">{activity.description}</p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 sm:py-4">
                  <Activity className="w-6 h-6 sm:w-8 sm:h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No recent activity</p>
                </div>
              )}
            </div>
            
            <button className="w-full mt-4 text-sm text-primary-600 hover:text-primary-700 font-medium py-2">
              View all activity
            </button>
          </motion.div>
        </div>

            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6"
            >
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 sm:mb-6">Quick Actions</h3>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
            {user?.role === 'ADMIN' && (
              <>
                <button 
                  onClick={handleNewCampaign}
                  className="flex flex-col items-center p-3 sm:p-4 bg-primary-50 hover:bg-primary-100 active:bg-primary-200 rounded-lg transition-colors duration-200"
                >
                  <Target className="w-6 h-6 sm:w-8 sm:h-8 text-primary-600 mb-2" />
                  <span className="text-xs sm:text-sm font-medium text-primary-700 text-center">New Campaign</span>
                </button>
                
                <button 
                  onClick={handleImportContacts}
                  className="flex flex-col items-center p-3 sm:p-4 bg-green-50 hover:bg-green-100 active:bg-green-200 rounded-lg transition-colors duration-200"
                >
                  <Users className="w-6 h-6 sm:w-8 sm:h-8 text-green-600 mb-2" />
                  <span className="text-xs sm:text-sm font-medium text-green-700 text-center">Import Contacts</span>
                </button>
              </>
            )}
            
            <button 
              onClick={handleViewMessages}
              className="flex flex-col items-center p-3 sm:p-4 bg-purple-50 hover:bg-purple-100 active:bg-purple-200 rounded-lg transition-colors duration-200"
            >
              <MessageSquare className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600 mb-2" />
              <span className="text-xs sm:text-sm font-medium text-purple-700 text-center">View Messages</span>
            </button>
            
            <button 
              onClick={handleManageLeads}
              className="flex flex-col items-center p-3 sm:p-4 bg-orange-50 hover:bg-orange-100 active:bg-orange-200 rounded-lg transition-colors duration-200"
            >
              <Phone className="w-6 h-6 sm:w-8 sm:h-8 text-orange-600 mb-2" />
              <span className="text-xs sm:text-sm font-medium text-orange-700 text-center">Manage Leads</span>
            </button>
            
            {user?.role === 'ADMIN' && (
              <button 
                onClick={testWhatsAppAPI}
                className="flex flex-col items-center p-3 sm:p-4 bg-indigo-50 hover:bg-indigo-100 active:bg-indigo-200 rounded-lg transition-colors duration-200"
              >
                <MessageSquare className="w-6 h-6 sm:w-8 sm:h-8 text-indigo-600 mb-2" />
                <span className="text-xs sm:text-sm font-medium text-indigo-700 text-center">Test WhatsApp</span>
              </button>
            )}
          </div>
            </motion.div>
          </div>
        </RetryableComponent>
      </DashboardErrorBoundary>
      
      {/* Notification Toast */}
      <NotificationToast />
    </AdminLayout>
  )
}