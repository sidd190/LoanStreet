// Server-side validation utilities

export interface ValidationResult {
  valid: boolean
  errors: string[]
}

// Validate email format
export function validateEmail(email: string): ValidationResult {
  const errors: string[] = []
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  
  if (!email) {
    errors.push('Email is required')
  } else if (!emailRegex.test(email)) {
    errors.push('Invalid email format')
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}

// Validate phone number
export function validatePhone(phone: string): ValidationResult {
  const errors: string[] = []
  const phoneRegex = /^[0-9]{10}$/
  
  if (!phone) {
    errors.push('Phone number is required')
  } else if (!phoneRegex.test(phone.replace(/\D/g, ''))) {
    errors.push('Invalid phone number format')
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}

// Validate required fields
export function validateRequired(fields: Record<string, any>): ValidationResult {
  const errors: string[] = []
  
  Object.entries(fields).forEach(([key, value]) => {
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      errors.push(`${key} is required`)
    }
  })
  
  return {
    valid: errors.length === 0,
    errors
  }
}

// Validate string length
export function validateLength(
  value: string,
  min: number,
  max: number,
  fieldName: string = 'Field'
): ValidationResult {
  const errors: string[] = []
  
  if (value.length < min) {
    errors.push(`${fieldName} must be at least ${min} characters`)
  }
  if (value.length > max) {
    errors.push(`${fieldName} must be at most ${max} characters`)
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}

// Validate pagination parameters
export function validatePagination(page?: number, limit?: number): ValidationResult {
  const errors: string[] = []
  
  if (page !== undefined && (page < 1 || !Number.isInteger(page))) {
    errors.push('Page must be a positive integer')
  }
  
  if (limit !== undefined && (limit < 1 || limit > 100 || !Number.isInteger(limit))) {
    errors.push('Limit must be between 1 and 100')
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}

// Validate date range
export function validateDateRange(startDate?: string, endDate?: string): ValidationResult {
  const errors: string[] = []
  
  if (startDate && isNaN(Date.parse(startDate))) {
    errors.push('Invalid start date format')
  }
  
  if (endDate && isNaN(Date.parse(endDate))) {
    errors.push('Invalid end date format')
  }
  
  if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
    errors.push('Start date must be before end date')
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}

// Sanitize string input
export function sanitizeString(input: string): string {
  return input.trim().replace(/[<>]/g, '')
}

// Validate and sanitize contact data
export function validateContactData(data: any): ValidationResult {
  const errors: string[] = []
  
  if (!data.name || typeof data.name !== 'string') {
    errors.push('Valid name is required')
  }
  
  if (!data.phone || typeof data.phone !== 'string') {
    errors.push('Valid phone number is required')
  }
  
  if (data.email) {
    const emailValidation = validateEmail(data.email)
    if (!emailValidation.valid) {
      errors.push(...emailValidation.errors)
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}
