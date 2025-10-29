import { NextRequest, NextResponse } from 'next/server'

/**
 * Rate limiting implementation using in-memory storage
 * For production, consider using Redis or a database
 */

interface RateLimitEntry {
  count: number
  resetTime: number
  blocked: boolean
  blockUntil?: number
}

interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Maximum requests per window
  blockDurationMs?: number // How long to block after exceeding limit
  skipSuccessfulRequests?: boolean // Don't count successful requests
  skipFailedRequests?: boolean // Don't count failed requests
  keyGenerator?: (request: NextRequest) => string // Custom key generator
  onLimitReached?: (key: string, request: NextRequest) => void // Callback when limit reached
}

// In-memory storage for rate limiting
// In production, use Redis or a distributed cache
const rateLimitStore = new Map<string, RateLimitEntry>()

// Cleanup interval to remove expired entries
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now && (!entry.blockUntil || entry.blockUntil < now)) {
      rateLimitStore.delete(key)
    }
  }
}, 60000) // Cleanup every minute

/**
 * Default key generator using IP address and user agent
 */
function defaultKeyGenerator(request: NextRequest): string {
  const ip = request.ip || 
    request.headers.get('x-forwarded-for')?.split(',')[0] || 
    request.headers.get('x-real-ip') || 
    'unknown'
  
  const userAgent = request.headers.get('user-agent') || 'unknown'
  const path = new URL(request.url).pathname
  
  // Create a hash-like key
  return `${ip}:${path}:${userAgent.substring(0, 50)}`
}

/**
 * Create a rate limiter middleware
 */
export function createRateLimiter(config: RateLimitConfig) {
  const {
    windowMs,
    maxRequests,
    blockDurationMs = windowMs * 2,
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
    keyGenerator = defaultKeyGenerator,
    onLimitReached
  } = config

  return async function rateLimitMiddleware(
    request: NextRequest,
    handler: (req: NextRequest) => Promise<NextResponse>
  ): Promise<NextResponse> {
    const key = keyGenerator(request)
    const now = Date.now()
    
    // Get or create rate limit entry
    let entry = rateLimitStore.get(key)
    
    if (!entry) {
      entry = {
        count: 0,
        resetTime: now + windowMs,
        blocked: false
      }
      rateLimitStore.set(key, entry)
    }
    
    // Check if currently blocked
    if (entry.blocked && entry.blockUntil && entry.blockUntil > now) {
      const remainingTime = Math.ceil((entry.blockUntil - now) / 1000)
      return NextResponse.json(
        { 
          success: false, 
          message: 'Too many requests. Please try again later.',
          retryAfter: remainingTime
        },
        { 
          status: 429,
          headers: {
            'Retry-After': remainingTime.toString(),
            'X-RateLimit-Limit': maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': entry.blockUntil.toString()
          }
        }
      )
    }
    
    // Reset window if expired
    if (entry.resetTime < now) {
      entry.count = 0
      entry.resetTime = now + windowMs
      entry.blocked = false
      entry.blockUntil = undefined
    }
    
    // Check if limit exceeded
    if (entry.count >= maxRequests) {
      entry.blocked = true
      entry.blockUntil = now + blockDurationMs
      
      if (onLimitReached) {
        onLimitReached(key, request)
      }
      
      const remainingTime = Math.ceil(blockDurationMs / 1000)
      return NextResponse.json(
        { 
          success: false, 
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter: remainingTime
        },
        { 
          status: 429,
          headers: {
            'Retry-After': remainingTime.toString(),
            'X-RateLimit-Limit': maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': entry.blockUntil.toString()
          }
        }
      )
    }
    
    // Increment counter before processing request
    entry.count++
    
    try {
      // Process the request
      const response = await handler(request)
      
      // Optionally skip counting successful requests
      if (skipSuccessfulRequests && response.status < 400) {
        entry.count--
      }
      
      // Add rate limit headers to response
      const remaining = Math.max(0, maxRequests - entry.count)
      response.headers.set('X-RateLimit-Limit', maxRequests.toString())
      response.headers.set('X-RateLimit-Remaining', remaining.toString())
      response.headers.set('X-RateLimit-Reset', entry.resetTime.toString())
      
      return response
    } catch (error) {
      // Optionally skip counting failed requests
      if (skipFailedRequests) {
        entry.count--
      }
      throw error
    }
  }
}

/**
 * Predefined rate limiters for different use cases
 */

// General API rate limiter
export const apiRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100, // 100 requests per 15 minutes
  blockDurationMs: 30 * 60 * 1000, // Block for 30 minutes
})

// Strict rate limiter for sensitive operations
export const strictRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 10, // 10 requests per 15 minutes
  blockDurationMs: 60 * 60 * 1000, // Block for 1 hour
})

// Authentication rate limiter
export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 login attempts per 15 minutes
  blockDurationMs: 30 * 60 * 1000, // Block for 30 minutes
  keyGenerator: (request) => {
    // Use IP + email for auth attempts
    const ip = request.ip || 
      request.headers.get('x-forwarded-for')?.split(',')[0] || 
      request.headers.get('x-real-ip') || 
      'unknown'
    return `auth:${ip}`
  },
  onLimitReached: (key, request) => {
    console.warn(`Authentication rate limit exceeded for key: ${key}`)
  }
})

// File upload rate limiter
export const uploadRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 20, // 20 uploads per hour
  blockDurationMs: 2 * 60 * 60 * 1000, // Block for 2 hours
})

// SMS/WhatsApp API rate limiter
export const messagingRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10, // 10 messages per minute
  blockDurationMs: 5 * 60 * 1000, // Block for 5 minutes
})

/**
 * Rate limiter for external API calls (SMSFresh)
 */
export class ExternalAPIRateLimiter {
  private static instance: ExternalAPIRateLimiter
  private apiCallCounts = new Map<string, { count: number; resetTime: number }>()
  
  static getInstance(): ExternalAPIRateLimiter {
    if (!ExternalAPIRateLimiter.instance) {
      ExternalAPIRateLimiter.instance = new ExternalAPIRateLimiter()
    }
    return ExternalAPIRateLimiter.instance
  }
  
  async checkLimit(apiName: string, maxCalls: number, windowMs: number): Promise<boolean> {
    const now = Date.now()
    const key = `external:${apiName}`
    
    let entry = this.apiCallCounts.get(key)
    
    if (!entry) {
      entry = { count: 0, resetTime: now + windowMs }
      this.apiCallCounts.set(key, entry)
    }
    
    // Reset if window expired
    if (entry.resetTime < now) {
      entry.count = 0
      entry.resetTime = now + windowMs
    }
    
    // Check if limit exceeded
    if (entry.count >= maxCalls) {
      return false
    }
    
    entry.count++
    return true
  }
  
  async waitForAvailability(apiName: string, maxCalls: number, windowMs: number): Promise<void> {
    const key = `external:${apiName}`
    const entry = this.apiCallCounts.get(key)
    
    if (entry && entry.count >= maxCalls) {
      const waitTime = entry.resetTime - Date.now()
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime))
      }
    }
  }
}

/**
 * Utility function to get rate limit status
 */
export function getRateLimitStatus(key: string): {
  count: number
  limit: number
  remaining: number
  resetTime: number
  blocked: boolean
} | null {
  const entry = rateLimitStore.get(key)
  
  if (!entry) {
    return null
  }
  
  return {
    count: entry.count,
    limit: 100, // This should be configurable based on the specific limiter
    remaining: Math.max(0, 100 - entry.count),
    resetTime: entry.resetTime,
    blocked: entry.blocked
  }
}