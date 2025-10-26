import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

// Demo users for testing
const demoUsers = [
  {
    id: '1',
    email: 'admin@quickloan.com',
    password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // admin123
    name: 'Admin User',
    role: 'ADMIN'
  },
  {
    id: '2', 
    email: 'employee@quickloan.com',
    password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // emp123
    name: 'Employee User',
    role: 'EMPLOYEE'
  }
]

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { message: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Find user (in production, this would query the database)
    const user = demoUsers.find(u => u.email === email)
    
    if (!user) {
      return NextResponse.json(
        { message: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // For demo purposes, accept both hashed and plain passwords
    const isValidPassword = password === 'admin123' || password === 'emp123' || 
                           await bcrypt.compare(password, user.password)

    if (!isValidPassword) {
      return NextResponse.json(
        { message: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Generate a simple token (in production, use JWT)
    const token = Buffer.from(`${user.id}:${user.email}:${Date.now()}`).toString('base64')

    return NextResponse.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    })

  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}