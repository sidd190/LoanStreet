'use client'

import { motion } from 'framer-motion'
import { Shield, ArrowLeft, Home, MessageSquare } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface UnauthorizedAccessProps {
  reason?: string
  userRole?: 'ADMIN' | 'EMPLOYEE'
  suggestedRoute?: string
}

export default function UnauthorizedAccess({ 
  reason = 'You do not have permission to access this page',
  userRole = 'EMPLOYEE',
  suggestedRoute = '/admin/dashboard'
}: UnauthorizedAccessProps) {
  const router = useRouter()

  const employeeAllowedPages = [
    { name: 'Dashboard', href: '/admin/dashboard', icon: Home },
    { name: 'Messages', href: '/admin/messages', icon: MessageSquare },
    { name: 'Leads', href: '/admin/leads', icon: MessageSquare }
  ]

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center"
      >
        {/* Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6"
        >
          <Shield className="w-10 h-10 text-red-600" />
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-2xl font-bold text-gray-900 mb-4"
        >
          Access Denied
        </motion.h1>

        {/* Message */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-gray-600 mb-6 leading-relaxed"
        >
          {reason}
        </motion.p>

        {/* Employee-specific message */}
        {userRole === 'EMPLOYEE' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6"
          >
            <p className="text-sm text-blue-800">
              <strong>Employee Access:</strong> You can access messages, leads, and dashboard features. 
              Campaign creation, contact import, and system settings are restricted to administrators.
            </p>
          </motion.div>
        )}

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="space-y-3"
        >
          <button
            onClick={() => router.push(suggestedRoute)}
            className="w-full btn-primary flex items-center justify-center"
          >
            <Home className="w-4 h-4 mr-2" />
            Go to Dashboard
          </button>

          <button
            onClick={() => router.back()}
            className="w-full px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </button>
        </motion.div>

        {/* Employee allowed pages */}
        {userRole === 'EMPLOYEE' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="mt-8 pt-6 border-t border-gray-200"
          >
            <p className="text-sm text-gray-600 mb-4">Pages you can access:</p>
            <div className="grid grid-cols-1 gap-2">
              {employeeAllowedPages.map((page) => (
                <Link
                  key={page.href}
                  href={page.href}
                  className="flex items-center justify-center px-3 py-2 text-sm text-gray-700 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                >
                  <page.icon className="w-4 h-4 mr-2" />
                  {page.name}
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}