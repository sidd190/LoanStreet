import jwt from 'jsonwebtoken'
import { NextRequest } from 'next/server'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

export interface AuthUser {
  id: string
  email: string
  name: string
  role: 'ADMIN' | 'EMPLOYEE'
  permissions: string[]
  isActive: boolean
  lastLogin?: Date
}

export interface JWTPayload {
  userId: string
  email: string
  role: 'ADMIN' | 'EMPLOYEE'
  permissions: string[]
  iat?: number
  exp?: number
}

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production'
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h'
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d'

// Role-based permissions
export const PERMISSIONS = {
  // Campaign permissions
  CAMPAIGN_CREATE: 'campaign:create',
  CAMPAIGN_READ: 'campaign:read',
  CAMPAIGN_UPDATE: 'campaign:update',
  CAMPAIGN_DELETE: 'campaign:delete',
  CAMPAIGN_EXECUTE: 'campaign:execute',
  
  // Contact permissions
  CONTACT_CREATE: 'contact:create',
  CONTACT_READ: 'contact:read',
  CONTACT_UPDATE: 'contact:update',
  CONTACT_DELETE: 'contact:delete',
  CONTACT_IMPORT: 'contact:import',
  
  // Message permissions
  MESSAGE_READ: 'message:read',
  MESSAGE_SEND: 'message:send',
  MESSAGE_REPLY: 'message:reply',
  
  // Lead permissions
  LEAD_CREATE: 'lead:create',
  LEAD_READ: 'lead:read',
  LEAD_UPDATE: 'lead:update',
  LEAD_DELETE: 'lead:delete',
  LEAD_ASSIGN: 'lead:assign',
  
  // Analytics permissions
  ANALYTICS_READ: 'analytics:read',
  ANALYTICS_EXPORT: 'analytics:export',
  
  // System permissions
  USER_MANAGE: 'user:manage',
  SYSTEM_SETTINGS: 'system:settings',
  AUTOMATION_MANAGE: 'automation:manage',
} as const

export const ROLE_PERMISSIONS = {
  ADMIN: [
    PERMISSIONS.CAMPAIGN_CREATE,
    PERMISSIONS.CAMPAIGN_READ,
    PERMISSIONS.CAMPAIGN_UPDATE,
    PERMISSIONS.CAMPAIGN_DELETE,
    PERMISSIONS.CAMPAIGN_EXECUTE,
    PERMISSIONS.CONTACT_CREATE,
    PERMISSIONS.CONTACT_READ,
    PERMISSIONS.CONTACT_UPDATE,
    PERMISSIONS.CONTACT_DELETE,
    PERMISSIONS.CONTACT_IMPORT,
    PERMISSIONS.MESSAGE_READ,
    PERMISSIONS.MESSAGE_SEND,
    PERMISSIONS.MESSAGE_REPLY,
    PERMISSIONS.LEAD_CREATE,
    PERMISSIONS.LEAD_READ,
    PERMISSIONS.LEAD_UPDATE,
    PERMISSIONS.LEAD_DELETE,
    PERMISSIONS.LEAD_ASSIGN,
    PERMISSIONS.ANALYTICS_READ,
    PERMISSIONS.ANALYTICS_EXPORT,
    PERMISSIONS.USER_MANAGE,
    PERMISSIONS.SYSTEM_SETTINGS,
    PERMISSIONS.AUTOMATION_MANAGE,
  ],
  EMPLOYEE: [
    PERMISSIONS.MESSAGE_READ,
    PERMISSIONS.MESSAGE_REPLY,
    PERMISSIONS.LEAD_READ,
    PERMISSIONS.LEAD_UPDATE,
  ],
} as const

/**
 * Generate JWT token for user
 */
export function generateToken(user: AuthUser): string {
  const payload: JWTPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    permissions: user.permissions,
  }
  
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })
}

/**
 * Generate refresh token for user
 */
export function generateRefreshToken(user: AuthUser): string {
  const payload = {
    userId: user.id,
    type: 'refresh',
  }
  
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN })
}

/**
 * Verify and decode JWT token
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload
    return decoded
  } catch (error) {
    console.error('Token verification failed:', error)
    return null
  }
}

/**
 * Extract token from request headers
 */
export function extractTokenFromRequest(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization')
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7)
  }
  
  // Also check for token in cookies as fallback
  const cookieToken = request.cookies.get('auth-token')?.value
  return cookieToken || null
}

/**
 * Authenticate user with email and password
 */
export async function authenticateUser(email: string, password: string): Promise<AuthUser | null> {
  try {
    const user = await prisma.user.findUnique({
      where: { email, isActive: true }
    })
    
    if (!user) {
      return null
    }
    
    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      return null
    }
    
    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { updatedAt: new Date() }
    })
    
    const permissions = ROLE_PERMISSIONS[user.role as keyof typeof ROLE_PERMISSIONS] || []
    
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as 'ADMIN' | 'EMPLOYEE',
      permissions,
      isActive: user.isActive,
      lastLogin: new Date(),
    }
  } catch (error) {
    console.error('Authentication error:', error)
    return null
  }
}

/**
 * Get user by ID with permissions
 */
export async function getUserById(userId: string): Promise<AuthUser | null> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId, isActive: true }
    })
    
    if (!user) {
      return null
    }
    
    const permissions = ROLE_PERMISSIONS[user.role as keyof typeof ROLE_PERMISSIONS] || []
    
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as 'ADMIN' | 'EMPLOYEE',
      permissions,
      isActive: user.isActive,
    }
  } catch (error) {
    console.error('Get user error:', error)
    return null
  }
}

/**
 * Hash password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12
  return bcrypt.hash(password, saltRounds)
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = []
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long')
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number')
  }
  
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Check if user has specific permission
 */
export function hasPermission(user: AuthUser, permission: string): boolean {
  return user.permissions.includes(permission)
}

/**
 * Check if user has any of the specified permissions
 */
export function hasAnyPermission(user: AuthUser, permissions: string[]): boolean {
  return permissions.some(permission => user.permissions.includes(permission))
}

/**
 * Check if user has all specified permissions
 */
export function hasAllPermissions(user: AuthUser, permissions: string[]): boolean {
  return permissions.every(permission => user.permissions.includes(permission))
}

/**
 * Verify authentication and return user data
 * This function provides a consistent interface for API routes
 */
export async function verifyAuth(request: NextRequest): Promise<{
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
    console.error('Authentication verification error:', error)
    return { success: false, error: 'Authentication failed' }
  }
}