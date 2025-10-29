import { NextRequest, NextResponse } from 'next/server'
import { authenticateUser, generateToken, generateRefreshToken } from '@/lib/auth'
import { loginSchema, validateInput } from '@/lib/security/serverValidation'
import { logAuthentication, AuditEventType } from '@/lib/security/auditLogger'
import { trackError } from '@/lib/security/errorTracking'

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const ipAddress = request.ip || 
    request.headers.get('x-forwarded-for')?.split(',')[0] || 
    request.headers.get('x-real-ip') || 
    'unknown'
  const userAgent = request.headers.get('user-agent') || 'unknown'
  
  try {
    // Validate request data
    const body = await request.json()
    const validation = validateInput(loginSchema, body)
    
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          message: 'Validation failed',
          errors: validation.errors
        },
        { status: 400 }
      )
    }
    
    const { email, password } = validation.data!

    console.log('🔐 Login attempt for:', email)

    // Authenticate user
    const user = await authenticateUser(email, password)
    
    if (!user) {
      console.log('❌ Authentication failed - invalid credentials')
      
      // Log failed authentication
      await logAuthentication(
        AuditEventType.LOGIN_FAILED,
        null,
        ipAddress,
        userAgent,
        { email, reason: 'Invalid credentials' }
      )
      
      return NextResponse.json(
        { success: false, message: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Generate tokens
    const token = generateToken(user)
    const refreshToken = generateRefreshToken(user)

    console.log('✅ Authentication successful for user:', user.email)

    // Log successful authentication
    await logAuthentication(
      AuditEventType.LOGIN,
      user,
      ipAddress,
      userAgent,
      { 
        loginDuration: Date.now() - startTime,
        tokenGenerated: true
      }
    )

    // Create response
    const response = NextResponse.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        permissions: user.permissions
      }
    })

    // Set secure cookies
    response.cookies.set('auth-token', token, {
      httpOnly: true, // Secure: prevent XSS
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60, // 24 hours
      path: '/'
    })

    response.cookies.set('refresh-token', refreshToken, {
      httpOnly: true, // Secure: prevent XSS
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/'
    })



    return response

  } catch (error) {
    console.error('❌ Login error:', error)
    
    // Track the error
    await trackError(error instanceof Error ? error : new Error(String(error)), {
      ipAddress,
      userAgent,
      endpoint: '/api/auth/login',
      method: 'POST',
      timestamp: new Date()
    }, {
      operation: 'login',
      duration: Date.now() - startTime
    })
    
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}