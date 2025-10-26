// Data processing utilities for contact management and phone number standardization

export interface ContactData {
  name?: string
  phone: string
  email?: string
  tags?: string[]
}

export interface ProcessingResult {
  success: ContactData[]
  errors: { row: number; data: any; error: string }[]
  duplicates: { row: number; phone: string }[]
  stats: {
    total: number
    processed: number
    success: number
    errors: number
    duplicates: number
  }
}

/**
 * Formats Indian phone numbers to standard +91XXXXXXXXXX format
 */
export function formatPhoneNumber(phone: string): string {
  if (!phone) return ''
  
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '')
  
  // Handle different Indian phone number formats
  if (cleaned.length === 10) {
    // 10-digit number, add +91
    return `+91${cleaned}`
  } else if (cleaned.length === 11 && cleaned.startsWith('0')) {
    // 11-digit starting with 0, remove 0 and add +91
    return `+91${cleaned.substring(1)}`
  } else if (cleaned.length === 12 && cleaned.startsWith('91')) {
    // 12-digit starting with 91, add +
    return `+${cleaned}`
  } else if (cleaned.length === 13 && cleaned.startsWith('091')) {
    // 13-digit starting with 091, remove 0 and add +
    return `+${cleaned.substring(1)}`
  }
  
  // If none of the above, return original if it looks like a valid format
  if (phone.startsWith('+91') && cleaned.length === 12) {
    return phone
  }
  
  // Return empty string for invalid numbers
  return ''
}

/**
 * Validates if a phone number is a valid Indian mobile number
 */
export function validatePhoneNumber(phone: string): boolean {
  const formatted = formatPhoneNumber(phone)
  if (!formatted) return false
  
  // Check if it's a valid Indian mobile number format
  const mobileRegex = /^\+91[6-9]\d{9}$/
  return mobileRegex.test(formatted)
}

/**
 * Validates email address format
 */
export function validateEmail(email: string): boolean {
  if (!email) return true // Email is optional
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Processes raw contact data and returns formatted results
 */
export function processContactData(rawData: any[]): ProcessingResult {
  const result: ProcessingResult = {
    success: [],
    errors: [],
    duplicates: [],
    stats: {
      total: rawData.length,
      processed: 0,
      success: 0,
      errors: 0,
      duplicates: 0
    }
  }

  const seenPhones = new Set<string>()

  rawData.forEach((row, index) => {
    try {
      result.stats.processed++

      // Extract data from row (handle different column names)
      const name = row.name || row.Name || row.full_name || row['Full Name'] || ''
      const phone = row.phone || row.Phone || row.mobile || row.Mobile || row.number || row.Number || ''
      const email = row.email || row.Email || row['Email Address'] || ''

      // Validate required fields
      if (!phone) {
        result.errors.push({
          row: index + 1,
          data: row,
          error: 'Phone number is required'
        })
        result.stats.errors++
        return
      }

      // Format and validate phone number
      const formattedPhone = formatPhoneNumber(phone)
      if (!formattedPhone || !validatePhoneNumber(formattedPhone)) {
        result.errors.push({
          row: index + 1,
          data: row,
          error: `Invalid phone number: ${phone}`
        })
        result.stats.errors++
        return
      }

      // Check for duplicates
      if (seenPhones.has(formattedPhone)) {
        result.duplicates.push({
          row: index + 1,
          phone: formattedPhone
        })
        result.stats.duplicates++
        return
      }

      // Validate email if provided
      if (email && !validateEmail(email)) {
        result.errors.push({
          row: index + 1,
          data: row,
          error: `Invalid email address: ${email}`
        })
        result.stats.errors++
        return
      }

      // Process tags if available
      let tags: string[] = []
      if (row.tags || row.Tags) {
        const tagString = row.tags || row.Tags
        if (typeof tagString === 'string') {
          tags = tagString.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
        }
      }

      // Add to success list
      seenPhones.add(formattedPhone)
      result.success.push({
        name: name.trim(),
        phone: formattedPhone,
        email: email.trim() || undefined,
        tags: tags.length > 0 ? tags : undefined
      })
      result.stats.success++

    } catch (error) {
      result.errors.push({
        row: index + 1,
        data: row,
        error: `Processing error: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
      result.stats.errors++
    }
  })

  return result
}

/**
 * Parses CSV content and returns array of objects
 */
export function parseCSV(csvContent: string): any[] {
  const lines = csvContent.trim().split('\n')
  if (lines.length < 2) return []

  const headers = lines[0].split(',').map(header => header.trim().replace(/"/g, ''))
  const data: any[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(value => value.trim().replace(/"/g, ''))
    const row: any = {}
    
    headers.forEach((header, index) => {
      row[header] = values[index] || ''
    })
    
    data.push(row)
  }

  return data
}

/**
 * Generates sample CSV content for testing
 */
export function generateSampleCSV(): string {
  const sampleData = [
    ['Name', 'Phone', 'Email', 'Tags'],
    ['Rajesh Kumar', '9876543210', 'rajesh@email.com', 'personal-loan,high-priority'],
    ['Priya Sharma', '+91-9876-543-211', 'priya.sharma@email.com', 'business-loan'],
    ['Amit Patel', '91 9876 543 212', '', 'home-loan,follow-up'],
    ['Sunita Gupta', '09876543213', 'sunita@email.com', ''],
    ['Vikram Singh', '+919876543214', 'vikram.singh@email.com', 'personal-loan']
  ]

  return sampleData.map(row => row.join(',')).join('\n')
}

/**
 * Exports contact data to CSV format
 */
export function exportToCSV(contacts: ContactData[]): string {
  const headers = ['Name', 'Phone', 'Email', 'Tags']
  const rows = contacts.map(contact => [
    contact.name || '',
    contact.phone,
    contact.email || '',
    contact.tags ? contact.tags.join(', ') : ''
  ])

  return [headers, ...rows].map(row => row.join(',')).join('\n')
}