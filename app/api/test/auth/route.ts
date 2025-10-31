import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth'
import { verifyTokenSimple } from '@/lib/jwt-edge'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Test Auth Debug - Starting authentication check')
    
    // Check cookies
    const authCookie = request.cookies.get('auth-token')
    console.log('🍪 Auth cookie present:', !!authCookie?.value)
    
    // Check authorization header
    const authHeader = request.headers.get('authorization')
    console.log('📋 Auth header present:', !!authHeader)
    
    // Get token
    const token = authCookie?.value || authHeader?.replace('Bearer ', '')
    console.log('🎫 Token present:', !!token)
    
    if (!token) {
      return NextResponse.json({
        success: false,
        message: 'No token found',
        debug: {
          cookiePresent: !!authCookie?.value,
          headerPresent: !!authHeader,
          cookies: Object.fromEntries(request.cookies.entries())
        }
      })
    }
    
    // Simple token verification (like middleware)
    const simplePayload = verifyTokenSimple(token)
    console.log('🔐 Simple token verification result:', simplePayload)
    
    // Full auth verification
    const authResult = await verifyAuth(request)
    console.log('✅ Full auth verification result:', authResult)
    
    return NextResponse.json({
      success: true,
      debug: {
        tokenPresent: !!token,
        simpleVerification: simplePayload,
        fullVerification: authResult,
        cookies: Object.fromEntries(request.cookies.entries())
      }
    })
    
  } catch (error) {
    console.error('❌ Test auth error:', error)
    return NextResponse.json({
      success: false,
      message: 'Test auth failed',
      error: error instanceof Error ? error.message : String(error)
    })
  }
}