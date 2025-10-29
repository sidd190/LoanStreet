'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  LayoutDashboard,
  MessageSquare,
  Phone,
  LogOut,
  Menu,
  X,
  Bell,
  Search,
  User,
  Activity,
  Clock
} from 'lucide-react'
import Link from 'next/link'
import { AuthUser } from '@/lib/auth'
import { validateRoutePermissions } from '@/lib/permissions'

interface EmployeeLayoutProps {
  children: React.ReactNode
}

export default function EmployeeLayout({ children }: EmployeeLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLogs, setActionLogs] = useState<any[]>([])
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    checkAuthentication()
    loadActionLogs()
  }, [router, pathname])

  const checkAuthentication = async () => {
    try {
      const token = localStorage.getItem('adminToken')
      if (!token) {
        router.push('/admin')
        return
      }

      // Fetch user profile to get current permissions
      const response = await fetch('/api/auth/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setUser(data.user)
          
          // Ensure user is employee
          if (data.user.role !== 'EMPLOYEE') {
            router.push('/admin/dashboard')
            return
          }
          
          // Validate route permissions
          const routeValidation = validateRoutePermissions(data.user, pathname)
          if (!routeValidation.allowed && routeValidation.redirectTo) {
            router.push(routeValidation.redirectTo)
            return
          }
        } else {
          throw new Error('Invalid token')
        }
      } else {
        throw new Error('Authentication failed')
      }
    } catch (error) {
      console.error('Authentication check failed:', error)
      localStorage.removeItem('adminToken')
      localStorage.removeItem('userRole')
      router.push('/admin')
    } finally {
      setLoading(false)
    }
  }

  const loadActionLogs = async () => {
    try {
      const token = localStorage.getItem('adminToken')
      if (!token) return

      const response = await fetch('/api/employee/action-logs', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setActionLogs(data.logs || [])
        }
      }
    } catch (error) {
      console.error('Failed to load action logs:', error)
    }
  }

  const logAction = async (action: string, details: any = {}) => {
    try {
      const token = localStorage.getItem('adminToken')
      if (!token) return

      await fetch('/api/employee/log-action', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action,
          details,
          timestamp: new Date().toISOString()
        })
      })

      // Reload action logs
      loadActionLogs()
    } catch (error) {
      console.error('Failed to log action:', error)
    }
  }

  const handleLogout = async () => {
    try {
      await logAction('logout', { timestamp: new Date().toISOString() })
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      localStorage.removeItem('adminToken')
      localStorage.removeItem('userRole')
      router.push('/admin')
    }
  }

  // Employee-specific navigation items
  const navItems = [
    {
      name: 'Dashboard',
      href: '/admin/dashboard',
      icon: LayoutDashboard,
    },
    {
      name: 'Messages',
      href: '/admin/messages',
      icon: MessageSquare,
    },
    {
      name: 'Leads',
      href: '/admin/leads',
      icon: Phone,
    }
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!user || user.role !== 'EMPLOYEE') {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-primary-600">Employee Panel</h1>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-gray-500 hover:text-gray-700"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="mt-6 px-3">
          <div className="space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href
              
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => logAction('navigation', { page: item.name, href: item.href })}
                  className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
                    isActive
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <item.icon className="w-5 h-5 mr-3" />
                  {item.name}
                </Link>
              )
            })}
          </div>
        </nav>

        {/* Employee Activity Log */}
        <div className="absolute bottom-20 left-0 right-0 px-4">
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Recent Activity</h4>
              <Activity className="w-3 h-3 text-gray-400" />
            </div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {actionLogs.slice(0, 3).map((log, index) => (
                <div key={index} className="text-xs text-gray-600">
                  <div className="flex items-center space-x-1">
                    <Clock className="w-2 h-2" />
                    <span>{log.action}</span>
                  </div>
                  <div className="text-gray-500 ml-3">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))}
              {actionLogs.length === 0 && (
                <div className="text-xs text-gray-500">No recent activity</div>
              )}
            </div>
          </div>
        </div>

        {/* User info at bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-primary-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
              <p className="text-xs text-gray-500">Employee</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:ml-64">
        {/* Top bar */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-gray-500 hover:text-gray-700"
            >
              <Menu className="w-6 h-6" />
            </button>

            <div className="flex-1 max-w-lg mx-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search messages and leads..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  onChange={(e) => logAction('search', { query: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <button 
                className="relative text-gray-500 hover:text-gray-700"
                onClick={() => logAction('notification_check')}
              >
                <Bell className="w-6 h-6" />
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
              </button>
              
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-primary-600" />
                </div>
                <span className="hidden sm:block text-sm font-medium text-gray-700">{user.name}</span>
                <span className="hidden sm:block text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">Employee</span>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  )
}