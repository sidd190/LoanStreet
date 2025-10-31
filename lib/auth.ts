import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'
import { NextRequest } from 'next/server'

const prisma = new PrismaClient()
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

export type UserRole = 'ADMIN' | 'EMPLOYEE'

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  isActive: boolean
}

export interface AuthUser extends User {
  permissions: string[]
}

// Permission constants for easy import
export const PERMISSIONS = {
  DASHBOARD_VIEW: 'dashboard:view',
  CAMPAIGNS_VIEW: 'campaigns:view',
  CAMPAIGNS_CREATE: 'campaigns:create',
  CAMPAIGNS_EDIT: 'campaigns:edit',
  CAMPAIGNS_DELETE: 'campaigns:delete',
  CONTACTS_VIEW: 'contacts:view',
  CONTACTS_CREATE: 'contacts:create',
  CONTACTS_EDIT: 'contacts:edit',
  CONTACTS_DELETE: 'contacts:delete',
  MESSAGES_VIEW: 'messages:view',
  MESSAGES_SEND: 'messages:send',
  MESSAGES_REPLY: 'messages:reply',
  LEADS_VIEW: 'leads:view',
  LEADS_CREATE: 'leads:create',
  LEADS_EDIT: 'leads:edit',
  LEADS_DELETE: 'leads:delete',
  ANALYTICS_VIEW: 'analytics:view',
  SETTINGS_MANAGE: 'settings:manage',
  USERS_MANAGE: 'users:manage'
} as const

// Role permissions
const ROLE_PERMISSIONS = {
  ADMIN: [
    'dashboard:view',
    'campaigns:view', 'campaigns:create', 'campaigns:edit', 'campaigns:delete',
    'contacts:view', 'contacts:create', 'contacts:edit', 'contacts:delete',
    'messages:view', 'messages:send', 'messages:reply',
    'leads:view', 'leads:create', 'leads:edit', 'leads:delete',
    'analytics:view', 'settings:manage', 'users:manage'
  ],
  EMPLOYEE: [
    'dashboard:view',
    'messages:view', 'messages:reply',
    'leads:view', 'leads:edit'
  ]
}

// Generate JWT token
export function generateToken(user: User): string {
  return jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '24h' }
  )
}

// Verify JWT token
export function verifyToken(token: string): any {
  try {
    return jwt.verify(token, JWT_SECRET)
  } catch {
    return null
  }
}

// Authenticate user
export async function authenticateUser(email: string, password: string): Promise<AuthUser | null> {
  try {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase(), isActive: true }
    })

    if (!user || !await bcrypt.compare(password, user.password)) {
      return null
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as UserRole,
      isActive: user.isActive,
      permissions: ROLE_PERMISSIONS[user.role as UserRole] || []
    }
  } catch (error) {
    console.error('Auth error:', error)
    return null
  }
}

// Get user by ID
export async function getUserById(userId: string): Promise<AuthUser | null> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId, isActive: true }
    })

    if (!user) return null

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as UserRole,
      isActive: user.isActive,
      permissions: ROLE_PERMISSIONS[user.role as UserRole] || []
    }
  } catch (error) {
    console.error('Get user error:', error)
    return null
  }
}

// Verify auth from request
export async function verifyAuth(request: NextRequest): Promise<AuthUser | null> {
  try {
    const token = request.cookies.get('auth-token')?.value
    if (!token) return null

    const payload = verifyToken(token)
    if (!payload) return null

    return await getUserById(payload.userId)
  } catch (error) {
    console.error('Verify auth error:', error)
    return null
  }
}

// Check if user has permission
export function hasPermission(user: AuthUser | null, permission: string): boolean {
  return user?.permissions.includes(permission) || false
}

// Check if user is admin
export function isAdmin(user: AuthUser | null): boolean {
  return user?.role === 'ADMIN'
}

// Create user (for seeding)
export async function createUser(email: string, password: string, name: string, role: UserRole) {
  const hashedPassword = await bcrypt.hash(password, 12)
  return prisma.user.create({
    data: {
      email: email.toLowerCase(),
      password: hashedPassword,
      name,
      role,
      isActive: true
    }
  })
}