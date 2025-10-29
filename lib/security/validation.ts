import { z } from 'zod'

/**
 * Input validation and sanitization utilities
 */

// Common validation schemas
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

export const idSchema = z.string()
  .uuid('Invalid ID format')

// Campaign validation schemas
export const campaignSchema = z.object({
  name: z.string().min(1, 'Campaign name required').max(100, 'Name too long'),
  type: z.enum(['SMS', 'WHATSAPP'], { required_error: 'Campaign type required' }),
  message: z.string().min(1, 'Message required').max(1000, 'Message too long'),
  templateName: z.string().optional(),
  parameters: z.array(z.string()).optional(),
  mediaUrl: z.string().url('Invalid media URL').optional(),
  mediaType: z.enum(['image', 'video', 'document']).optional(),
  targetContacts: z.array(idSchema).min(1, 'At least one contact required'),
  scheduledAt: z.string().datetime().optional(),
})

// Contact validation schemas
export const contactSchema = z.object({
  phone: phoneNumberSchema,
  name: nameSchema.optional(),
  email: emailSchema.optional(),
  tags: z.array(z.string().max(50)).max(10, 'Too many tags').optional(),
  source: z.string().max(100, 'Source too long').optional(),
})

// Message validation schemas
export const messageSchema = z.object({
  type: z.enum(['SMS', 'WHATSAPP']),
  content: z.string().min(1, 'Message content required').max(1000, 'Message too long'),
  contactId: idSchema,
  campaignId: idSchema.optional(),
})

// Lead validation schemas
export const leadSchema = z.object({
  name: nameSchema,
  phone: phoneNumberSchema,
  email: emailSchema.optional(),
  loanType: z.enum(['PERSONAL', 'BUSINESS', 'HOME', 'VEHICLE', 'EDUCATION', 'GOLD']),
  loanAmount: z.number().min(1000, 'Minimum loan amount is ₹1,000').max(10000000, 'Maximum loan amount is ₹1 crore'),
  status: z.enum(['NEW', 'CONTACTED', 'INTERESTED', 'QUALIFIED', 'PROPOSAL_SENT', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  source: z.string().max(100, 'Source too long').optional(),
  notes: z.string().max(1000, 'Notes too long').optional(),
})

// User validation schemas
export const userSchema = z.object({
  email: emailSchema,
  name: nameSchema,
  password: passwordSchema,
  role: z.enum(['ADMIN', 'EMPLOYEE']),
})

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password required'),
})

/**
 * Sanitize HTML content to prevent XSS attacks
 * Simple implementation for server-side use
 */
export function sanitizeHtml(input: string): string {
  if (typeof input !== 'string') return ''
  
  // Simple HTML tag removal for server-side
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
 * Validate and sanitize phone number
 */
export function validateAndSanitizePhone(phone: string): string {
  if (typeof phone !== 'string') {
    throw new Error('Phone number must be a string')
  }
  
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '')
  
  // Handle different formats
  let normalized = cleaned
  
  // Remove country code if present
  if (normalized.startsWith('91') && normalized.length === 12) {
    normalized = normalized.substring(2)
  }
  
  // Validate 10-digit format
  const result = phoneNumberSchema.safeParse(normalized)
  if (!result.success) {
    throw new Error('Invalid phone number format')
  }
  
  return normalized
}

/**
 * Validate file upload
 */
export interface FileValidationOptions {
  allowedTypes: string[]
  maxSize: number // in bytes
  maxFiles?: number
}

export function validateFileUpload(
  files: File | File[],
  options: FileValidationOptions
): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  const fileArray = Array.isArray(files) ? files : [files]
  
  // Check number of files
  if (options.maxFiles && fileArray.length > options.maxFiles) {
    errors.push(`Maximum ${options.maxFiles} files allowed`)
  }
  
  for (const file of fileArray) {
    // Check file type
    if (!options.allowedTypes.includes(file.type)) {
      errors.push(`File type ${file.type} not allowed. Allowed types: ${options.allowedTypes.join(', ')}`)
    }
    
    // Check file size
    if (file.size > options.maxSize) {
      const maxSizeMB = (options.maxSize / (1024 * 1024)).toFixed(1)
      errors.push(`File ${file.name} exceeds maximum size of ${maxSizeMB}MB`)
    }
    
    // Check for potentially dangerous file names
    if (file.name.includes('..') || file.name.includes('/') || file.name.includes('\\')) {
      errors.push(`File name ${file.name} contains invalid characters`)
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
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
 * Validate date range parameters
 */
export function validateDateRange(dateFrom?: string, dateTo?: string): {
  dateFrom?: Date
  dateTo?: Date
  errors: string[]
} {
  const errors: string[] = []
  let validatedDateFrom: Date | undefined
  let validatedDateTo: Date | undefined
  
  if (dateFrom) {
    const parsed = new Date(dateFrom)
    if (isNaN(parsed.getTime())) {
      errors.push('Invalid dateFrom format')
    } else {
      validatedDateFrom = parsed
    }
  }
  
  if (dateTo) {
    const parsed = new Date(dateTo)
    if (isNaN(parsed.getTime())) {
      errors.push('Invalid dateTo format')
    } else {
      validatedDateTo = parsed
    }
  }
  
  // Check date range logic
  if (validatedDateFrom && validatedDateTo && validatedDateFrom > validatedDateTo) {
    errors.push('dateFrom cannot be after dateTo')
  }
  
  return {
    dateFrom: validatedDateFrom,
    dateTo: validatedDateTo,
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