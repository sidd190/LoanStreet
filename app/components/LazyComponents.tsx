'use client'

import React, { Suspense, lazy } from 'react'
import { LoadingSpinner, Skeleton } from './LoadingStates'

// Lazy load heavy components
export const LazyContactForm = lazy(() => import('../admin/contacts/components/ContactForm'))
export const LazyContactDetailView = lazy(() => import('../admin/contacts/components/ContactDetailView'))
export const LazyBulkOperationsPanel = lazy(() => import('../admin/contacts/components/BulkOperationsPanel'))
export const LazyAdvancedSearchFilter = lazy(() => import('../admin/contacts/components/AdvancedSearchFilter'))
export const LazyImportExportModal = lazy(() => import('../admin/contacts/components/ImportExportModal'))

export const LazyCampaignProgress = lazy(() => import('../admin/campaigns/components/CampaignProgress'))
export const LazyCampaignAnalytics = lazy(() => import('../admin/campaigns/components/CampaignAnalytics'))

export const LazyChatInterface = lazy(() => import('../admin/messages/components/ChatInterface'))
export const LazyConversationView = lazy(() => import('../admin/messages/components/ConversationView'))

export const LazyAutomationRuleBuilder = lazy(() => import('../admin/automation/components/AutomationRuleBuilder'))
export const LazyAutomationMonitoring = lazy(() => import('../admin/automation/components/AutomationMonitoring'))

// Wrapper component for lazy loading with fallback
interface LazyWrapperProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  skeleton?: boolean
  skeletonLines?: number
}

export function LazyWrapper({ 
  children, 
  fallback, 
  skeleton = true, 
  skeletonLines = 3 
}: LazyWrapperProps) {
  const defaultFallback = skeleton ? (
    <div className="p-4">
      <Skeleton lines={skeletonLines} />
    </div>
  ) : (
    <div className="flex items-center justify-center p-8">
      <LoadingSpinner size="lg" />
    </div>
  )

  return (
    <Suspense fallback={fallback || defaultFallback}>
      {children}
    </Suspense>
  )
}

// Lazy component factory
export function createLazyComponent<T extends React.ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  fallbackComponent?: React.ComponentType
) {
  const LazyComponent = lazy(importFn)
  
  return React.forwardRef<any, React.ComponentProps<T>>((props, ref) => (
    <Suspense fallback={
      fallbackComponent ? 
        React.createElement(fallbackComponent) : 
        <div className="flex items-center justify-center p-4">
          <LoadingSpinner />
        </div>
    }>
      <LazyComponent {...props} ref={ref} />
    </Suspense>
  ))
}

// Intersection Observer based lazy loading
interface LazyLoadOnScrollProps {
  children: React.ReactNode
  threshold?: number
  rootMargin?: string
  fallback?: React.ReactNode
  className?: string
}

export function LazyLoadOnScroll({ 
  children, 
  threshold = 0.1, 
  rootMargin = '50px',
  fallback,
  className 
}: LazyLoadOnScrollProps) {
  const [isVisible, setIsVisible] = React.useState(false)
  const [hasLoaded, setHasLoaded] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasLoaded) {
          setIsVisible(true)
          setHasLoaded(true)
        }
      },
      { threshold, rootMargin }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current)
      }
    }
  }, [threshold, rootMargin, hasLoaded])

  return (
    <div ref={ref} className={className}>
      {isVisible ? children : (fallback || <div className="h-32 bg-gray-100 animate-pulse rounded" />)}
    </div>
  )
}

// Image lazy loading component
interface LazyImageProps {
  src: string
  alt: string
  className?: string
  placeholder?: string
  onLoad?: () => void
  onError?: () => void
}

export function LazyImage({ 
  src, 
  alt, 
  className, 
  placeholder,
  onLoad,
  onError 
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = React.useState(false)
  const [hasError, setHasError] = React.useState(false)
  const [isInView, setIsInView] = React.useState(false)
  const imgRef = React.useRef<HTMLImageElement>(null)

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true)
          observer.disconnect()
        }
      },
      { threshold: 0.1, rootMargin: '50px' }
    )

    if (imgRef.current) {
      observer.observe(imgRef.current)
    }

    return () => observer.disconnect()
  }, [])

  const handleLoad = () => {
    setIsLoaded(true)
    onLoad?.()
  }

  const handleError = () => {
    setHasError(true)
    onError?.()
  }

  return (
    <div ref={imgRef} className={className}>
      {!isInView ? (
        <div className="w-full h-full bg-gray-200 animate-pulse rounded" />
      ) : hasError ? (
        <div className="w-full h-full bg-gray-100 flex items-center justify-center rounded">
          <span className="text-gray-400 text-sm">Failed to load</span>
        </div>
      ) : (
        <>
          {!isLoaded && (
            <div className="w-full h-full bg-gray-200 animate-pulse rounded absolute inset-0" />
          )}
          <img
            src={src}
            alt={alt}
            className={`${className} ${isLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
            onLoad={handleLoad}
            onError={handleError}
            loading="lazy"
          />
        </>
      )}
    </div>
  )
}