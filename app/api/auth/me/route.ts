import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request)
    
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, message: authResult.error },
        { status: 401 }
      )
    }
    
    return NextResponse.json({
      success: true,
      user: {
        id: authResult.user!.id,
        name: authResult.user!.name,
        email: authResult.user!.email,
        role: authResult.user!.role,
        permissions: authResult.user!.permissions
      }
    })
  } catch (error) {
    console.error('Get user info error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}