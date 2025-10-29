import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, getUserById, generateToken } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const refreshToken = request.cookies.get('refresh-token')?.value

    if (!refreshToken) {
      return NextResponse.json(
        { success: false, message: 'Refresh token not found' },
        { status: 401 }
      )
    }

    // Verify refresh token
    const payload = verifyToken(refreshToken)
    if (!payload || payload.type !== 'refresh') {
      return NextResponse.json(
        { success: false, message: 'Invalid refresh token' },
        { status: 401 }
      )
    }

    // Get user data
    const user = await getUserById(payload.userId)
    if (!user || !user.isActive) {
      return NextResponse.json(
        { success: false, message: 'User account is inactive' },
        { status: 401 }
      )
    }

    // Generate new access token
    const newToken = generateToken(user)

    return NextResponse.json({
      success: true,
      token: newToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        permissions: user.permissions
      }
    })

  } catch (error) {
    console.error('Token refresh error:', error)
    return NextResponse.json(
      { success: false, message: 'Token refresh failed' },
      { status: 500 }
    )
  }
}