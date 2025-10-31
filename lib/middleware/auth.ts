import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth, hasPermission, isAdmin, AuthUser } from '@/lib/auth'

// Extended request type with user
export interface AuthenticatedRequest extends NextRequest {
  user: AuthUser
}

// Simple auth middleware - verifies user is authenticated
export async function withAuth(
  handler: (request: AuthenticatedRequest) => Promise<NextResponse>
) {
  return async (request: NextRequest) => {
    const user = await verifyAuth(request)
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      )
    }

    const authRequest = request as AuthenticatedRequest
    authRequest.user = user
    
    return handler(authRequest)
  }
}

// Permission-based middleware
export async function withAuthAndPermissions(
  permissions: string[],
  handler: (request: AuthenticatedRequest) => Promise<NextResponse>
) {
  return async (request: NextRequest) => {
    const user = await verifyAuth(request)
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check if user has all required permissions
    const hasAllPermissions = permissions.every(permission => 
      hasPermission(user, permission)
    )

    if (!hasAllPermissions) {
      return NextResponse.json(
        { success: false, message: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const authRequest = request as AuthenticatedRequest
    authRequest.user = user
    
    return handler(authRequest)
  }
}

// Role-based middleware
export async function withAuthAndRole(
  handler: (request: AuthenticatedRequest) => Promise<NextResponse>,
  requiredRole?: 'ADMIN' | 'EMPLOYEE'
) {
  return async (request: NextRequest) => {
    const user = await verifyAuth(request)
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      )
    }

    if (requiredRole && user.role !== requiredRole) {
      return NextResponse.json(
        { success: false, message: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const authRequest = request as AuthenticatedRequest
    authRequest.user = user
    
    return handler(authRequest)
  }
}

// Admin-only middleware
export async function withAdminRole(
  handler: (request: AuthenticatedRequest) => Promise<NextResponse>
) {
  return withAuthAndRole(handler, 'ADMIN')
}

// Simple auth middleware (alias for compatibility)
export const authMiddleware = withAuth

// Export verifyAuth for direct use
export { verifyAuth }
