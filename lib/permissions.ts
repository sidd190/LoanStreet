import { AuthUser, hasPermission } from './auth'

// Route validation result
export interface RouteValidation {
  allowed: boolean
  redirectTo?: string
  message?: string
}

// Validate if user can access a route
export function validateRoutePermissions(
  user: AuthUser | null,
  pathname: string
): RouteValidation {
  if (!user) {
    return {
      allowed: false,
      redirectTo: '/admin',
      message: 'Authentication required'
    }
  }

  // Admin users have access to all routes
  if (user.role === 'ADMIN') {
    return { allowed: true }
  }

  // Employee route restrictions
  const employeeAllowedRoutes = [
    '/admin/dashboard',
    '/admin/messages',
    '/admin/leads'
  ]

  const isAllowed = employeeAllowedRoutes.some(route => 
    pathname.startsWith(route)
  )

  if (!isAllowed) {
    return {
      allowed: false,
      redirectTo: '/admin/dashboard',
      message: 'Access denied'
    }
  }

  return { allowed: true }
}

// Check if user has specific permission
export function checkPermission(user: AuthUser | null, permission: string): boolean {
  return hasPermission(user, permission)
}

// Get user's accessible routes
export function getAccessibleRoutes(user: AuthUser | null): string[] {
  if (!user) return []
  
  if (user.role === 'ADMIN') {
    return [
      '/admin/dashboard',
      '/admin/campaigns',
      '/admin/contacts',
      '/admin/messages',
      '/admin/leads',
      '/admin/analytics',
      '/admin/automation',
      '/admin/import',
      '/admin/settings'
    ]
  }

  return [
    '/admin/dashboard',
    '/admin/messages',
    '/admin/leads'
  ]
}
