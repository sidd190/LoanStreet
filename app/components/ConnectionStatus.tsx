'use client'

import { Wifi, WifiOff, Loader2 } from 'lucide-react'
import { useConnectionStatus } from '../hooks/useLiveData'

interface ConnectionStatusProps {
  className?: string
  showText?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export default function ConnectionStatus({ 
  className = '', 
  showText = false,
  size = 'md'
}: ConnectionStatusProps) {
  const { 
    isConnected, 
    isConnecting, 
    connectionError, 
    connectionStats,
    statusColor, 
    statusText 
  } = useConnectionStatus()

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  }

  const getIcon = () => {
    if (isConnecting) {
      return <Loader2 className={`${sizeClasses[size]} animate-spin`} />
    }
    if (isConnected) {
      return <Wifi className={sizeClasses[size]} />
    }
    return <WifiOff className={sizeClasses[size]} />
  }

  const getColorClasses = () => {
    switch (statusColor) {
      case 'green':
        return 'text-green-600'
      case 'yellow':
        return 'text-yellow-600'
      case 'red':
        return 'text-red-600'
      default:
        return 'text-gray-400'
    }
  }

  const formatLastPing = () => {
    if (!connectionStats.lastPing) return 'Never'
    const now = new Date()
    const lastPing = new Date(connectionStats.lastPing)
    const diffMs = now.getTime() - lastPing.getTime()
    const diffSeconds = Math.floor(diffMs / 1000)
    
    if (diffSeconds < 60) return `${diffSeconds}s ago`
    const diffMinutes = Math.floor(diffSeconds / 60)
    if (diffMinutes < 60) return `${diffMinutes}m ago`
    const diffHours = Math.floor(diffMinutes / 60)
    return `${diffHours}h ago`
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div 
        className={`${getColorClasses()} transition-colors duration-200`}
        title={`Connection Status: ${statusText}${connectionError ? ` - ${connectionError}` : ''}`}
      >
        {getIcon()}
      </div>
      
      {showText && (
        <div className="flex flex-col">
          <span className={`text-sm font-medium ${getColorClasses()}`}>
            {statusText}
          </span>
          {isConnected && connectionStats.lastPing && (
            <span className="text-xs text-gray-500">
              Last ping: {formatLastPing()}
            </span>
          )}
          {connectionError && (
            <span className="text-xs text-red-500">
              {connectionError}
            </span>
          )}
          {connectionStats.reconnectAttempts > 0 && (
            <span className="text-xs text-yellow-600">
              Reconnect attempts: {connectionStats.reconnectAttempts}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

// Compact version for header/navbar
export function ConnectionStatusIndicator({ className = '' }: { className?: string }) {
  const { statusColor, isConnected, isConnecting } = useConnectionStatus()

  return (
    <div className={`flex items-center ${className}`}>
      <div
        className={`w-2 h-2 rounded-full transition-colors duration-200 ${
          statusColor === 'green' ? 'bg-green-500' :
          statusColor === 'yellow' ? 'bg-yellow-500' :
          statusColor === 'red' ? 'bg-red-500' :
          'bg-gray-400'
        } ${isConnecting ? 'animate-pulse' : ''}`}
        title={`Real-time connection: ${isConnected ? 'Connected' : 'Disconnected'}`}
      />
    </div>
  )
}