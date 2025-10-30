'use client'

import React from 'react'

interface SkeletonProps {
  className?: string
  width?: string
  height?: string
  rounded?: boolean
}

export function Skeleton({ className = '', width, height, rounded = false }: SkeletonProps) {
  const baseClasses = 'animate-pulse bg-gray-200'
  const roundedClass = rounded ? 'rounded-full' : 'rounded'
  const sizeClasses = width || height ? '' : 'h-4 w-full'
  
  const style: React.CSSProperties = {}
  if (width) style.width = width
  if (height) style.height = height

  return (
    <div 
      className={`${baseClasses} ${roundedClass} ${sizeClasses} ${className}`}
      style={style}
    />
  )
}

export function StatCardSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <Skeleton className="h-4 w-24 mb-2" />
          <Skeleton className="h-8 w-16" />
        </div>
        <Skeleton className="w-12 h-12" rounded />
      </div>
      <div className="flex items-center mt-4">
        <Skeleton className="w-4 h-4 mr-2" />
        <Skeleton className="h-4 w-12 mr-2" />
        <Skeleton className="h-4 w-20" />
      </div>
    </div>
  )
}

export function ActivityItemSkeleton() {
  return (
    <div className="flex items-start space-x-3">
      <Skeleton className="w-2 h-2 mt-2" rounded />
      <div className="flex-1 min-w-0">
        <Skeleton className="h-4 w-full mb-1" />
        <Skeleton className="h-3 w-32" />
      </div>
    </div>
  )
}

export function ChartSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-6">
        <Skeleton className="h-6 w-40" />
        <div className="flex items-center space-x-2">
          <Skeleton className="h-8 w-12" />
          <Skeleton className="h-8 w-12" />
          <Skeleton className="h-8 w-12" />
        </div>
      </div>
      <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
        <div className="space-y-2 w-full px-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-end space-x-2">
              <Skeleton className={`w-8 h-${Math.floor(Math.random() * 20) + 10}`} />
              <Skeleton className={`w-8 h-${Math.floor(Math.random() * 20) + 10}`} />
              <Skeleton className={`w-8 h-${Math.floor(Math.random() * 20) + 10}`} />
              <Skeleton className={`w-8 h-${Math.floor(Math.random() * 20) + 10}`} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function QuickActionSkeleton() {
  return (
    <div className="flex flex-col items-center p-4 bg-gray-50 rounded-lg">
      <Skeleton className="w-8 h-8 mb-2" rounded />
      <Skeleton className="h-4 w-20" />
    </div>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="flex justify-between items-center">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-5 w-96" />
        </div>
        <div className="bg-white px-4 py-2 rounded-lg border border-gray-200">
          <div className="flex items-center space-x-2">
            <Skeleton className="w-4 h-4" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
      </div>

      {/* Stats Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>

      {/* Charts and Activity Skeleton */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Chart Skeleton */}
        <div className="lg:col-span-2">
          <ChartSkeleton />
        </div>

        {/* Activity Skeleton */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="w-5 h-5" />
          </div>
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <ActivityItemSkeleton key={i} />
            ))}
          </div>
          <Skeleton className="h-10 w-full mt-4" />
        </div>
      </div>

      {/* Quick Actions Skeleton */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <Skeleton className="h-6 w-32 mb-6" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <QuickActionSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  )
}