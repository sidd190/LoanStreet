'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { AlertCircle, RefreshCw, Wifi, WifiOff } from 'lucide-react'
import FallbackDashboard from './FallbackDashboard'

interface RetryableComponentProps {
  children: React.ReactNode
  onRetry: () => Promise<void>
  error?: Error | null
  loading?: boolean
  maxRetries?: number
  retryDelay?: number
  showNetworkStatus?: boolean
  useFallbackDashboard?: boolean
}

export function RetryableComponent({
  children,
  onRetry,
  error,
  loading = false,
  maxRetries = 3,
  retryDelay = 1000,
  showNetworkStatus = true,
  useFallbackDashboard = false
}: RetryableComponentProps) {
  const [retryCount, setRetryCount] = useState(0)
  const [isRetrying, setIsRetrying] = useState(false)
  const [isOnline, setIsOnline] = useState(true)

  // Monitor network status
  useEffect(() => {
    if (!showNetworkStatus) return

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    setIsOnline(navigator.onLine)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [showNetworkStatus])

  const handleRetry = useCallback(async () => {
    if (retryCount >= maxRetries || isRetrying) return

    setIsRetrying(true)
    
    try {
      // Add delay before retry
      if (retryDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, retryDelay))
      }
      
      await onRetry()
      setRetryCount(0) // Reset on successful retry
    } catch (retryError) {
      setRetryCount(prev => prev + 1)
    } finally {
      setIsRetrying(false)
    }
  }, [onRetry, retryCount, maxRetries, isRetrying, retryDelay])

  // Auto-retry when coming back online
  useEffect(() => {
    if (isOnline && error && retryCount < maxRetries && !isRetrying) {
      const timer = setTimeout(() => {
        handleRetry()
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [isOnline, error, retryCount, maxRetries, isRetrying, handleRetry])

  // Show error state
  if (error && !loading && !isRetrying) {
    // Use fallback dashboard for dashboard-specific errors
    if (useFallbackDashboard) {
      return (
        <FallbackDashboard
          onRetry={retryCount < maxRetries ? handleRetry : undefined}
          isRetrying={isRetrying}
          error={error.message}
        />
      )
    }

    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="text-center py-4">
          <div className="flex items-center justify-center mb-4">
            {!isOnline ? (
              <WifiOff className="w-8 h-8 text-red-500" />
            ) : (
              <AlertCircle className="w-8 h-8 text-orange-500" />
            )}
          </div>
          
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            {!isOnline ? 'No Internet Connection' : 'Failed to Load Data'}
          </h3>
          
          <p className="text-gray-600 mb-4">
            {!isOnline 
              ? 'Please check your internet connection and try again.'
              : error.message || 'Something went wrong while loading this section.'
            }
          </p>

          {showNetworkStatus && (
            <div className="flex items-center justify-center mb-4">
              {isOnline ? (
                <div className="flex items-center text-green-600 text-sm">
                  <Wifi className="w-4 h-4 mr-1" />
                  Connected
                </div>
              ) : (
                <div className="flex items-center text-red-600 text-sm">
                  <WifiOff className="w-4 h-4 mr-1" />
                  Offline
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col items-center space-y-2">
            {retryCount < maxRetries && (
              <button
                onClick={handleRetry}
                disabled={isRetrying || !isOnline}
                className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isRetrying ? 'animate-spin' : ''}`} />
                {isRetrying ? 'Retrying...' : `Try Again (${maxRetries - retryCount} left)`}
              </button>
            )}
            
            {retryCount >= maxRetries && (
              <div className="text-sm text-gray-500">
                Maximum retry attempts reached. Please refresh the page.
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Show loading state
  if (loading || isRetrying) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="text-center py-8">
          <RefreshCw className="w-8 h-8 text-primary-600 mx-auto mb-4 animate-spin" />
          <p className="text-gray-600">
            {isRetrying ? 'Retrying...' : 'Loading...'}
          </p>
        </div>
      </div>
    )
  }

  // Show children when everything is working
  return <>{children}</>
}

// Hook for managing retryable state
export function useRetryableState<T>(
  asyncFunction: () => Promise<T>,
  dependencies: any[] = []
) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [loading, setLoading] = useState(true)

  const execute = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await asyncFunction()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'))
    } finally {
      setLoading(false)
    }
  }, dependencies)

  useEffect(() => {
    execute()
  }, [execute])

  return {
    data,
    error,
    loading,
    retry: execute
  }
}

export default RetryableComponent