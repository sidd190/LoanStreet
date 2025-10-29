import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { success: false, message: 'Email is required' },
        { status: 400 }
      )
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email, isActive: true }
    })

    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.'
      })
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex')
    const resetTokenExpiry = new Date(Date.now() + 3600000) // 1 hour from now

    // Store reset token in database (you might want to create a separate table for this)
    // For now, we'll use a simple approach with user table
    await prisma.user.update({
      where: { id: user.id },
      data: {
        // Note: You'll need to add these fields to your User model
        // resetToken: resetToken,
        // resetTokenExpiry: resetTokenExpiry,
        updatedAt: new Date()
      }
    })

    // In a real application, you would send an email here
    // For demo purposes, we'll just log the reset token
    console.log(`Password reset token for ${email}: ${resetToken}`)
    console.log(`Reset URL: ${process.env.NEXT_PUBLIC_APP_URL}/admin/reset-password?token=${resetToken}`)

    return NextResponse.json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.',
      // In development, include the token for testing
      ...(process.env.NODE_ENV === 'development' && { resetToken })
    })

  } catch (error) {
    console.error('Forgot password error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to process password reset request' },
      { status: 500 }
    )
  }
}