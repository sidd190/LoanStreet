'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Users, 
  MessageSquare, 
  TrendingUp, 
  Calendar,
  Phone,
  Mail,
  Target,
  Activity,
  BarChart3,
  PieChart,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react'
import AdminLayout from '../components/AdminLayout'
import DataService from '../../../lib/dataService'

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalContacts: 0,
    totalCampaigns: 0,
    totalMessages: 0,
    totalLeads: 0,
    activeUsers: 0,
    conversionRate: 0,
    responseRate: 0,
    recentActivity: []
  })

  const [userRole, setUserRole] = useState('')

  useEffect(() => {
    // Get user role from localStorage
    const role = localStorage.getItem('userRole') || 'EMPLOYEE'
    setUserRole(role)
    
    // Fetch dashboard stats
    fetchDashboardStats()
  }, [])

  const fetchDashboardStats = async () => {
    try {
      console.log('🔄 Fetching dashboard stats...')
      const data = await DataService.getDashboardStats()
      setStats(data)
      console.log('✅ Dashboard stats loaded successfully')
    } catch (error) {
      console.error('❌ Failed to fetch dashboard stats:', error)
    }
  }

  const statCards = [
    {
      title: 'Total Contacts',
      value: '12,543',
      change: '+12%',
      changeType: 'positive',
      icon: Users,
      color: 'bg-blue-500'
    },
    {
      title: 'Active Campaigns',
      value: '8',
      change: '+2',
      changeType: 'positive', 
      icon: Target,
      color: 'bg-green-500'
    },
    {
      title: 'Messages Sent',
      value: '45,231',
      change: '+18%',
      changeType: 'positive',
      icon: MessageSquare,
      color: 'bg-purple-500'
    },
    {
      title: 'Response Rate',
      value: '24.5%',
      change: '-2.1%',
      changeType: 'negative',
      icon: TrendingUp,
      color: 'bg-orange-500'
    }
  ]

  const recentActivities = [
    {
      id: 1,
      type: 'campaign',
      title: 'Personal Loan Campaign launched',
      time: '2 hours ago',
      user: 'Admin User'
    },
    {
      id: 2,
      type: 'message',
      title: 'WhatsApp message sent to 500 contacts',
      time: '4 hours ago',
      user: 'Marketing Team'
    },
    {
      id: 3,
      type: 'lead',
      title: 'New lead: Rajesh Kumar - ₹5L Personal Loan',
      time: '6 hours ago',
      user: 'System'
    },
    {
      id: 4,
      type: 'user',
      title: 'New employee added: Priya Sharma',
      time: '1 day ago',
      user: 'Admin User'
    }
  ]

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-1">
              Welcome back! Here's what's happening with your campaigns.
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="bg-white px-4 py-2 rounded-lg border border-gray-200">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-600">
                  {new Date().toLocaleDateString('en-IN', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                </div>
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="flex items-center mt-4">
                {stat.changeType === 'positive' ? (
                  <ArrowUpRight className="w-4 h-4 text-green-500" />
                ) : (
                  <ArrowDownRight className="w-4 h-4 text-red-500" />
                )}
                <span className={`text-sm font-medium ml-1 ${
                  stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {stat.change}
                </span>
                <span className="text-sm text-gray-500 ml-1">from last month</span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Charts and Activity */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Campaign Performance Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Campaign Performance</h3>
              <div className="flex items-center space-x-2">
                <button className="text-sm text-gray-500 hover:text-gray-700">7D</button>
                <button className="text-sm bg-primary-100 text-primary-600 px-3 py-1 rounded-lg">30D</button>
                <button className="text-sm text-gray-500 hover:text-gray-700">90D</button>
              </div>
            </div>
            
            {/* Placeholder for chart */}
            <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">Campaign analytics chart will be displayed here</p>
              </div>
            </div>
          </motion.div>

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
              {recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-primary-500 rounded-full mt-2"></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                    <p className="text-xs text-gray-500">{activity.time} • {activity.user}</p>
                  </div>
                </div>
              ))}
            </div>
            
            <button className="w-full mt-4 text-sm text-primary-600 hover:text-primary-700 font-medium">
              View all activity
            </button>
          </motion.div>
        </div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Quick Actions</h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {userRole === 'ADMIN' && (
              <>
                <button className="flex flex-col items-center p-4 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors duration-200">
                  <Target className="w-8 h-8 text-primary-600 mb-2" />
                  <span className="text-sm font-medium text-primary-700">New Campaign</span>
                </button>
                
                <button className="flex flex-col items-center p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors duration-200">
                  <Users className="w-8 h-8 text-green-600 mb-2" />
                  <span className="text-sm font-medium text-green-700">Import Contacts</span>
                </button>
              </>
            )}
            
            <button className="flex flex-col items-center p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors duration-200">
              <MessageSquare className="w-8 h-8 text-purple-600 mb-2" />
              <span className="text-sm font-medium text-purple-700">View Messages</span>
            </button>
            
            <button className="flex flex-col items-center p-4 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors duration-200">
              <Phone className="w-8 h-8 text-orange-600 mb-2" />
              <span className="text-sm font-medium text-orange-700">Manage Leads</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AdminLayout>
  )
}