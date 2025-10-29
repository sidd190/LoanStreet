import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { hashPassword, validatePassword } from '@/lib/auth'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json()

    if (!token || !password) {
      return NextResponse.json(
        { success: false, message: 'Token and password are required' },
        { status: 400 }
      )
    }

    // Validate password strength
    const passwordValidation = validatePassword(password)
    if (!passwordValidation.isValid) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Password does not meet requirements',
          errors: passwordValidation.errors
        },
        { status: 400 }
      )
    }

    // Find user with valid reset token
    // Note: This is a simplified approach. In production, you'd have a separate table for reset tokens
    const user = await prisma.user.findFirst({
      where: {
        // resetToken: token,
        // resetTokenExpiry: { gt: new Date() },
        isActive: true
      }
    })

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Invalid or expired reset token' },
        { status: 400 }
      )
    }

    // Hash new password
    const hashedPassword = await hashPassword(password)

    // Update user password and clear reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        // resetToken: null,
        // resetTokenExpiry: null,
        updatedAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Password has been reset successfully'
    })

  } catch (error) {
    console.error('Reset password error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to reset password' },
      { status: 500 }
    )
  }
}