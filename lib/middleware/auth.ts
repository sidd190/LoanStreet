import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, extractTokenFromRequest, getUserById, AuthUser, JWTPayload } from '../auth'

export interface AuthenticatedRequest extends NextRequest {
  user?: AuthUser
}

/**
 * Authentication middleware for API routes
 */
export async function withAuth(
  request: NextRequest,
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    const token = extractTokenFromRequest(request)
    
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Authentication token required' },
        { status: 401 }
      )
    }
    
    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json(
        { success: false, message: 'Invalid or expired token' },
        { status: 401 }
      )
    }
    
    // Get fresh user data to ensure user is still active
    const user = await getUserById(payload.userId)
    if (!user || !user.isActive) {
      return NextResponse.json(
        { success: false, message: 'User account is inactive' },
        { status: 401 }
      )
    }
    
    // Add user to request object
    const authenticatedRequest = request as AuthenticatedRequest
    authenticatedRequest.user = user
    
    return handler(authenticatedRequest)
  } catch (error) {
    console.error('Authentication middleware error:', error)
    return NextResponse.json(
      { success: false, message: 'Authentication failed' },
      { status: 500 }
    )
  }
}

/**
 * Authorization middleware for checking permissions
 */
export function withPermissions(
  requiredPermissions: string[],
  requireAll: boolean = false
) {
  return async (
    request: AuthenticatedRequest,
    handler: (req: AuthenticatedRequest) => Promise<NextResponse>
  ): Promise<NextResponse> => {
    if (!request.user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      )
    }
    
    const userPermissions = request.user.permissions
    const hasRequiredPermissions = requireAll
      ? requiredPermissions.every(permission => userPermissions.includes(permission))
      : requiredPermissions.some(permission => userPermissions.includes(permission))
    
    if (!hasRequiredPermissions) {
      return NextResponse.json(
        { success: false, message: 'Insufficient permissions' },
        { status: 403 }
      )
    }
    
    return handler(request)
  }
}

/**
 * Role-based authorization middleware
 */
export function withRole(allowedRoles: ('ADMIN' | 'EMPLOYEE')[]) {
  return async (
    request: AuthenticatedRequest,
    handler: (req: AuthenticatedRequest) => Promise<NextResponse>
  ): Promise<NextResponse> => {
    if (!request.user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      )
    }
    
    if (!allowedRoles.includes(request.user.role)) {
      return NextResponse.json(
        { success: false, message: 'Access denied for your role' },
        { status: 403 }
      )
    }
    
    return handler(request)
  }
}

/**
 * Combined authentication and authorization middleware
 */
export function withAuthAndPermissions(
  requiredPermissions: string[],
  requireAll: boolean = false
) {
  return async (
    request: NextRequest,
    handler: (req: AuthenticatedRequest) => Promise<NextResponse>
  ): Promise<NextResponse> => {
    return withAuth(request, async (authReq) => {
      return withPermissions(requiredPermissions, requireAll)(authReq, handler)
    })
  }
}

/**
 * Combined authentication and role middleware
 */
export function withAuthAndRole(allowedRoles: ('ADMIN' | 'EMPLOYEE')[]) {
  return async (
    request: NextRequest,
    handler: (req: AuthenticatedRequest) => Promise<NextResponse>
  ): Promise<NextResponse> => {
    return withAuth(request, async (authReq) => {
      return withRole(allowedRoles)(authReq, handler)
    })
  }
}

/**
 * Optional authentication middleware (doesn't fail if no token)
 */
export async function withOptionalAuth(
  request: NextRequest,
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    const token = extractTokenFromRequest(request)
    const authenticatedRequest = request as AuthenticatedRequest
    
    if (token) {
      const payload = verifyToken(token)
      if (payload) {
        const user = await getUserById(payload.userId)
        if (user && user.isActive) {
          authenticatedRequest.user = user
        }
      }
    }
    
    return handler(authenticatedRequest)
  } catch (error) {
    console.error('Optional auth middleware error:', error)
    // Continue without authentication
    return handler(request as AuthenticatedRequest)
  }
}

/**
 * Simple authentication function that returns result
 */
export async function authMiddleware(request: NextRequest): Promise<{
  success: boolean;
  user?: AuthUser;
  error?: string;
}> {
  try {
    const token = extractTokenFromRequest(request)
    
    if (!token) {
      return { success: false, error: 'Authentication token required' }
    }
    
    const payload = verifyToken(token)
    if (!payload) {
      return { success: false, error: 'Invalid or expired token' }
    }
    
    // Get fresh user data to ensure user is still active
    const user = await getUserById(payload.userId)
    if (!user || !user.isActive) {
      return { success: false, error: 'User account is inactive' }
    }
    
    return { success: true, user }
  } catch (error) {
    console.error('Authentication middleware error:', error)
    return { success: false, error: 'Authentication failed' }
  }
}