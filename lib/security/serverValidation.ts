import { z } from 'zod'

/**
 * Server-side validation utilities that work in Edge Runtime
 */

// Re-export common schemas
export const phoneNumberSchema = z.string()
  .regex(/^[6-9]\d{9}$/, 'Phone number must be a valid 10-digit Indian mobile number')

export const emailSchema = z.string()
  .email('Invalid email format')
  .max(254, 'Email too long')

export const nameSchema = z.string()
  .min(1, 'Name is required')
  .max(100, 'Name too long')
  .regex(/^[a-zA-Z\s\-'\.]+$/, 'Name contains invalid characters')

export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password too long')
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])/, 
    'Password must contain uppercase, lowercase, number, and special character')

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password required'),
})

/**
 * Simple server-side HTML sanitization
 */
export function sanitizeHtml(input: string): string {
  if (typeof input !== 'string') return ''
  
  return input
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim()
}

/**
 * Sanitize and validate text input
 */
export function sanitizeText(input: string, maxLength: number = 1000): string {
  if (typeof input !== 'string') {
    throw new Error('Input must be a string')
  }
  
  // Remove HTML tags and sanitize
  const sanitized = sanitizeHtml(input)
  
  // Trim whitespace
  const trimmed = sanitized.trim()
  
  // Check length
  if (trimmed.length > maxLength) {
    throw new Error(`Input exceeds maximum length of ${maxLength} characters`)
  }
  
  return trimmed
}

/**
 * Validate pagination parameters
 */
export function validatePagination(limit?: string, offset?: string): {
  limit: number
  offset: number
  errors: string[]
} {
  const errors: string[] = []
  let validatedLimit = 50 // default
  let validatedOffset = 0 // default
  
  if (limit) {
    const parsedLimit = parseInt(limit, 10)
    if (isNaN(parsedLimit) || parsedLimit < 1) {
      errors.push('Limit must be a positive number')
    } else if (parsedLimit > 100) {
      errors.push('Limit cannot exceed 100')
    } else {
      validatedLimit = parsedLimit
    }
  }
  
  if (offset) {
    const parsedOffset = parseInt(offset, 10)
    if (isNaN(parsedOffset) || parsedOffset < 0) {
      errors.push('Offset must be a non-negative number')
    } else {
      validatedOffset = parsedOffset
    }
  }
  
  return {
    limit: validatedLimit,
    offset: validatedOffset,
    errors
  }
}

/**
 * Generic validation function using Zod schemas
 */
export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): {
  success: boolean
  data?: T
  errors: string[]
} {
  try {
    const result = schema.safeParse(data)
    
    if (result.success) {
      return {
        success: true,
        data: result.data,
        errors: []
      }
    } else {
      return {
        success: false,
        errors: result.error.errors.map(err => `${err.path.join('.')}: ${err.message}`)
      }
    }
  } catch (error) {
    return {
      success: false,
      errors: ['Validation error occurred']
    }
  }
}