import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    console.log('🔐 Login attempt for:', email)

    // Try to authenticate with database first
    try {
      const user = await prisma.user.findUnique({
        where: { email }
      })

      if (user && await bcrypt.compare(password, user.password)) {
        const token = jwt.sign(
          { userId: user.id, email: user.email, role: user.role },
          process.env.JWT_SECRET || 'fallback-secret',
          { expiresIn: '24h' }
        )

        console.log('✅ Database authentication successful')
        return NextResponse.json({
          success: true,
          token,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role
          }
        })
      }
    } catch (dbError) {
      console.warn('⚠️ Database authentication failed, using fallback credentials:', dbError)
    }

    // Fallback to hardcoded demo credentials
    const demoCredentials = [
      { email: 'admin@quickloan.com', password: 'admin123', role: 'ADMIN', name: 'Admin User' },
      { email: 'employee@quickloan.com', password: 'emp123', role: 'EMPLOYEE', name: 'Employee User' }
    ]

    const demoUser = demoCredentials.find(cred => 
      cred.email === email && cred.password === password
    )

    if (demoUser) {
      const token = jwt.sign(
        { userId: 'demo-' + demoUser.role.toLowerCase(), email: demoUser.email, role: demoUser.role },
        process.env.JWT_SECRET || 'fallback-secret',
        { expiresIn: '24h' }
      )

      console.log('📁 Fallback authentication successful for demo user')
      return NextResponse.json({
        success: true,
        token,
        user: {
          id: 'demo-' + demoUser.role.toLowerCase(),
          name: demoUser.name,
          email: demoUser.email,
          role: demoUser.role
        }
      })
    }

    console.log('❌ Authentication failed - invalid credentials')
    return NextResponse.json(
      { success: false, message: 'Invalid email or password' },
      { status: 401 }
    )

  } catch (error) {
    console.error('❌ Login error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}