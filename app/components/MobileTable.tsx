'use client'

import React from 'react'
import { cn } from '@/lib/utils'

interface MobileTableProps {
  children: React.ReactNode
  className?: string
}

export function MobileTable({ children, className }: MobileTableProps) {
  return (
    <div className={cn("bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-100 overflow-hidden", className)}>
      {/* Desktop table */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full">
          {children}
        </table>
      </div>
      
      {/* Mobile card view */}
      <div className="lg:hidden">
        {children}
      </div>
    </div>
  )
}

interface MobileTableHeaderProps {
  children: React.ReactNode
  className?: string
}

export function MobileTableHeader({ children, className }: MobileTableHeaderProps) {
  return (
    <thead className={cn("bg-gray-50 hidden lg:table-header-group", className)}>
      {children}
    </thead>
  )
}

interface MobileTableBodyProps {
  children: React.ReactNode
  className?: string
}

export function MobileTableBody({ children, className }: MobileTableBodyProps) {
  return (
    <tbody className={cn("bg-white divide-y divide-gray-200 hidden lg:table-row-group", className)}>
      {children}
    </tbody>
  )
}

interface MobileTableRowProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
}

export function MobileTableRow({ children, className, onClick }: MobileTableRowProps) {
  return (
    <tr 
      className={cn("hover:bg-gray-50 hidden lg:table-row", className)}
      onClick={onClick}
    >
      {children}
    </tr>
  )
}

interface MobileTableCellProps {
  children: React.ReactNode
  className?: string
}

export function MobileTableCell({ children, className }: MobileTableCellProps) {
  return (
    <td className={cn("px-6 py-4 whitespace-nowrap hidden lg:table-cell", className)}>
      {children}
    </td>
  )
}

interface MobileTableHeaderCellProps {
  children: React.ReactNode
  className?: string
}

export function MobileTableHeaderCell({ children, className }: MobileTableHeaderCellProps) {
  return (
    <th className={cn("px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell", className)}>
      {children}
    </th>
  )
}

// Mobile card component for table rows
interface MobileCardRowProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
}

export function MobileCardRow({ children, className, onClick }: MobileCardRowProps) {
  return (
    <div 
      className={cn(
        "lg:hidden p-4 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors",
        onClick && "cursor-pointer",
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  )
}

// Responsive grid for mobile cards
interface ResponsiveCardGridProps {
  children: React.ReactNode
  className?: string
}

export function ResponsiveCardGrid({ children, className }: ResponsiveCardGridProps) {
  return (
    <div className={cn("lg:hidden space-y-3 sm:space-y-4", className)}>
      {children}
    </div>
  )
}

// Individual mobile card
interface MobileCardProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
}

export function MobileCard({ children, className, onClick }: MobileCardProps) {
  return (
    <div 
      className={cn(
        "bg-white rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow",
        onClick && "cursor-pointer hover:border-primary-300",
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  )
}

// Mobile card header
interface MobileCardHeaderProps {
  title: string
  subtitle?: string
  badge?: React.ReactNode
  actions?: React.ReactNode
}

export function MobileCardHeader({ title, subtitle, badge, actions }: MobileCardHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2 mb-1">
          <h3 className="text-sm font-medium text-gray-900 truncate">{title}</h3>
          {badge}
        </div>
        {subtitle && (
          <p className="text-xs text-gray-500 truncate">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center space-x-1 ml-2">
          {actions}
        </div>
      )}
    </div>
  )
}

// Mobile card content
interface MobileCardContentProps {
  children: React.ReactNode
  className?: string
}

export function MobileCardContent({ children, className }: MobileCardContentProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {children}
    </div>
  )
}

// Mobile card field
interface MobileCardFieldProps {
  label: string
  value: React.ReactNode
  icon?: React.ReactNode
}

export function MobileCardField({ label, value, icon }: MobileCardFieldProps) {
  return (
    <div className="flex items-center justify-between text-sm">
      <div className="flex items-center space-x-2 text-gray-500">
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-gray-900 font-medium">
        {value}
      </div>
    </div>
  )
}

// Mobile card actions
interface MobileCardActionsProps {
  children: React.ReactNode
  className?: string
}

export function MobileCardActions({ children, className }: MobileCardActionsProps) {
  return (
    <div className={cn("flex items-center justify-end space-x-2 pt-3 border-t border-gray-100", className)}>
      {children}
    </div>
  )
}