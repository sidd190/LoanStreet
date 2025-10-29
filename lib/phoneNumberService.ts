/**
 * Phone Number Processing Service
 * Handles standardization, validation, and WhatsApp compatibility for Indian phone numbers
 */

export interface PhoneNumberValidationResult {
  isValid: boolean
  standardized: string | null
  isWhatsAppCompatible: boolean
  error?: string
}

export interface BulkPhoneProcessingResult {
  valid: string[]
  invalid: Array<{ original: string; error: string }>
  duplicates: string[]
  stats: {
    total: number
    valid: number
    invalid: number
    duplicates: number
  }
}

/**
 * Standardizes Indian phone numbers to 10-digit format without +91 prefix
 * @param phone Raw phone number string
 * @returns Standardized 10-digit number or null if invalid
 */
export function standardizePhoneNumber(phone: string): string | null {
  if (!phone || typeof phone !== 'string') {
    return null
  }

  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, '')
  
  // Handle different Indian phone number formats
  if (cleaned.startsWith('91') && cleaned.length === 12) {
    // Remove country code +91
    cleaned = cleaned.substring(2)
  } else if (cleaned.startsWith('0') && cleaned.length === 11) {
    // Remove leading 0
    cleaned = cleaned.substring(1)
  }
  
  // Validate 10-digit format and ensure it starts with valid Indian mobile prefix (6-9)
  if (cleaned.length === 10 && /^[6-9]/.test(cleaned)) {
    return cleaned
  }
  
  return null
}

/**
 * Validates if a phone number is in correct 10-digit Indian mobile format
 * @param phone Phone number to validate
 * @returns True if valid Indian mobile number
 */
export function validatePhoneNumber(phone: string): boolean {
  if (!phone || typeof phone !== 'string') {
    return false
  }
  
  // Check for 10-digit Indian mobile number format (starts with 6-9)
  const phoneRegex = /^[6-9]\d{9}$/
  return phoneRegex.test(phone)
}

/**
 * Checks if a phone number is compatible with WhatsApp
 * @param phone Phone number to check
 * @returns True if WhatsApp compatible
 */
export function isWhatsAppCompatible(phone: string): boolean {
  return validatePhoneNumber(phone)
}

/**
 * Extracts multiple phone numbers from a single cell value
 * Handles comma, semicolon, pipe, and newline separators
 * @param cellValue Cell value containing one or more phone numbers
 * @returns Array of standardized valid phone numbers
 */
export function extractMultiplePhoneNumbers(cellValue: string): string[] {
  if (!cellValue || typeof cellValue !== 'string') {
    return []
  }
  
  // Split by common separators: comma, semicolon, pipe, newline, space
  const separators = /[,;|\n\s]+/
  const numbers = cellValue.split(separators)
  
  const validNumbers: string[] = []
  
  for (const number of numbers) {
    const trimmed = number.trim()
    if (trimmed) {
      const standardized = standardizePhoneNumber(trimmed)
      if (standardized) {
        validNumbers.push(standardized)
      }
    }
  }
  
  return validNumbers
}

/**
 * Validates a single phone number and returns detailed result
 * @param phone Phone number to validate
 * @returns Detailed validation result
 */
export function validatePhoneNumberDetailed(phone: string): PhoneNumberValidationResult {
  if (!phone || typeof phone !== 'string') {
    return {
      isValid: false,
      standardized: null,
      isWhatsAppCompatible: false,
      error: 'Phone number is required'
    }
  }

  const standardized = standardizePhoneNumber(phone)
  
  if (!standardized) {
    return {
      isValid: false,
      standardized: null,
      isWhatsAppCompatible: false,
      error: 'Invalid phone number format. Must be a valid 10-digit Indian mobile number.'
    }
  }

  const isValid = validatePhoneNumber(standardized)
  const isWhatsAppCompatible = isWhatsAppCompatible(standardized)

  return {
    isValid,
    standardized,
    isWhatsAppCompatible,
    error: isValid ? undefined : 'Phone number format is not valid for Indian mobile numbers'
  }
}

/**
 * Processes multiple phone numbers and removes duplicates
 * @param phoneNumbers Array of phone numbers to process
 * @returns Processing result with valid, invalid, and duplicate numbers
 */
export function processBulkPhoneNumbers(phoneNumbers: string[]): BulkPhoneProcessingResult {
  const valid: string[] = []
  const invalid: Array<{ original: string; error: string }> = []
  const seenNumbers = new Set<string>()
  const duplicates: string[] = []

  for (const phone of phoneNumbers) {
    const result = validatePhoneNumberDetailed(phone)
    
    if (result.isValid && result.standardized) {
      if (seenNumbers.has(result.standardized)) {
        duplicates.push(result.standardized)
      } else {
        seenNumbers.add(result.standardized)
        valid.push(result.standardized)
      }
    } else {
      invalid.push({
        original: phone,
        error: result.error || 'Unknown validation error'
      })
    }
  }

  return {
    valid,
    invalid,
    duplicates,
    stats: {
      total: phoneNumbers.length,
      valid: valid.length,
      invalid: invalid.length,
      duplicates: duplicates.length
    }
  }
}

/**
 * Formats phone number for display (adds +91 prefix)
 * @param phone 10-digit phone number
 * @returns Formatted phone number with +91 prefix
 */
export function formatPhoneForDisplay(phone: string): string {
  if (validatePhoneNumber(phone)) {
    return `+91${phone}`
  }
  return phone
}

/**
 * Formats phone number for WhatsApp API (10-digit format)
 * @param phone Phone number in any format
 * @returns 10-digit format for WhatsApp API or null if invalid
 */
export function formatPhoneForWhatsApp(phone: string): string | null {
  return standardizePhoneNumber(phone)
}

/**
 * Generates sample phone numbers for testing
 * @param count Number of sample phone numbers to generate
 * @returns Array of valid sample phone numbers
 */
export function generateSamplePhoneNumbers(count: number = 10): string[] {
  const prefixes = ['98765', '87654', '76543', '65432', '94321', '83210', '72109', '61098', '90987', '89876']
  const samples: string[] = []
  
  for (let i = 0; i < count; i++) {
    const prefix = prefixes[i % prefixes.length]
    const suffix = String(i).padStart(5, '0')
    samples.push(prefix + suffix)
  }
  
  return samples
}