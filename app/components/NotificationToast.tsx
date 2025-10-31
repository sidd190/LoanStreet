'use client'

import { useState, useEffect } from 'react'
import { X, Bell, AlertCircle, CheckCircle, Info } from 'lucide-react'
import { useWebSocketNotifications } from '../hooks/useWebSocket'

interface ToastNotification {
  id: string
  type: 'MESSAGE' | 'CAMPAIGN' | 'LEAD' | 'SYSTEM' | 'ERROR' | 'SUCCESS' | 'INFO'
  title: string
  message: string
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  timestamp: string
  autoHide?: boolean
  duration?: number
}

interface NotificationToastProps {
  maxToasts?: number
  defaultDuration?: number
}

export default function NotificationToast({ 
  maxToasts = 5, 
  defaultDuration = 5000 
}: NotificationToastProps) {
  const [toasts, setToasts] = useState<ToastNotification[]>([])

  // WebSocket connection for real-time notifications
  useWebSocketNotifications((notification) => {
    // Only show toasts for high priority notifications or specific types
    if (notification.priority === 'HIGH' || notification.priority === 'URGENT' || 
        notification.type === 'ERROR' || notification.type === 'SYSTEM') {
      showToast({
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        priority: notification.priority,
        timestamp: notification.timestamp,
        autoHide: notification.priority !== 'URGENT',
        duration: notification.priority === 'URGENT' ? 10000 : defaultDuration
      })
    }
  })

  const showToast = (toast: ToastNotification) => {
    setToasts(prev => {
      const newToasts = [toast, ...prev.slice(0, maxToasts - 1)]
      return newToasts
    })

    // Auto-hide toast if enabled
    if (toast.autoHide !== false) {
      setTimeout(() => {
        hideToast(toast.id)
      }, toast.duration || defaultDuration)
    }
  }

  const hideToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }

  const getToastIcon = (type: string) => {
    switch (type) {
      case 'ERROR':
        return <AlertCircle className="w-5 h-5 text-red-500" />
      case 'SUCCESS':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'INFO':
        return <Info className="w-5 h-5 text-blue-500" />
      case 'SYSTEM':
        return <AlertCircle className="w-5 h-5 text-orange-500" />
      default:
        return <Bell className="w-5 h-5 text-gray-500" />
    }
  }

  const getToastStyles = (type: string, priority: string) => {
    let baseStyles = 'border-l-4 '
    
    switch (type) {
      case 'ERROR':
        baseStyles += 'border-red-500 bg-red-50'
        break
      case 'SUCCESS':
        baseStyles += 'border-green-500 bg-green-50'
        break
      case 'INFO':
        baseStyles += 'border-blue-500 bg-blue-50'
        break
      case 'SYSTEM':
        baseStyles += 'border-orange-500 bg-orange-50'
        break
      default:
        baseStyles += 'border-gray-500 bg-gray-50'
    }

    if (priority === 'URGENT') {
      baseStyles += ' ring-2 ring-red-200 shadow-lg'
    }

    return baseStyles
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast, index) => (
        <div
          key={toast.id}
          className={`
            max-w-sm w-full bg-white rounded-lg shadow-lg border
            transform transition-all duration-300 ease-in-out
            ${getToastStyles(toast.type, toast.priority)}
            ${index === 0 ? 'translate-x-0 opacity-100' : 'translate-x-2 opacity-90'}
          `}
          style={{
            marginTop: index * 4,
            zIndex: 50 - index
          }}
        >
          <div className="p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                {getToastIcon(toast.type)}
              </div>
              <div className="ml-3 w-0 flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-900">
                    {toast.title}
                  </p>
                  <div className="flex items-center space-x-2">
                    {toast.priority === 'URGENT' && (
                      <span className="px-2 py-1 text-xs font-medium text-red-800 bg-red-100 rounded-full">
                        URGENT
                      </span>
                    )}
                    <button
                      onClick={() => hideToast(toast.id)}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <p className="mt-1 text-sm text-gray-600">
                  {toast.message}
                </p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    {formatTimestamp(toast.timestamp)}
                  </span>
                  {toast.type === 'MESSAGE' && toast.priority === 'HIGH' && (
                    <button
                      onClick={() => {
                        // Navigate to messages (implement as needed)
                        hideToast(toast.id)
                      }}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                    >
                      View Message
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* Progress bar for auto-hide */}
          {toast.autoHide !== false && (
            <div className="h-1 bg-gray-200 rounded-b-lg overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all ease-linear"
                style={{
                  animation: `shrink ${toast.duration || defaultDuration}ms linear forwards`
                }}
              />
            </div>
          )}
        </div>
      ))}
      
      <style jsx>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  )
}

// Hook for programmatically showing toasts
export function useNotificationToast() {
  const showSuccess = (title: string, message: string) => {
    // This would integrate with a toast context or state management
    // For now, we'll use the WebSocket system
  }

  const showError = (title: string, message: string) => {
    // This would integrate with a toast context or state management
  }

  const showInfo = (title: string, message: string) => {
    // This would integrate with a toast context or state management
  }

  return {
    showSuccess,
    showError,
    showInfo
  }
}