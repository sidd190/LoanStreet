'use client'

import { AuthUser, hasPermission, isAdmin } from '@/lib/auth'

interface PermissionGateProps {
  user: AuthUser | null
  permission?: string
  adminOnly?: boolean
  fallback?: React.ReactNode
  children: React.ReactNode
}

export default function PermissionGate({
  user,
  permission,
  adminOnly = false,
  fallback = null,
  children
}: PermissionGateProps) {
  if (!user) {
    return <>{fallback}</>
  }

  if (adminOnly && !isAdmin(user)) {
    return <>{fallback}</>
  }

  if (permission && !hasPermission(user, permission)) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

// Convenience components
export function AdminOnly({ user, children, fallback = null }: {
  user: AuthUser | null
  children: React.ReactNode
  fallback?: React.ReactNode
}) {
  return (
    <PermissionGate user={user} adminOnly fallback={fallback}>
      {children}
    </PermissionGate>
  )
}