'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

// Debounce hook for performance optimization
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

// Throttle hook for performance optimization
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const lastRun = useRef(Date.now())

  return useCallback(
    ((...args) => {
      if (Date.now() - lastRun.current >= delay) {
        callback(...args)
        lastRun.current = Date.now()
      }
    }) as T,
    [callback, delay]
  )
}

// Memoized search hook
export function useMemoizedSearch<T>(
  items: T[],
  searchTerm: string,
  searchFields: (keyof T)[],
  options?: {
    caseSensitive?: boolean
    exactMatch?: boolean
  }
) {
  return useMemo(() => {
    if (!searchTerm.trim()) return items

    const term = options?.caseSensitive ? searchTerm : searchTerm.toLowerCase()

    return items.filter(item => {
      return searchFields.some(field => {
        const fieldValue = item[field]
        if (typeof fieldValue !== 'string') return false

        const value = options?.caseSensitive ? fieldValue : fieldValue.toLowerCase()
        
        return options?.exactMatch 
          ? value === term
          : value.includes(term)
      })
    })
  }, [items, searchTerm, searchFields, options])
}

// Memoized filter hook
export function useMemoizedFilter<T>(
  items: T[],
  filters: Record<string, any>,
  filterFunctions: Record<string, (item: T, value: any) => boolean>
) {
  return useMemo(() => {
    return items.filter(item => {
      return Object.entries(filters).every(([key, value]) => {
        if (value === null || value === undefined || value === '') return true
        
        const filterFn = filterFunctions[key]
        return filterFn ? filterFn(item, value) : true
      })
    })
  }, [items, filters, filterFunctions])
}

// Memoized sort hook
export function useMemoizedSort<T>(
  items: T[],
  sortKey: keyof T | null,
  sortDirection: 'asc' | 'desc' = 'asc'
) {
  return useMemo(() => {
    if (!sortKey) return items

    return [...items].sort((a, b) => {
      const aValue = a[sortKey]
      const bValue = b[sortKey]

      if (aValue === bValue) return 0

      let comparison = 0
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        comparison = aValue.localeCompare(bValue)
      } else if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = aValue - bValue
      } else if (aValue instanceof Date && bValue instanceof Date) {
        comparison = aValue.getTime() - bValue.getTime()
      } else {
        comparison = String(aValue).localeCompare(String(bValue))
      }

      return sortDirection === 'desc' ? -comparison : comparison
    })
  }, [items, sortKey, sortDirection])
}

// Virtual scrolling hook for large lists
export function useVirtualScroll<T>({
  items,
  itemHeight,
  containerHeight,
  overscan = 5
}: {
  items: T[]
  itemHeight: number
  containerHeight: number
  overscan?: number
}) {
  const [scrollTop, setScrollTop] = useState(0)

  const visibleStart = Math.floor(scrollTop / itemHeight)
  const visibleEnd = Math.min(
    visibleStart + Math.ceil(containerHeight / itemHeight),
    items.length - 1
  )

  const startIndex = Math.max(0, visibleStart - overscan)
  const endIndex = Math.min(items.length - 1, visibleEnd + overscan)

  const visibleItems = items.slice(startIndex, endIndex + 1)

  const totalHeight = items.length * itemHeight
  const offsetY = startIndex * itemHeight

  return {
    visibleItems,
    totalHeight,
    offsetY,
    startIndex,
    endIndex,
    setScrollTop
  }
}

// Intersection observer hook for infinite scrolling
export function useInfiniteScroll(
  callback: () => void,
  options?: {
    threshold?: number
    rootMargin?: string
    enabled?: boolean
  }
) {
  const { threshold = 1.0, rootMargin = '0px', enabled = true } = options || {}
  const targetRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!enabled) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          callback()
        }
      },
      { threshold, rootMargin }
    )

    const currentTarget = targetRef.current
    if (currentTarget) {
      observer.observe(currentTarget)
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget)
      }
    }
  }, [callback, threshold, rootMargin, enabled])

  return targetRef
}

// Performance monitoring hook
export function usePerformanceMonitor(componentName: string) {
  const renderCount = useRef(0)
  const startTime = useRef(Date.now())

  useEffect(() => {
    renderCount.current += 1
  })

  useEffect(() => {
    const endTime = Date.now()
    const renderTime = endTime - startTime.current

    if (process.env.NODE_ENV === 'development') {
      console.log(`[Performance] ${componentName}:`, {
        renderCount: renderCount.current,
        renderTime: `${renderTime}ms`,
        timestamp: new Date().toISOString()
      })
    }

    startTime.current = endTime
  })

  return {
    renderCount: renderCount.current
  }
}

// Memory usage monitoring hook
export function useMemoryMonitor() {
  const [memoryInfo, setMemoryInfo] = useState<{
    usedJSHeapSize?: number
    totalJSHeapSize?: number
    jsHeapSizeLimit?: number
  }>({})

  useEffect(() => {
    const updateMemoryInfo = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory
        setMemoryInfo({
          usedJSHeapSize: memory.usedJSHeapSize,
          totalJSHeapSize: memory.totalJSHeapSize,
          jsHeapSizeLimit: memory.jsHeapSizeLimit
        })
      }
    }

    updateMemoryInfo()
    const interval = setInterval(updateMemoryInfo, 5000) // Update every 5 seconds

    return () => clearInterval(interval)
  }, [])

  return memoryInfo
}

// Optimized state update hook
export function useOptimizedState<T>(
  initialState: T,
  isEqual?: (a: T, b: T) => boolean
) {
  const [state, setState] = useState(initialState)
  const previousState = useRef(initialState)

  const optimizedSetState = useCallback((newState: T | ((prev: T) => T)) => {
    setState(prevState => {
      const nextState = typeof newState === 'function' 
        ? (newState as (prev: T) => T)(prevState)
        : newState

      // Use custom equality function or shallow comparison
      const areEqual = isEqual 
        ? isEqual(prevState, nextState)
        : prevState === nextState

      if (areEqual) {
        return prevState // Don't update if values are equal
      }

      previousState.current = prevState
      return nextState
    })
  }, [isEqual])

  return [state, optimizedSetState, previousState.current] as const
}

// Batch updates hook
export function useBatchUpdates<T>() {
  const [updates, setUpdates] = useState<T[]>([])
  const timeoutRef = useRef<NodeJS.Timeout>()

  const addUpdate = useCallback((update: T) => {
    setUpdates(prev => [...prev, update])

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Batch updates and process them after a delay
    timeoutRef.current = setTimeout(() => {
      setUpdates([])
    }, 100) // 100ms batch window
  }, [])

  const clearUpdates = useCallback(() => {
    setUpdates([])
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
  }, [])

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return {
    updates,
    addUpdate,
    clearUpdates,
    hasUpdates: updates.length > 0
  }
}