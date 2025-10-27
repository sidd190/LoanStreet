interface ContactData {
  name: string
  phone: string
  email?: string
  tags?: string[]
}

interface ProcessedResult {
  success: ContactData[]
  errors: Array<{
    row: number
    data: any
    error: string
  }>
  stats: {
    total: number
    success: number
    errors: number
    duplicates: number
  }
}

export function parseCSV(csvText: string): string[][] {
  const lines = csvText.split('\n')
  const result: string[][] = []
  
  for (const line of lines) {
    if (line.trim()) {
      // Simple CSV parsing - in production, use a proper CSV parser
      const values = line.split(',').map(value => value.trim().replace(/^"|"$/g, ''))
      result.push(values)
    }
  }
  
  return result
}

export function cleanPhoneNumber(phone: string): string {
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, '')
  
  // Handle different Indian phone number formats
  if (cleaned.startsWith('91') && cleaned.length === 12) {
    // Already has country code
    return '+91' + cleaned.substring(2)
  } else if (cleaned.length === 10) {
    // Add country code
    return '+91' + cleaned
  } else if (cleaned.startsWith('0') && cleaned.length === 11) {
    // Remove leading 0 and add country code
    return '+91' + cleaned.substring(1)
  }
  
  // Return as is if format is unclear
  return '+91' + cleaned
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function validatePhone(phone: string): boolean {
  // Indian mobile number validation
  const phoneRegex = /^\+91[6-9]\d{9}$/
  return phoneRegex.test(phone)
}

export function processContactData(rawData: string[][]): ProcessedResult {
  if (rawData.length === 0) {
    return {
      success: [],
      errors: [],
      stats: { total: 0, success: 0, errors: 0, duplicates: 0 }
    }
  }

  const headers = rawData[0].map(h => h.toLowerCase().trim())
  const dataRows = rawData.slice(1)
  
  // Find column indices
  const nameIndex = headers.findIndex(h => 
    h.includes('name') || h.includes('full name') || h.includes('customer name')
  )
  const phoneIndex = headers.findIndex(h => 
    h.includes('phone') || h.includes('mobile') || h.includes('number') || h.includes('contact')
  )
  const emailIndex = headers.findIndex(h => 
    h.includes('email') || h.includes('mail')
  )
  const tagsIndex = headers.findIndex(h => 
    h.includes('tags') || h.includes('category') || h.includes('type')
  )

  const success: ContactData[] = []
  const errors: Array<{ row: number, data: any, error: string }> = []
  const phoneSet = new Set<string>()
  let duplicates = 0

  dataRows.forEach((row, index) => {
    const rowNumber = index + 2 // +2 because we start from row 2 (after header)
    
    try {
      const name = nameIndex >= 0 ? row[nameIndex]?.trim() : ''
      const rawPhone = phoneIndex >= 0 ? row[phoneIndex]?.trim() : ''
      const email = emailIndex >= 0 ? row[emailIndex]?.trim() : ''
      const tagsStr = tagsIndex >= 0 ? row[tagsIndex]?.trim() : ''
      
      // Validation
      if (!name) {
        errors.push({
          row: rowNumber,
          data: row,
          error: 'Name is required'
        })
        return
      }
      
      if (!rawPhone) {
        errors.push({
          row: rowNumber,
          data: row,
          error: 'Phone number is required'
        })
        return
      }
      
      const cleanedPhone = cleanPhoneNumber(rawPhone)
      
      if (!validatePhone(cleanedPhone)) {
        errors.push({
          row: rowNumber,
          data: row,
          error: `Invalid phone number format: ${rawPhone}`
        })
        return
      }
      
      if (email && !validateEmail(email)) {
        errors.push({
          row: rowNumber,
          data: row,
          error: `Invalid email format: ${email}`
        })
        return
      }
      
      // Check for duplicates
      if (phoneSet.has(cleanedPhone)) {
        duplicates++
        errors.push({
          row: rowNumber,
          data: row,
          error: `Duplicate phone number: ${cleanedPhone}`
        })
        return
      }
      
      phoneSet.add(cleanedPhone)
      
      // Parse tags
      const tags = tagsStr ? tagsStr.split(',').map(tag => tag.trim()).filter(Boolean) : []
      
      success.push({
        name,
        phone: cleanedPhone,
        email: email || undefined,
        tags: tags.length > 0 ? tags : undefined
      })
      
    } catch (error) {
      errors.push({
        row: rowNumber,
        data: row,
        error: error instanceof Error ? error.message : 'Unknown processing error'
      })
    }
  })

  return {
    success,
    errors,
    stats: {
      total: dataRows.length,
      success: success.length,
      errors: errors.length,
      duplicates
    }
  }
}

export function generateSampleCSV(): string {
  const sampleData = [
    ['Name', 'Phone', 'Email', 'Tags'],
    ['Rajesh Kumar', '9876543210', 'rajesh@example.com', 'personal-loan,high-priority'],
    ['Priya Sharma', '+91-9876543211', 'priya@example.com', 'business-loan'],
    ['Amit Patel', '91-9876543212', 'amit@example.com', 'home-loan,follow-up'],
    ['Sneha Gupta', '09876543213', 'sneha@example.com', 'personal-loan'],
    ['Vikram Singh', '9876-543-214', 'vikram@example.com', 'gold-loan,urgent']
  ]
  
  return sampleData.map(row => row.join(',')).join('\n')
}