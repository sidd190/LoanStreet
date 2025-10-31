import { NextRequest, NextResponse } from 'next/server'
import { verifyTokenSimple } from './lib/jwt-edge'



export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Skip middleware for public routes, static files, auth routes, and test routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.startsWith('/public') ||
    pathname.includes('.') ||
    pathname === '/' ||
    pathname === '/admin' || // Only skip the login page
    pathname.startsWith('/api/auth/') ||
    pathname.startsWith('/api/test/') ||
    pathname.startsWith('/api/whatsapp/') ||
    !pathname.startsWith('/admin') && !pathname.startsWith('/api/')
  ) {
    const response = NextResponse.next()
    // Add basic security headers
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('X-XSS-Protection', '1; mode=block')
    return response
  }

  // For admin pages, check authentication but be more lenient
  if (pathname.startsWith('/admin/')) {
    const token = request.cookies.get('auth-token')?.value
    
    if (!token) {
      return NextResponse.redirect(new URL('/admin', request.url))
    }

    // Simple token validation
    const payload = verifyTokenSimple(token)
    if (!payload) {
      const response = NextResponse.redirect(new URL('/admin', request.url))
      response.cookies.delete('auth-token')
      return response
    }

    // Check admin-only routes
    const adminOnlyRoutes = ['/admin/campaigns', '/admin/contacts', '/admin/import', '/admin/analytics', '/admin/automation', '/admin/settings']
    if (adminOnlyRoutes.some(route => pathname.startsWith(route)) && payload.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url))
    }

    // Allow access to the page
    return NextResponse.next()
  }

  // For API routes, check authentication
  if (pathname.startsWith('/api/')) {
    const token = request.cookies.get('auth-token')?.value || 
                  request.headers.get('authorization')?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      )
    }

    const payload = verifyTokenSimple(token)
    if (!payload) {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      )
    }

    // Check admin-only API routes
    const adminOnlyApiRoutes = ['/api/campaigns', '/api/contacts', '/api/automations', '/api/analytics']
    if (adminOnlyApiRoutes.some(route => pathname.startsWith(route)) && payload.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Admin access required' },
        { status: 403 }
      )
    }

    // Add user info to request headers
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-user-id', payload.userId)
    requestHeaders.set('x-user-role', payload.role)
    requestHeaders.set('x-user-email', payload.email)

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
  }

  // Default: allow access
  return NextResponse.next()
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