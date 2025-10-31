import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth'
import Logger, { DataSource } from '@/lib/logger'

export async function GET(request: NextRequest) {
  try {
    Logger.info(DataSource.API, 'auth_me', 'Fetching current user profile')

    // Verify authentication
    const authResult = await verifyAuth(request)
    if (!authResult.success) {
      Logger.warn(DataSource.API, 'auth_me', 'Authentication failed', authResult.error)
      return NextResponse.json(
        { success: false, message: authResult.error },
        { status: 401 }
      )
    }

    const user = authResult.user!

    Logger.success(DataSource.API, 'auth_me', `User profile fetched for ${user.email}`)

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        permissions: user.permissions,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    })

  } catch (error) {
    Logger.error(DataSource.API, 'auth_me', 'Failed to fetch user profile', error)
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to fetch user profile',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}