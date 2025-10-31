'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Loader2, CheckCircle, XCircle, AlertCircle, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

// Enhanced loading spinner with different sizes and colors
interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error'
  className?: string
}

export function LoadingSpinner({ size = 'md', color = 'primary', className }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6', 
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  }

  const colorClasses = {
    primary: 'text-primary-600',
    secondary: 'text-gray-600',
    success: 'text-green-600',
    warning: 'text-yellow-600',
    error: 'text-red-600'
  }

  return (
    <Loader2 className={cn(
      'animate-spin',
      sizeClasses[size],
      colorClasses[color],
      className
    )} />
  )
}

// Progress bar component
interface ProgressBarProps {
  progress: number
  size?: 'sm' | 'md' | 'lg'
  color?: 'primary' | 'success' | 'warning' | 'error'
  showLabel?: boolean
  label?: string
  className?: string
}

export function ProgressBar({ 
  progress, 
  size = 'md', 
  color = 'primary', 
  showLabel = false,
  label,
  className 
}: ProgressBarProps) {
  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3'
  }

  const colorClasses = {
    primary: 'bg-primary-600',
    success: 'bg-green-600',
    warning: 'bg-yellow-600',
    error: 'bg-red-600'
  }

  return (
    <div className={cn('w-full', className)}>
      {(showLabel || label) && (
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">
            {label || 'Progress'}
          </span>
          <span className="text-sm text-gray-500">{Math.round(progress)}%</span>
        </div>
      )}
      <div className={cn('w-full bg-gray-200 rounded-full overflow-hidden', sizeClasses[size])}>
        <motion.div
          className={cn('h-full rounded-full transition-all duration-500', colorClasses[color])}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>
    </div>
  )
}

// Circular progress indicator
interface CircularProgressProps {
  progress: number
  size?: number
  strokeWidth?: number
  color?: 'primary' | 'success' | 'warning' | 'error'
  showLabel?: boolean
  className?: string
}

export function CircularProgress({ 
  progress, 
  size = 64, 
  strokeWidth = 4,
  color = 'primary',
  showLabel = true,
  className 
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (progress / 100) * circumference

  const colorClasses = {
    primary: 'stroke-primary-600',
    success: 'stroke-green-600',
    warning: 'stroke-yellow-600',
    error: 'stroke-red-600'
  }

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          className="text-gray-200"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={cn('transition-all duration-500', colorClasses[color])}
        />
      </svg>
      {showLabel && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-semibold text-gray-700">
            {Math.round(progress)}%
          </span>
        </div>
      )}
    </div>
  )
}

// Status indicator with icon and text
interface StatusIndicatorProps {
  status: 'loading' | 'success' | 'error' | 'warning' | 'pending'
  message?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function StatusIndicator({ status, message, size = 'md', className }: StatusIndicatorProps) {
  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  }

  const iconSizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  }

  const getStatusConfig = () => {
    switch (status) {
      case 'loading':
        return {
          icon: <LoadingSpinner size={size} />,
          color: 'text-primary-600',
          bgColor: 'bg-primary-50',
          defaultMessage: 'Loading...'
        }
      case 'success':
        return {
          icon: <CheckCircle className={cn(iconSizeClasses[size], 'text-green-600')} />,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          defaultMessage: 'Success'
        }
      case 'error':
        return {
          icon: <XCircle className={cn(iconSizeClasses[size], 'text-red-600')} />,
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          defaultMessage: 'Error'
        }
      case 'warning':
        return {
          icon: <AlertCircle className={cn(iconSizeClasses[size], 'text-yellow-600')} />,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          defaultMessage: 'Warning'
        }
      case 'pending':
        return {
          icon: <Clock className={cn(iconSizeClasses[size], 'text-gray-600')} />,
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          defaultMessage: 'Pending'
        }
    }
  }

  const config = getStatusConfig()

  return (
    <div className={cn(
      'inline-flex items-center space-x-2 px-3 py-2 rounded-lg',
      config.bgColor,
      sizeClasses[size],
      className
    )}>
      {config.icon}
      <span className={config.color}>
        {message || config.defaultMessage}
      </span>
    </div>
  )
}

// Skeleton loader for content
interface SkeletonProps {
  className?: string
  lines?: number
  avatar?: boolean
}

export function Skeleton({ className, lines = 1, avatar = false }: SkeletonProps) {
  return (
    <div className={cn('animate-pulse', className)}>
      {avatar && (
        <div className="flex items-center space-x-3 mb-3">
          <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
          <div className="flex-1">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/3"></div>
          </div>
        </div>
      )}
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'h-4 bg-gray-200 rounded',
              i === lines - 1 ? 'w-3/4' : 'w-full'
            )}
          />
        ))}
      </div>
    </div>
  )
}

// Loading overlay
interface LoadingOverlayProps {
  isVisible: boolean
  message?: string
  progress?: number
  className?: string
}

export function LoadingOverlay({ isVisible, message, progress, className }: LoadingOverlayProps) {
  if (!isVisible) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={cn(
        'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50',
        className
      )}
    >
      <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mx-auto mb-4" />
          {message && (
            <p className="text-gray-700 mb-4">{message}</p>
          )}
          {typeof progress === 'number' && (
            <ProgressBar progress={progress} showLabel />
          )}
        </div>
      </div>
    </motion.div>
  )
}

// Button with loading state
interface LoadingButtonProps {
  children: React.ReactNode
  loading?: boolean
  disabled?: boolean
  variant?: 'primary' | 'secondary' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  className?: string
  onClick?: () => void
  type?: 'button' | 'submit' | 'reset'
}

export function LoadingButton({
  children,
  loading = false,
  disabled = false,
  variant = 'primary',
  size = 'md',
  className,
  onClick,
  type = 'button'
}: LoadingButtonProps) {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'
  
  const variantClasses = {
    primary: 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500',
    secondary: 'bg-white text-primary-600 border border-primary-600 hover:bg-primary-50 focus:ring-primary-500',
    outline: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus:ring-gray-500'
  }

  const sizeClasses = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base'
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
    >
      {loading && (
        <LoadingSpinner size="sm" className="mr-2" />
      )}
      {children}
    </button>
  )
}