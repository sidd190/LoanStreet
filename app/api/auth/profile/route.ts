import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/auth'

export async function GET(request: NextRequest) {
  return withAuth(request, async (req) => {
    try {
      return NextResponse.json({
        success: true,
        user: {
          id: req.user!.id,
          name: req.user!.name,
          email: req.user!.email,
          role: req.user!.role,
          permissions: req.user!.permissions,
          isActive: req.user!.isActive,
          lastLogin: req.user!.lastLogin
        }
      })
    } catch (error) {
      console.error('Get profile error:', error)
      return NextResponse.json(
        { success: false, message: 'Failed to get user profile' },
        { status: 500 }
      )
    }
  })
}