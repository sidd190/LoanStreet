'use client'

import React, { memo, useMemo, useCallback } from 'react'
import { motion } from 'framer-motion'

// Memoized card component
interface OptimizedCardProps {
  id: string
  title: string
  subtitle?: string
  content?: React.ReactNode
  actions?: React.ReactNode
  onClick?: (id: string) => void
  className?: string
  isSelected?: boolean
}

export const OptimizedCard = memo<OptimizedCardProps>(({
  id,
  title,
  subtitle,
  content,
  actions,
  onClick,
  className = '',
  isSelected = false
}) => {
  const handleClick = useCallback(() => {
    onClick?.(id)
  }, [id, onClick])

  const cardClasses = useMemo(() => {
    return `bg-white rounded-lg shadow-sm border border-gray-200 p-4 transition-all duration-200 hover:shadow-md ${
      isSelected ? 'ring-2 ring-primary-500 border-primary-300' : ''
    } ${onClick ? 'cursor-pointer' : ''} ${className}`
  }, [isSelected, onClick, className])

  return (
    <div className={cardClasses} onClick={handleClick}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-gray-900 truncate">{title}</h3>
          {subtitle && (
            <p className="text-xs text-gray-500 truncate mt-1">{subtitle}</p>
          )}
        </div>
        {actions && (
          <div className="ml-2 flex-shrink-0">
            {actions}
          </div>
        )}
      </div>
      {content && (
        <div className="mt-3">
          {content}
        </div>
      )}
    </div>
  )
})

OptimizedCard.displayName = 'OptimizedCard'

// Memoized list item component
interface OptimizedListItemProps {
  id: string
  data: any
  index: number
  isSelected?: boolean
  onSelect?: (id: string) => void
  renderContent: (data: any, index: number) => React.ReactNode
  className?: string
}

export const OptimizedListItem = memo<OptimizedListItemProps>(({
  id,
  data,
  index,
  isSelected = false,
  onSelect,
  renderContent,
  className = ''
}) => {
  const handleSelect = useCallback(() => {
    onSelect?.(id)
  }, [id, onSelect])

  const itemClasses = useMemo(() => {
    return `flex items-center p-3 hover:bg-gray-50 transition-colors duration-150 ${
      isSelected ? 'bg-primary-50 border-l-4 border-primary-500' : ''
    } ${onSelect ? 'cursor-pointer' : ''} ${className}`
  }, [isSelected, onSelect, className])

  return (
    <div className={itemClasses} onClick={handleSelect}>
      {renderContent(data, index)}
    </div>
  )
})

OptimizedListItem.displayName = 'OptimizedListItem'

// Memoized table row component
interface OptimizedTableRowProps {
  id: string
  data: any
  columns: Array<{
    key: string
    render: (value: any, data: any) => React.ReactNode
  }>
  isSelected?: boolean
  onSelect?: (id: string) => void
  className?: string
}

export const OptimizedTableRow = memo<OptimizedTableRowProps>(({
  id,
  data,
  columns,
  isSelected = false,
  onSelect,
  className = ''
}) => {
  const handleSelect = useCallback(() => {
    onSelect?.(id)
  }, [id, onSelect])

  const rowClasses = useMemo(() => {
    return `hover:bg-gray-50 transition-colors duration-150 ${
      isSelected ? 'bg-primary-50' : ''
    } ${onSelect ? 'cursor-pointer' : ''} ${className}`
  }, [isSelected, onSelect, className])

  const cells = useMemo(() => {
    return columns.map((column) => (
      <td key={column.key} className="px-6 py-4 whitespace-nowrap text-sm">
        {column.render(data[column.key], data)}
      </td>
    ))
  }, [columns, data])

  return (
    <tr className={rowClasses} onClick={handleSelect}>
      {cells}
    </tr>
  )
})

OptimizedTableRow.displayName = 'OptimizedTableRow'

// Memoized animated component
interface OptimizedAnimatedProps {
  children: React.ReactNode
  animation?: 'fadeIn' | 'slideUp' | 'slideDown' | 'slideLeft' | 'slideRight' | 'scale'
  delay?: number
  duration?: number
  className?: string
}

export const OptimizedAnimated = memo<OptimizedAnimatedProps>(({
  children,
  animation = 'fadeIn',
  delay = 0,
  duration = 0.3,
  className = ''
}) => {
  const animationVariants = useMemo(() => {
    const variants = {
      fadeIn: {
        initial: { opacity: 0 },
        animate: { opacity: 1 }
      },
      slideUp: {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 }
      },
      slideDown: {
        initial: { opacity: 0, y: -20 },
        animate: { opacity: 1, y: 0 }
      },
      slideLeft: {
        initial: { opacity: 0, x: 20 },
        animate: { opacity: 1, x: 0 }
      },
      slideRight: {
        initial: { opacity: 0, x: -20 },
        animate: { opacity: 1, x: 0 }
      },
      scale: {
        initial: { opacity: 0, scale: 0.95 },
        animate: { opacity: 1, scale: 1 }
      }
    }
    return variants[animation]
  }, [animation])

  return (
    <motion.div
      initial={animationVariants.initial}
      animate={animationVariants.animate}
      transition={{ duration, delay }}
      className={className}
    >
      {children}
    </motion.div>
  )
})

OptimizedAnimated.displayName = 'OptimizedAnimated'

// Memoized grid component
interface OptimizedGridProps {
  items: any[]
  renderItem: (item: any, index: number) => React.ReactNode
  columns?: {
    default?: number
    sm?: number
    md?: number
    lg?: number
    xl?: number
  }
  gap?: 'sm' | 'md' | 'lg'
  className?: string
}

export const OptimizedGrid = memo<OptimizedGridProps>(({
  items,
  renderItem,
  columns = { default: 1, md: 2, lg: 3 },
  gap = 'md',
  className = ''
}) => {
  const gridClasses = useMemo(() => {
    const gapClasses = {
      sm: 'gap-2 sm:gap-3',
      md: 'gap-4 sm:gap-6',
      lg: 'gap-6 sm:gap-8'
    }

    const colClasses = []
    if (columns.default) colClasses.push(`grid-cols-${columns.default}`)
    if (columns.sm) colClasses.push(`sm:grid-cols-${columns.sm}`)
    if (columns.md) colClasses.push(`md:grid-cols-${columns.md}`)
    if (columns.lg) colClasses.push(`lg:grid-cols-${columns.lg}`)
    if (columns.xl) colClasses.push(`xl:grid-cols-${columns.xl}`)

    return `grid ${colClasses.join(' ')} ${gapClasses[gap]} ${className}`
  }, [columns, gap, className])

  const renderedItems = useMemo(() => {
    return items.map((item, index) => (
      <div key={item.id || index}>
        {renderItem(item, index)}
      </div>
    ))
  }, [items, renderItem])

  return (
    <div className={gridClasses}>
      {renderedItems}
    </div>
  )
})

OptimizedGrid.displayName = 'OptimizedGrid'

// Memoized search results component
interface OptimizedSearchResultsProps {
  query: string
  results: any[]
  renderResult: (result: any, index: number, query: string) => React.ReactNode
  emptyMessage?: string
  className?: string
}

export const OptimizedSearchResults = memo<OptimizedSearchResultsProps>(({
  query,
  results,
  renderResult,
  emptyMessage = 'No results found',
  className = ''
}) => {
  const renderedResults = useMemo(() => {
    return results.map((result, index) => (
      <div key={result.id || index}>
        {renderResult(result, index, query)}
      </div>
    ))
  }, [results, renderResult, query])

  if (results.length === 0) {
    return (
      <div className={`text-center py-8 text-gray-500 ${className}`}>
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className={className}>
      {renderedResults}
    </div>
  )
})

OptimizedSearchResults.displayName = 'OptimizedSearchResults'

// Higher-order component for performance optimization
export function withPerformanceOptimization<P extends object>(
  Component: React.ComponentType<P>,
  compareProps?: (prevProps: P, nextProps: P) => boolean
) {
  const OptimizedComponent = memo(Component, compareProps)
  OptimizedComponent.displayName = `Optimized(${Component.displayName || Component.name})`
  return OptimizedComponent
}

// Custom comparison functions for common use cases
export const shallowCompare = <T extends object>(prev: T, next: T): boolean => {
  const prevKeys = Object.keys(prev) as (keyof T)[]
  const nextKeys = Object.keys(next) as (keyof T)[]

  if (prevKeys.length !== nextKeys.length) {
    return false
  }

  return prevKeys.every(key => prev[key] === next[key])
}

export const deepCompare = <T>(prev: T, next: T): boolean => {
  return JSON.stringify(prev) === JSON.stringify(next)
}

// Memoized button component
interface OptimizedButtonProps {
  children: React.ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  loading?: boolean
  className?: string
}

export const OptimizedButton = memo<OptimizedButtonProps>(({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  className = ''
}) => {
  const buttonClasses = useMemo(() => {
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

    return `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`
  }, [variant, size, className])

  const handleClick = useCallback(() => {
    if (!disabled && !loading && onClick) {
      onClick()
    }
  }, [disabled, loading, onClick])

  return (
    <button
      className={buttonClasses}
      onClick={handleClick}
      disabled={disabled || loading}
    >
      {loading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
      {children}
    </button>
  )
})

OptimizedButton.displayName = 'OptimizedButton'