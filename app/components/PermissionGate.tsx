'use client'

import { AuthUser } from '@/lib/auth'
import { checkAnyPermission, checkAllPermissions, isAdmin, isEmployee } from '@/lib/permissions'

interface PermissionGateProps {
  user: AuthUser | null
  permissions?: string[]
  roles?: ('ADMIN' | 'EMPLOYEE')[]
  requireAll?: boolean
  fallback?: React.ReactNode
  children: React.ReactNode
}

/**
 * Component that conditionally renders children based on user permissions
 */
export default function PermissionGate({
  user,
  permissions = [],
  roles = [],
  requireAll = false,
  fallback = null,
  children
}: PermissionGateProps) {
  // Check if user is authenticated and active
  if (!user || !user.isActive) {
    return <>{fallback}</>
  }

  // Check role-based access
  if (roles.length > 0) {
    const hasRole = roles.includes(user.role)
    if (!hasRole) {
      return <>{fallback}</>
    }
  }

  // Check permission-based access
  if (permissions.length > 0) {
    const permissionCheck = requireAll
      ? checkAllPermissions(user, permissions)
      : checkAnyPermission(user, permissions)

    if (!permissionCheck.hasPermission) {
      return <>{fallback}</>
    }
  }

  return <>{children}</>
}

/**
 * Component that renders content only for admin users
 */
export function AdminOnly({ 
  user, 
  fallback = null, 
  children 
}: { 
  user: AuthUser | null
  fallback?: React.ReactNode
  children: React.ReactNode 
}) {
  return (
    <PermissionGate user={user} roles={['ADMIN']} fallback={fallback}>
      {children}
    </PermissionGate>
  )
}

/**
 * Component that renders content only for employee users
 */
export function EmployeeOnly({ 
  user, 
  fallback = null, 
  children 
}: { 
  user: AuthUser | null
  fallback?: React.ReactNode
  children: React.ReactNode 
}) {
  return (
    <PermissionGate user={user} roles={['EMPLOYEE']} fallback={fallback}>
      {children}
    </PermissionGate>
  )
}

/**
 * Component that renders different content based on user role
 */
export function RoleBasedContent({
  user,
  adminContent,
  employeeContent,
  fallback = null
}: {
  user: AuthUser | null
  adminContent?: React.ReactNode
  employeeContent?: React.ReactNode
  fallback?: React.ReactNode
}) {
  if (!user || !user.isActive) {
    return <>{fallback}</>
  }

  if (isAdmin(user) && adminContent) {
    return <>{adminContent}</>
  }

  if (isEmployee(user) && employeeContent) {
    return <>{employeeContent}</>
  }

  return <>{fallback}</>
}