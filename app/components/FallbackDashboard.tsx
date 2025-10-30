'use client'

import React from 'react'
import { 
  Users, 
  MessageSquare, 
  TrendingUp, 
  Target,
  Activity,
  AlertTriangle,
  RefreshCw,
  Wifi
} from 'lucide-react'

interface FallbackDashboardProps {
  onRetry?: () => void
  isRetrying?: boolean
  error?: string
}

export function FallbackDashboard({ onRetry, isRetrying = false, error }: FallbackDashboardProps) {
  const fallbackStats = [
    {
      title: 'Total Contacts',
      value: '2,847',
      change: 'Cached data',
      icon: Users,
      color: 'bg-blue-500'
    },
    {
      title: 'Active Campaigns',
      value: '3',
      change: 'Cached data',
      icon: Target,
      color: 'bg-green-500'
    },
    {
      title: 'Messages Sent',
      value: '15,420',
      change: 'Cached data',
      icon: MessageSquare,
      color: 'bg-purple-500'
    },
    {
      title: 'Response Rate',
      value: '24.5%',
      change: 'Cached data',
      icon: TrendingUp,
      color: 'bg-orange-500'
    }
  ]

  return (
    <div className="space-y-6">
      {/* Offline Notice */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-center">
          <AlertTriangle className="w-5 h-5 text-yellow-600 mr-3" />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-yellow-800">
              Dashboard Running in Offline Mode
            </h3>
            <p className="text-sm text-yellow-700 mt-1">
              {error || 'Unable to connect to the database. Showing cached data.'}
            </p>
          </div>
          {onRetry && (
            <button
              onClick={onRetry}
              disabled={isRetrying}
              className="ml-3 inline-flex items-center px-3 py-1 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 mr-1 ${isRetrying ? 'animate-spin' : ''}`} />
              {isRetrying ? 'Retrying...' : 'Retry'}
            </button>
          )}
        </div>
      </div>

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Welcome back! Showing cached dashboard data.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="bg-white px-4 py-2 rounded-lg border border-gray-200">
            <div className="flex items-center space-x-2">
              <Wifi className="w-4 h-4 text-red-500" />
              <span className="text-sm text-red-600">Offline</span>
            </div>
          </div>
        </div>
      </div>

      {/* Fallback Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {fallbackStats.map((stat, index) => (
          <div
            key={index}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 opacity-75"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
              </div>
              <div className={`${stat.color} p-3 rounded-lg opacity-75`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="flex items-center mt-4">
              <AlertTriangle className="w-4 h-4 text-yellow-500" />
              <span className="text-sm font-medium ml-1 text-yellow-600">
                {stat.change}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Fallback Chart and Activity */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Chart Placeholder */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6 opacity-75">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Campaign Performance</h3>
            <div className="flex items-center text-yellow-600">
              <AlertTriangle className="w-4 h-4 mr-1" />
              <span className="text-sm">Offline</span>
            </div>
          </div>
          
          <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <Wifi className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">Chart data unavailable offline</p>
              <p className="text-sm text-gray-400 mt-1">Connect to internet to view analytics</p>
            </div>
          </div>
        </div>

        {/* Fallback Activity */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 opacity-75">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
            <Activity className="w-5 h-5 text-gray-400" />
          </div>
          
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">System running in offline mode</p>
                <p className="text-xs text-gray-500">Just now • System</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-gray-300 rounded-full mt-2"></div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-500">Recent activity unavailable</p>
                <p className="text-xs text-gray-400">Connect to internet to view updates</p>
              </div>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
            <p className="text-xs text-yellow-700">
              Activity feed will resume when connection is restored
            </p>
          </div>
        </div>
      </div>

      {/* Limited Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 opacity-75">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Quick Actions</h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex flex-col items-center p-4 bg-gray-50 rounded-lg cursor-not-allowed">
            <Target className="w-8 h-8 text-gray-400 mb-2" />
            <span className="text-sm font-medium text-gray-500">New Campaign</span>
            <span className="text-xs text-gray-400 mt-1">Offline</span>
          </div>
          
          <div className="flex flex-col items-center p-4 bg-gray-50 rounded-lg cursor-not-allowed">
            <Users className="w-8 h-8 text-gray-400 mb-2" />
            <span className="text-sm font-medium text-gray-500">Import Contacts</span>
            <span className="text-xs text-gray-400 mt-1">Offline</span>
          </div>
          
          <div className="flex flex-col items-center p-4 bg-gray-50 rounded-lg cursor-not-allowed">
            <MessageSquare className="w-8 h-8 text-gray-400 mb-2" />
            <span className="text-sm font-medium text-gray-500">View Messages</span>
            <span className="text-xs text-gray-400 mt-1">Offline</span>
          </div>
          
          <div className="flex flex-col items-center p-4 bg-gray-50 rounded-lg cursor-not-allowed">
            <Activity className="w-8 h-8 text-gray-400 mb-2" />
            <span className="text-sm font-medium text-gray-500">Manage Leads</span>
            <span className="text-xs text-gray-400 mt-1">Offline</span>
          </div>
        </div>

        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-700">
            <strong>Tip:</strong> Some features may be available offline. Check individual pages for cached data.
          </p>
        </div>
      </div>
    </div>
  )
}

export default FallbackDashboard