import { NextRequest, NextResponse } from 'next/server'
import { verifyTokenSimple } from './lib/jwt-edge'

// Define protected routes and their required roles/permissions
const PROTECTED_ROUTES = {
  // Admin-only routes
  '/admin/campaigns': ['ADMIN'],
  '/admin/contacts': ['ADMIN'],
  '/admin/import': ['ADMIN'],
  '/admin/analytics': ['ADMIN'],
  '/admin/automation': ['ADMIN'],
  '/admin/settings': ['ADMIN'],
  
  // Admin and Employee routes
  '/admin/dashboard': ['ADMIN', 'EMPLOYEE'],
  '/admin/messages': ['ADMIN', 'EMPLOYEE'],
  '/admin/leads': ['ADMIN', 'EMPLOYEE'],
  
  // API routes protection
  '/api/campaigns': ['ADMIN'],
  '/api/contacts': ['ADMIN'],
  '/api/automations': ['ADMIN'],
  '/api/analytics': ['ADMIN'],
  '/api/dashboard/stats': ['ADMIN', 'EMPLOYEE'],
  '/api/messages': ['ADMIN', 'EMPLOYEE'],
  '/api/leads': ['ADMIN', 'EMPLOYEE'],
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Skip middleware for public routes, static files, auth routes, and test routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('.') ||
    pathname === '/admin' || // Only skip the login page
    pathname.startsWith('/api/auth/') ||
    pathname.startsWith('/api/test/') ||
    !pathname.startsWith('/admin') && !pathname.startsWith('/api/')
  ) {
    const response = NextResponse.next()
    // Add basic security headers
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('X-XSS-Protection', '1; mode=block')
    return response
  }

  // Check if route requires authentication
  const requiredRoles = getRequiredRoles(pathname)
  if (!requiredRoles) {
    return NextResponse.next()
  }

  // Get token from cookie or Authorization header
  const token = request.cookies.get('auth-token')?.value || 
                request.headers.get('authorization')?.replace('Bearer ', '')

  if (!token) {
    // Redirect to login for admin routes
    if (pathname.startsWith('/admin')) {
      return NextResponse.redirect(new URL('/admin', request.url))
    }
    // Return 401 for API routes
    return NextResponse.json(
      { success: false, message: 'Authentication required' },
      { status: 401 }
    )
  }

  // Verify token (simple verification for Edge Runtime)
  const payload = verifyTokenSimple(token)
  if (!payload) {
    // Clear invalid token and redirect
    const response = pathname.startsWith('/admin')
      ? NextResponse.redirect(new URL('/admin', request.url))
      : NextResponse.json(
          { success: false, message: 'Invalid token' },
          { status: 401 }
        )
    
    response.cookies.delete('auth-token')
    return response
  }

  // Check role authorization
  if (!requiredRoles.includes(payload.role)) {
    if (pathname.startsWith('/admin')) {
      // Redirect to dashboard if user doesn't have access to specific admin page
      console.log(`🔄 Middleware: User ${payload.email} (${payload.role}) denied access to ${pathname}, redirecting to dashboard`)
      return NextResponse.redirect(new URL('/admin/dashboard', request.url))
    }
    return NextResponse.json(
      { success: false, message: 'Insufficient permissions' },
      { status: 403 }
    )
  }

  // Add user info to request headers for API routes
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-user-id', payload.userId)
  requestHeaders.set('x-user-role', payload.role)
  requestHeaders.set('x-user-email', payload.email)

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })

  // Add basic security headers
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  
  return response
}

function getRequiredRoles(pathname: string): string[] | null {
  // Check exact matches first
  if (PROTECTED_ROUTES[pathname as keyof typeof PROTECTED_ROUTES]) {
    return PROTECTED_ROUTES[pathname as keyof typeof PROTECTED_ROUTES]
  }

  // Check for pattern matches (e.g., /api/campaigns/123)
  for (const [route, roles] of Object.entries(PROTECTED_ROUTES)) {
    if (pathname.startsWith(route + '/') || pathname === route) {
      return roles
    }
  }

  // Special handling for admin routes - be more specific about what employees can access
  if (pathname.startsWith('/admin/')) {
    // Admin-only routes
    const adminOnlyRoutes = ['/admin/campaigns', '/admin/contacts', '/admin/import', '/admin/analytics', '/admin/automation', '/admin/settings']
    if (adminOnlyRoutes.some(route => pathname.startsWith(route))) {
      return ['ADMIN']
    }
    
    // Employee accessible routes
    const employeeRoutes = ['/admin/dashboard', '/admin/messages', '/admin/leads']
    if (employeeRoutes.some(route => pathname.startsWith(route))) {
      return ['ADMIN', 'EMPLOYEE']
    }
    
    // Default for other admin routes - allow both roles
    return ['ADMIN', 'EMPLOYEE']
  }

  // Special handling for API routes
  if (pathname.startsWith('/api/')) {
    // Admin-only API routes
    const adminOnlyApiRoutes = ['/api/campaigns', '/api/contacts', '/api/automations', '/api/analytics']
    if (adminOnlyApiRoutes.some(route => pathname.startsWith(route))) {
      return ['ADMIN']
    }
    
    // Employee accessible API routes
    const employeeApiRoutes = ['/api/dashboard', '/api/messages', '/api/leads']
    if (employeeApiRoutes.some(route => pathname.startsWith(route))) {
      return ['ADMIN', 'EMPLOYEE']
    }
    
    // Default for other API routes - allow both roles
    return ['ADMIN', 'EMPLOYEE']
  }

  return null
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
}