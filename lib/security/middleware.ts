import { NextRequest, NextResponse } from 'next/server'
import { withAuth, AuthenticatedRequest } from '../middleware/auth'
import { apiRateLimiter, authRateLimiter, strictRateLimiter, uploadRateLimiter } from './rateLimiter'
import { validateInput, sanitizeText } from './validation'
import { z } from 'zod'

/**
 * Security headers configuration
 */
const SECURITY_HEADERS = {
  // Prevent XSS attacks
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  
  // HTTPS enforcement
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  
  // Content Security Policy
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src 'self'",
    "frame-ancestors 'none'"
  ].join('; '),
  
  // Referrer policy
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  
  // Permissions policy
  'Permissions-Policy': [
    'camera=()',
    'microphone=()',
    'geolocation=()',
    'payment=()'
  ].join(', ')
}

/**
 * Add security headers to response
 */
export function addSecurityHeaders(response: NextResponse): NextResponse {
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value)
  })
  
  return response
}

/**
 * Input sanitization middleware
 */
export function withInputSanitization(
  handler: (req: NextRequest) => Promise<NextResponse>
) {
  return async function sanitizationMiddleware(request: NextRequest): Promise<NextResponse> {
    try {
      // Sanitize URL parameters
      const url = new URL(request.url)
      const sanitizedParams = new URLSearchParams()
      
      for (const [key, value] of url.searchParams.entries()) {
        const sanitizedKey = sanitizeText(key, 100)
        const sanitizedValue = sanitizeText(value, 1000)
        sanitizedParams.set(sanitizedKey, sanitizedValue)
      }
      
      // Create new URL with sanitized parameters
      const sanitizedUrl = new URL(url.pathname, url.origin)
      sanitizedUrl.search = sanitizedParams.toString()
      
      // Create new request with sanitized URL
      const sanitizedRequest = new NextRequest(sanitizedUrl, {
        method: request.method,
        headers: request.headers,
        body: request.body,
      })
      
      return handler(sanitizedRequest)
    } catch (error) {
      console.error('Input sanitization error:', error)
      return NextResponse.json(
        { success: false, message: 'Invalid input data' },
        { status: 400 }
      )
    }
  }
}

/**
 * Request validation middleware with Zod schema
 */
export function withRequestValidation<T>(schema: z.ZodSchema<T>) {
  return function validationMiddleware(
    handler: (req: NextRequest, validatedData: T) => Promise<NextResponse>
  ) {
    return async function (request: NextRequest): Promise<NextResponse> {
      try {
        let data: unknown
        
        // Parse request body based on content type
        const contentType = request.headers.get('content-type') || ''
        
        if (contentType.includes('application/json')) {
          data = await request.json()
        } else if (contentType.includes('application/x-www-form-urlencoded')) {
          const formData = await request.formData()
          data = Object.fromEntries(formData.entries())
        } else {
          // For GET requests, use query parameters
          const url = new URL(request.url)
          data = Object.fromEntries(url.searchParams.entries())
        }
        
        // Validate data with schema
        const validation = validateInput(schema, data)
        
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
        
        return handler(request, validation.data!)
      } catch (error) {
        console.error('Request validation error:', error)
        return NextResponse.json(
          { success: false, message: 'Invalid request format' },
          { status: 400 }
        )
      }
    }
  }
}

/**
 * Comprehensive security middleware that combines multiple security measures
 */
export function withSecurity(
  options: {
    rateLimit?: 'api' | 'auth' | 'strict' | 'upload' | 'none'
    requireAuth?: boolean
    sanitizeInput?: boolean
    validateSchema?: z.ZodSchema<any>
    customHeaders?: Record<string, string>
  } = {}
) {
  const {
    rateLimit = 'api',
    requireAuth = true,
    sanitizeInput = true,
    validateSchema,
    customHeaders = {}
  } = options

  return function securityMiddleware(
    handler: (req: AuthenticatedRequest, validatedData?: any) => Promise<NextResponse>
  ) {
    return async function (request: NextRequest): Promise<NextResponse> {
      let processedRequest = request
      let validatedData: any = undefined

      try {
        // Step 1: Apply rate limiting
        if (rateLimit !== 'none') {
          const rateLimiters = {
            api: apiRateLimiter,
            auth: authRateLimiter,
            strict: strictRateLimiter,
            upload: uploadRateLimiter
          }
          
          const limiter = rateLimiters[rateLimit]
          const rateLimitResponse = await limiter(request, async (req) => {
            return NextResponse.next()
          })
          
          if (rateLimitResponse.status === 429) {
            return addSecurityHeaders(rateLimitResponse)
          }
        }

        // Step 2: Input sanitization
        if (sanitizeInput) {
          const sanitizedResponse = await withInputSanitization(async (req) => {
            processedRequest = req
            return NextResponse.next()
          })(processedRequest)
          
          if (sanitizedResponse.status !== 200) {
            return addSecurityHeaders(sanitizedResponse)
          }
        }

        // Step 3: Request validation
        if (validateSchema) {
          const validationResponse = await withRequestValidation(validateSchema)(
            async (req, data) => {
              validatedData = data
              return NextResponse.next()
            }
          )(processedRequest)
          
          if (validationResponse.status !== 200) {
            return addSecurityHeaders(validationResponse)
          }
        }

        // Step 4: Authentication
        if (requireAuth) {
          return withAuth(processedRequest, async (authReq) => {
            const response = await handler(authReq, validatedData)
            
            // Add custom headers
            Object.entries(customHeaders).forEach(([key, value]) => {
              response.headers.set(key, value)
            })
            
            return addSecurityHeaders(response)
          })
        } else {
          const response = await handler(processedRequest as AuthenticatedRequest, validatedData)
          
          // Add custom headers
          Object.entries(customHeaders).forEach(([key, value]) => {
            response.headers.set(key, value)
          })
          
          return addSecurityHeaders(response)
        }
      } catch (error) {
        console.error('Security middleware error:', error)
        const errorResponse = NextResponse.json(
          { success: false, message: 'Security validation failed' },
          { status: 500 }
        )
        return addSecurityHeaders(errorResponse)
      }
    }
  }
}

/**
 * CORS middleware for API endpoints
 */
export function withCORS(
  options: {
    origin?: string | string[]
    methods?: string[]
    allowedHeaders?: string[]
    credentials?: boolean
  } = {}
) {
  const {
    origin = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    methods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders = ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials = true
  } = options

  return function corsMiddleware(
    handler: (req: NextRequest) => Promise<NextResponse>
  ) {
    return async function (request: NextRequest): Promise<NextResponse> {
      // Handle preflight requests
      if (request.method === 'OPTIONS') {
        const response = new NextResponse(null, { status: 200 })
        
        // Set CORS headers
        const requestOrigin = request.headers.get('origin')
        const allowedOrigins = Array.isArray(origin) ? origin : [origin]
        
        if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
          response.headers.set('Access-Control-Allow-Origin', requestOrigin)
        }
        
        response.headers.set('Access-Control-Allow-Methods', methods.join(', '))
        response.headers.set('Access-Control-Allow-Headers', allowedHeaders.join(', '))
        
        if (credentials) {
          response.headers.set('Access-Control-Allow-Credentials', 'true')
        }
        
        response.headers.set('Access-Control-Max-Age', '86400') // 24 hours
        
        return response
      }

      // Process actual request
      const response = await handler(request)
      
      // Add CORS headers to response
      const requestOrigin = request.headers.get('origin')
      const allowedOrigins = Array.isArray(origin) ? origin : [origin]
      
      if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
        response.headers.set('Access-Control-Allow-Origin', requestOrigin)
      }
      
      if (credentials) {
        response.headers.set('Access-Control-Allow-Credentials', 'true')
      }
      
      return response
    }
  }
}

/**
 * Request logging middleware for security monitoring
 */
export function withRequestLogging(
  handler: (req: NextRequest) => Promise<NextResponse>
) {
  return async function loggingMiddleware(request: NextRequest): Promise<NextResponse> {
    const startTime = Date.now()
    const ip = request.ip || 
      request.headers.get('x-forwarded-for')?.split(',')[0] || 
      request.headers.get('x-real-ip') || 
      'unknown'
    
    const userAgent = request.headers.get('user-agent') || 'unknown'
    const method = request.method
    const url = request.url
    
    try {
      const response = await handler(request)
      const duration = Date.now() - startTime
      
      // Log successful requests
      console.log(`[${new Date().toISOString()}] ${method} ${url} - ${response.status} - ${duration}ms - IP: ${ip}`)
      
      return response
    } catch (error) {
      const duration = Date.now() - startTime
      
      // Log failed requests
      console.error(`[${new Date().toISOString()}] ${method} ${url} - ERROR - ${duration}ms - IP: ${ip} - ${error}`)
      
      throw error
    }
  }
}