import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { withAuth } from '@/lib/middleware/auth'
import { hashPassword, validatePassword } from '@/lib/auth'
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  return withAuth(request, async (req) => {
    try {
      const { currentPassword, newPassword } = await req.json()

      if (!currentPassword || !newPassword) {
        return NextResponse.json(
          { success: false, message: 'Current password and new password are required' },
          { status: 400 }
        )
      }

      // Validate new password strength
      const passwordValidation = validatePassword(newPassword)
      if (!passwordValidation.isValid) {
        return NextResponse.json(
          { 
            success: false, 
            message: 'New password does not meet requirements',
            errors: passwordValidation.errors
          },
          { status: 400 }
        )
      }

      // Get user from database
      const user = await prisma.user.findUnique({
        where: { id: req.user!.id }
      })

      if (!user) {
        return NextResponse.json(
          { success: false, message: 'User not found' },
          { status: 404 }
        )
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password)
      if (!isCurrentPasswordValid) {
        return NextResponse.json(
          { success: false, message: 'Current password is incorrect' },
          { status: 400 }
        )
      }

      // Hash new password
      const hashedNewPassword = await hashPassword(newPassword)

      // Update password
      await prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedNewPassword,
          updatedAt: new Date()
        }
      })

      return NextResponse.json({
        success: true,
        message: 'Password changed successfully'
      })

    } catch (error) {
      console.error('Change password error:', error)
      return NextResponse.json(
        { success: false, message: 'Failed to change password' },
        { status: 500 }
      )
    }
  })
}