'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { AuthUser } from '@/lib/auth'
import { validateRoutePermissions } from '@/lib/permissions'
import UnauthorizedAccess from './UnauthorizedAccess'

interface RouteProtectionProps {
  children: React.ReactNode
  requiredRole?: 'ADMIN' | 'EMPLOYEE'
  fallbackComponent?: React.ComponentType<any>
}

export default function RouteProtection({ 
  children, 
  requiredRole,
  fallbackComponent: FallbackComponent = UnauthorizedAccess
}: RouteProtectionProps) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [accessDenied, setAccessDenied] = useState(false)
  const [denialReason, setDenialReason] = useState('')
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    checkAccess()
  }, [pathname])

  const checkAccess = async () => {
    try {
      const token = localStorage.getItem('adminToken')
      if (!token) {
        router.push('/admin')
        return
      }

      const response = await fetch('/api/auth/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setUser(data.user)
          
          // Check role requirement
          if (requiredRole && data.user.role !== requiredRole) {
            setAccessDenied(true)
            setDenialReason(`This page requires ${requiredRole} role. You have ${data.user.role} role.`)
            setLoading(false)
            return
          }
          
          // Validate route permissions
          const routeValidation = validateRoutePermissions(data.user, pathname)
          if (!routeValidation.allowed) {
            if (routeValidation.redirectTo) {
              router.push(routeValidation.redirectTo)
              return
            } else {
              setAccessDenied(true)
              setDenialReason(routeValidation.reason || 'Access denied')
              setLoading(false)
              return
            }
          }
        } else {
          throw new Error('Invalid token')
        }
      } else {
        throw new Error('Authentication failed')
      }
    } catch (error) {
      console.error('Route protection check failed:', error)
      localStorage.removeItem('adminToken')
      localStorage.removeItem('userRole')
      router.push('/admin')
      return
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (accessDenied) {
    return (
      <FallbackComponent 
        reason={denialReason}
        userRole={user?.role}
        suggestedRoute="/admin/dashboard"
      />
    )
  }

  if (!user) {
    return null
  }

  return <>{children}</>
}

/**
 * Higher-order component for admin-only routes
 */
export function withAdminProtection<T extends object>(
  Component: React.ComponentType<T>
) {
  return function AdminProtectedComponent(props: T) {
    return (
      <RouteProtection requiredRole="ADMIN">
        <Component {...props} />
      </RouteProtection>
    )
  }
}

/**
 * Higher-order component for employee-accessible routes
 */
export function withEmployeeProtection<T extends object>(
  Component: React.ComponentType<T>
) {
  return function EmployeeProtectedComponent(props: T) {
    return (
      <RouteProtection>
        <Component {...props} />
      </RouteProtection>
    )
  }
}