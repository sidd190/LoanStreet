import { AuthUser, PERMISSIONS } from './auth'

/**
 * Permission checking utilities for components and API routes
 */

export interface PermissionCheck {
  hasPermission: boolean
  missingPermissions: string[]
}

/**
 * Check if user has specific permission
 */
export function checkPermission(user: AuthUser | null, permission: string): boolean {
  if (!user) return false
  return user.permissions.includes(permission)
}

/**
 * Check if user has any of the specified permissions
 */
export function checkAnyPermission(user: AuthUser | null, permissions: string[]): PermissionCheck {
  if (!user) {
    return { hasPermission: false, missingPermissions: permissions }
  }

  const hasAny = permissions.some(permission => user.permissions.includes(permission))
  const missing = permissions.filter(permission => !user.permissions.includes(permission))

  return {
    hasPermission: hasAny,
    missingPermissions: missing
  }
}

/**
 * Check if user has all specified permissions
 */
export function checkAllPermissions(user: AuthUser | null, permissions: string[]): PermissionCheck {
  if (!user) {
    return { hasPermission: false, missingPermissions: permissions }
  }

  const missing = permissions.filter(permission => !user.permissions.includes(permission))

  return {
    hasPermission: missing.length === 0,
    missingPermissions: missing
  }
}

/**
 * Check if user has admin role
 */
export function isAdmin(user: AuthUser | null): boolean {
  return user?.role === 'ADMIN'
}

/**
 * Check if user has employee role
 */
export function isEmployee(user: AuthUser | null): boolean {
  return user?.role === 'EMPLOYEE'
}

/**
 * Get user's accessible navigation items based on permissions
 */
export function getAccessibleNavItems(user: AuthUser | null) {
  if (!user) return []

  const navItems = [
    {
      name: 'Dashboard',
      href: '/admin/dashboard',
      icon: 'LayoutDashboard',
      requiredPermissions: [], // Always accessible to authenticated users
    },
    {
      name: 'Campaigns',
      href: '/admin/campaigns',
      icon: 'Target',
      requiredPermissions: [PERMISSIONS.CAMPAIGN_READ],
    },
    {
      name: 'Messages',
      href: '/admin/messages',
      icon: 'MessageSquare',
      requiredPermissions: [PERMISSIONS.MESSAGE_READ],
    },
    {
      name: 'Contacts',
      href: '/admin/contacts',
      icon: 'Users',
      requiredPermissions: [PERMISSIONS.CONTACT_READ],
    },
    {
      name: 'Leads',
      href: '/admin/leads',
      icon: 'Phone',
      requiredPermissions: [PERMISSIONS.LEAD_READ],
    },
    {
      name: 'Data Import',
      href: '/admin/import',
      icon: 'Upload',
      requiredPermissions: [PERMISSIONS.CONTACT_IMPORT],
    },
    {
      name: 'Analytics',
      href: '/admin/analytics',
      icon: 'BarChart3',
      requiredPermissions: [PERMISSIONS.ANALYTICS_READ],
    },
    {
      name: 'Automation',
      href: '/admin/automation',
      icon: 'Calendar',
      requiredPermissions: [PERMISSIONS.AUTOMATION_MANAGE],
    },
    {
      name: 'Settings',
      href: '/admin/settings',
      icon: 'Settings',
      requiredPermissions: [PERMISSIONS.SYSTEM_SETTINGS],
    }
  ]

  return navItems.filter(item => {
    if (item.requiredPermissions.length === 0) return true
    return checkAnyPermission(user, item.requiredPermissions).hasPermission
  })
}

/**
 * Feature flags based on user permissions
 */
export function getFeatureFlags(user: AuthUser | null) {
  if (!user) {
    return {
      canCreateCampaigns: false,
      canImportContacts: false,
      canManageUsers: false,
      canViewAnalytics: false,
      canManageAutomation: false,
      canSendMessages: false,
      canReplyToMessages: false,
      canManageLeads: false,
      canExportData: false,
    }
  }

  return {
    canCreateCampaigns: checkPermission(user, PERMISSIONS.CAMPAIGN_CREATE),
    canImportContacts: checkPermission(user, PERMISSIONS.CONTACT_IMPORT),
    canManageUsers: checkPermission(user, PERMISSIONS.USER_MANAGE),
    canViewAnalytics: checkPermission(user, PERMISSIONS.ANALYTICS_READ),
    canManageAutomation: checkPermission(user, PERMISSIONS.AUTOMATION_MANAGE),
    canSendMessages: checkPermission(user, PERMISSIONS.MESSAGE_SEND),
    canReplyToMessages: checkPermission(user, PERMISSIONS.MESSAGE_REPLY),
    canManageLeads: checkPermission(user, PERMISSIONS.LEAD_UPDATE),
    canExportData: checkPermission(user, PERMISSIONS.ANALYTICS_EXPORT),
  }
}

/**
 * Permission-based component visibility props interface
 */
export interface PermissionGateProps {
  user: AuthUser | null
  permissions?: string[]
  roles?: ('ADMIN' | 'EMPLOYEE')[]
  requireAll?: boolean
}

/**
 * Check if user has required permissions for HOC usage
 */
export function hasRequiredPermissions(
  user: AuthUser | null,
  requiredPermissions: string[],
  requireAll: boolean = false
): boolean {
  if (!user) {
    return false
  }

  return requireAll
    ? checkAllPermissions(user, requiredPermissions).hasPermission
    : checkAnyPermission(user, requiredPermissions).hasPermission
}

/**
 * Route-level permission validation with employee restrictions
 */
export function validateRoutePermissions(
  user: AuthUser | null,
  route: string
): { allowed: boolean; redirectTo?: string; reason?: string } {
  if (!user) {
    return { allowed: false, redirectTo: '/admin', reason: 'Authentication required' }
  }

  // Define route permissions and employee restrictions
  const routePermissions: { [key: string]: { 
    permissions: string[], 
    employeeBlocked?: boolean,
    adminOnly?: boolean 
  } } = {
    '/admin/campaigns': { 
      permissions: [PERMISSIONS.CAMPAIGN_READ], 
      employeeBlocked: true,
      adminOnly: true
    },
    '/admin/campaigns/create': { 
      permissions: [PERMISSIONS.CAMPAIGN_CREATE], 
      employeeBlocked: true,
      adminOnly: true
    },
    '/admin/campaigns/[id]/edit': { 
      permissions: [PERMISSIONS.CAMPAIGN_UPDATE], 
      employeeBlocked: true,
      adminOnly: true
    },
    '/admin/contacts': { 
      permissions: [PERMISSIONS.CONTACT_READ], 
      employeeBlocked: true,
      adminOnly: true
    },
    '/admin/import': { 
      permissions: [PERMISSIONS.CONTACT_IMPORT], 
      employeeBlocked: true,
      adminOnly: true
    },
    '/admin/analytics': { 
      permissions: [PERMISSIONS.ANALYTICS_READ], 
      employeeBlocked: true,
      adminOnly: true
    },
    '/admin/automation': { 
      permissions: [PERMISSIONS.AUTOMATION_MANAGE], 
      employeeBlocked: true,
      adminOnly: true
    },
    '/admin/settings': { 
      permissions: [PERMISSIONS.SYSTEM_SETTINGS], 
      employeeBlocked: true,
      adminOnly: true
    },
    '/admin/messages': { 
      permissions: [PERMISSIONS.MESSAGE_READ]
    },
    '/admin/leads': { 
      permissions: [PERMISSIONS.LEAD_READ]
    },
    '/admin/dashboard': { 
      permissions: [] // Always accessible to authenticated users
    }
  }

  // Check for exact route match first
  let routeConfig = routePermissions[route]
  
  // If no exact match, check for pattern matches
  if (!routeConfig) {
    for (const [pattern, config] of Object.entries(routePermissions)) {
      if (pattern.includes('[id]')) {
        const regex = new RegExp(pattern.replace(/\[id\]/g, '[^/]+'))
        if (regex.test(route)) {
          routeConfig = config
          break
        }
      }
    }
  }

  // If no route config found, allow access (default behavior)
  if (!routeConfig) {
    return { allowed: true }
  }

  // Check employee restrictions
  if (user.role === 'EMPLOYEE') {
    if (routeConfig.employeeBlocked || routeConfig.adminOnly) {
      return { 
        allowed: false, 
        redirectTo: '/admin/dashboard',
        reason: 'Access denied: Employee users cannot access this feature'
      }
    }
  }

  // Check permissions
  if (routeConfig.permissions.length > 0) {
    const hasPermission = checkAnyPermission(user, routeConfig.permissions).hasPermission
    if (!hasPermission) {
      return { 
        allowed: false, 
        redirectTo: '/admin/dashboard',
        reason: 'Insufficient permissions'
      }
    }
  }

  return { allowed: true }
}