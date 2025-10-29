import * as XLSX from 'xlsx'
import { 
  standardizePhoneNumber, 
  validatePhoneNumber, 
  isWhatsAppCompatible, 
  extractMultiplePhoneNumbers 
} from './phoneNumberService'

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

interface ValidationError {
  row: number
  column: string
  field: string
  value: any
  error: string
  severity: 'error' | 'warning' | 'info'
}

interface DuplicateInfo {
  phone: string
  rows: number[]
  count: number
  action: 'merged' | 'skipped' | 'kept_first'
}

interface ProcessingStats {
  total: number
  success: number
  errors: number
  warnings: number
  duplicates: number
  phoneNumbersProcessed: number
  validPhoneNumbers: number
  invalidPhoneNumbers: number
  multipleNumberCells: number
  emailValidationResults: {
    total: number
    valid: number
    invalid: number
    missing: number
  }
}

interface FileProcessingResult {
  success: ContactData[]
  errors: ValidationError[]
  duplicates: DuplicateInfo[]
  stats: ProcessingStats
  validationReport: {
    fileInfo: {
      name: string
      size: number
      type: string
      rowCount: number
      columnCount: number
    }
    columnMapping: {
      detected: { [key: string]: string }
      missing: string[]
      suggestions: { [key: string]: string[] }
    }
    dataQuality: {
      completeness: number // percentage of complete records
      accuracy: number // percentage of valid data
      consistency: number // percentage of consistent formatting
    }
    recommendations: string[]
  }
}

export function parseCSV(csvText: string): string[][] {
  const lines = csvText.split('\n')
  const result: string[][] = []
  
  for (const line of lines) {
    if (line.trim()) {
      // Enhanced CSV parsing to handle quoted values with commas
      const values: string[] = []
      let current = ''
      let inQuotes = false
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i]
        
        if (char === '"') {
          inQuotes = !inQuotes
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim())
          current = ''
        } else {
          current += char
        }
      }
      
      values.push(current.trim())
      result.push(values)
    }
  }
  
  return result
}

export function parseXLSX(buffer: ArrayBuffer): string[][] {
  try {
    const workbook = XLSX.read(buffer, { type: 'array' })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    
    // Convert to array of arrays
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
      header: 1,
      defval: '',
      raw: false // Ensure all values are strings
    }) as string[][]
    
    return jsonData.filter(row => row.some(cell => cell && cell.toString().trim()))
  } catch (error) {
    throw new Error(`Failed to parse XLSX file: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

export async function processFileUpload(file: File): Promise<string[][]> {
  const fileExtension = file.name.toLowerCase().split('.').pop()
  
  if (fileExtension === 'csv') {
    const text = await file.text()
    return parseCSV(text)
  } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
    const buffer = await file.arrayBuffer()
    return parseXLSX(buffer)
  } else {
    throw new Error('Unsupported file format. Please upload CSV or XLSX files only.')
  }
}

// Phone number processing functions are now imported from phoneNumberService

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Phone validation functions are now imported from phoneNumberService

export function processContactData(rawData: string[][], filename: string = 'unknown'): FileProcessingResult {
  if (rawData.length === 0) {
    return createEmptyResult(filename)
  }

  const headers = rawData[0].map(h => h.toLowerCase().trim())
  const dataRows = rawData.slice(1)
  
  // Enhanced column detection with scoring
  const columnMapping = detectColumns(headers)
  const { nameIndex, phoneIndex, emailIndex, tagsIndex } = columnMapping.indices
  
  const success: ContactData[] = []
  const errors: ValidationError[] = []
  const duplicates: DuplicateInfo[] = []
  const phoneTracker = new Map<string, number[]>() // phone -> row numbers
  
  // Enhanced validation counters
  let totalPhoneNumbers = 0
  let validPhoneNumbers = 0
  let invalidPhoneNumbers = 0
  let multipleNumberCells = 0
  let emailStats = { total: 0, valid: 0, invalid: 0, missing: 0 }
  let warnings = 0

  dataRows.forEach((row, index) => {
    const rowNumber = index + 2 // +2 because we start from row 2 (after header)
    
    try {
      const name = nameIndex >= 0 ? row[nameIndex]?.toString().trim() : ''
      const rawPhone = phoneIndex >= 0 ? row[phoneIndex]?.toString().trim() : ''
      const email = emailIndex >= 0 ? row[emailIndex]?.toString().trim() : ''
      const tagsStr = tagsIndex >= 0 ? row[tagsIndex]?.toString().trim() : ''
      
      // Enhanced validation with detailed error reporting
      const rowErrors = validateRowData({ name, rawPhone, email, tagsStr }, rowNumber, row)
      
      if (rowErrors.length > 0) {
        errors.push(...rowErrors)
        // Count warnings vs errors
        warnings += rowErrors.filter(e => e.severity === 'warning').length
        return
      }
      
      // Process email statistics
      if (email) {
        emailStats.total++
        if (validateEmail(email)) {
          emailStats.valid++
        } else {
          emailStats.invalid++
          errors.push({
            row: rowNumber,
            column: headers[emailIndex] || 'email',
            field: 'email',
            value: email,
            error: `Invalid email format: ${email}`,
            severity: 'error'
          })
          return
        }
      } else {
        emailStats.missing++
      }
      
      // Extract and process phone numbers
      const phoneNumbers = extractMultiplePhoneNumbers(rawPhone)
      totalPhoneNumbers += phoneNumbers.length
      
      if (phoneNumbers.length === 0) {
        invalidPhoneNumbers++
        errors.push({
          row: rowNumber,
          column: headers[phoneIndex] || 'phone',
          field: 'phone',
          value: rawPhone,
          error: `No valid phone numbers found in: ${rawPhone}`,
          severity: 'error'
        })
        return
      }
      
      if (phoneNumbers.length > 1) {
        multipleNumberCells++
      }
      
      // Parse tags with validation
      const tags = parseAndValidateTags(tagsStr)
      
      // Process each phone number with duplicate tracking
      phoneNumbers.forEach((phone, phoneIndex) => {
        // Check WhatsApp compatibility
        if (!isWhatsAppCompatible(phone)) {
          invalidPhoneNumbers++
          errors.push({
            row: rowNumber,
            column: headers[phoneIndex] || 'phone',
            field: 'phone',
            value: phone,
            error: `Phone number not WhatsApp compatible: ${phone}`,
            severity: 'error'
          })
          return
        }
        
        // Track duplicates
        if (phoneTracker.has(phone)) {
          phoneTracker.get(phone)!.push(rowNumber)
        } else {
          phoneTracker.set(phone, [rowNumber])
          validPhoneNumbers++
          
          // Create contact entry (for multiple numbers, append index to name)
          const contactName = phoneNumbers.length > 1 ? `${name} (${phoneIndex + 1})` : name
          
          success.push({
            name: contactName,
            phone: phone,
            email: email || undefined,
            tags: tags.length > 0 ? tags : undefined
          })
        }
      })
      
    } catch (error) {
      errors.push({
        row: rowNumber,
        column: 'unknown',
        field: 'general',
        value: row,
        error: error instanceof Error ? error.message : 'Unknown processing error',
        severity: 'error'
      })
    }
  })

  // Process duplicates
  phoneTracker.forEach((rows, phone) => {
    if (rows.length > 1) {
      duplicates.push({
        phone,
        rows,
        count: rows.length,
        action: 'kept_first' // We kept the first occurrence
      })
    }
  })

  // Calculate data quality metrics
  const dataQuality = calculateDataQuality(success, errors, dataRows.length)
  
  // Generate recommendations
  const recommendations = generateRecommendations(columnMapping, errors, duplicates, dataQuality)

  return {
    success,
    errors,
    duplicates,
    stats: {
      total: dataRows.length,
      success: success.length,
      errors: errors.filter(e => e.severity === 'error').length,
      warnings,
      duplicates: duplicates.length,
      phoneNumbersProcessed: totalPhoneNumbers,
      validPhoneNumbers,
      invalidPhoneNumbers,
      multipleNumberCells,
      emailValidationResults: emailStats
    },
    validationReport: {
      fileInfo: {
        name: filename,
        size: 0, // Will be set by caller
        type: filename.split('.').pop() || 'unknown',
        rowCount: rawData.length,
        columnCount: headers.length
      },
      columnMapping: {
        detected: columnMapping.detected,
        missing: columnMapping.missing,
        suggestions: columnMapping.suggestions
      },
      dataQuality,
      recommendations
    }
  }
}

function createEmptyResult(filename: string): FileProcessingResult {
  return {
    success: [],
    errors: [],
    duplicates: [],
    stats: {
      total: 0,
      success: 0,
      errors: 0,
      warnings: 0,
      duplicates: 0,
      phoneNumbersProcessed: 0,
      validPhoneNumbers: 0,
      invalidPhoneNumbers: 0,
      multipleNumberCells: 0,
      emailValidationResults: { total: 0, valid: 0, invalid: 0, missing: 0 }
    },
    validationReport: {
      fileInfo: {
        name: filename,
        size: 0,
        type: 'unknown',
        rowCount: 0,
        columnCount: 0
      },
      columnMapping: {
        detected: {},
        missing: ['name', 'phone'],
        suggestions: {}
      },
      dataQuality: {
        completeness: 0,
        accuracy: 0,
        consistency: 0
      },
      recommendations: ['File is empty or could not be processed']
    }
  }
}

function detectColumns(headers: string[]) {
  const patterns = {
    name: ['name', 'full name', 'customer name', 'contact name', 'person', 'client name'],
    phone: ['phone', 'mobile', 'number', 'contact', 'cell', 'whatsapp', 'telephone', 'mob'],
    email: ['email', 'mail', 'e-mail', 'email address', 'e_mail'],
    tags: ['tags', 'category', 'type', 'segment', 'group', 'classification']
  }
  
  const detected: { [key: string]: string } = {}
  const suggestions: { [key: string]: string[] } = {}
  const indices = { nameIndex: -1, phoneIndex: -1, emailIndex: -1, tagsIndex: -1 }
  
  // Find best matches for each field
  Object.entries(patterns).forEach(([field, fieldPatterns]) => {
    let bestMatch = -1
    let bestScore = 0
    
    headers.forEach((header, index) => {
      const score = fieldPatterns.reduce((acc, pattern) => {
        if (header.includes(pattern)) {
          return acc + (header === pattern ? 2 : 1) // Exact match gets higher score
        }
        return acc
      }, 0)
      
      if (score > bestScore) {
        bestScore = score
        bestMatch = index
      }
    })
    
    if (bestMatch >= 0) {
      detected[field] = headers[bestMatch]
      if (field === 'name') indices.nameIndex = bestMatch
      if (field === 'phone') indices.phoneIndex = bestMatch
      if (field === 'email') indices.emailIndex = bestMatch
      if (field === 'tags') indices.tagsIndex = bestMatch
    } else {
      // Provide suggestions for missing fields
      suggestions[field] = headers.filter(h => 
        fieldPatterns.some(pattern => h.includes(pattern.split(' ')[0]))
      )
    }
  })
  
  const missing = Object.keys(patterns).filter(field => !detected[field])
  
  return { detected, missing, suggestions, indices }
}

function validateRowData(
  data: { name: string; rawPhone: string; email: string; tagsStr: string },
  rowNumber: number,
  row: any[]
): ValidationError[] {
  const errors: ValidationError[] = []
  
  // Name validation
  if (!data.name) {
    errors.push({
      row: rowNumber,
      column: 'name',
      field: 'name',
      value: data.name,
      error: 'Name is required',
      severity: 'error'
    })
  } else if (data.name.length < 2) {
    errors.push({
      row: rowNumber,
      column: 'name',
      field: 'name',
      value: data.name,
      error: 'Name too short (minimum 2 characters)',
      severity: 'warning'
    })
  }
  
  // Phone validation
  if (!data.rawPhone) {
    errors.push({
      row: rowNumber,
      column: 'phone',
      field: 'phone',
      value: data.rawPhone,
      error: 'Phone number is required',
      severity: 'error'
    })
  }
  
  return errors
}

function parseAndValidateTags(tagsStr: string): string[] {
  if (!tagsStr) return []
  
  return tagsStr
    .split(',')
    .map(tag => tag.trim())
    .filter(tag => tag.length > 0 && tag.length <= 50) // Reasonable tag length limit
    .slice(0, 10) // Limit number of tags
}

function calculateDataQuality(
  success: ContactData[],
  errors: ValidationError[],
  totalRows: number
): { completeness: number; accuracy: number; consistency: number } {
  if (totalRows === 0) {
    return { completeness: 0, accuracy: 0, consistency: 0 }
  }
  
  // Completeness: percentage of rows with all required fields
  const completeness = (success.length / totalRows) * 100
  
  // Accuracy: percentage of valid data (non-error records)
  const errorCount = errors.filter(e => e.severity === 'error').length
  const accuracy = ((totalRows - errorCount) / totalRows) * 100
  
  // Consistency: based on format consistency (simplified metric)
  const phoneFormatConsistency = success.length > 0 ? 
    (success.filter(c => c.phone.length === 10).length / success.length) * 100 : 0
  const consistency = phoneFormatConsistency
  
  return {
    completeness: Math.round(completeness * 100) / 100,
    accuracy: Math.round(accuracy * 100) / 100,
    consistency: Math.round(consistency * 100) / 100
  }
}

function generateRecommendations(
  columnMapping: any,
  errors: ValidationError[],
  duplicates: DuplicateInfo[],
  dataQuality: any
): string[] {
  const recommendations: string[] = []
  
  // Column mapping recommendations
  if (columnMapping.missing.length > 0) {
    recommendations.push(`Missing required columns: ${columnMapping.missing.join(', ')}. Please ensure your file has these columns.`)
  }
  
  // Data quality recommendations
  if (dataQuality.completeness < 80) {
    recommendations.push('Low data completeness detected. Consider reviewing rows with missing required fields.')
  }
  
  if (dataQuality.accuracy < 90) {
    recommendations.push('Data accuracy issues found. Review validation errors and correct invalid entries.')
  }
  
  // Error-based recommendations
  const phoneErrors = errors.filter(e => e.field === 'phone').length
  if (phoneErrors > 0) {
    recommendations.push(`${phoneErrors} phone number validation errors found. Ensure phone numbers are valid 10-digit Indian mobile numbers.`)
  }
  
  const emailErrors = errors.filter(e => e.field === 'email').length
  if (emailErrors > 0) {
    recommendations.push(`${emailErrors} email validation errors found. Check email format and correct invalid addresses.`)
  }
  
  // Duplicate recommendations
  if (duplicates.length > 0) {
    recommendations.push(`${duplicates.length} duplicate phone numbers found. Consider merging or removing duplicate entries.`)
  }
  
  // Success recommendations
  if (recommendations.length === 0) {
    recommendations.push('Data quality looks good! All validation checks passed successfully.')
  }
  
  return recommendations
}

export function generateSampleCSV(): string {
  const sampleData = [
    ['Name', 'Phone', 'Email', 'Tags'],
    ['Rajesh Kumar', '9876543210', 'rajesh@example.com', 'personal-loan,high-priority'],
    ['Priya Sharma', '+91-9876543211', 'priya@example.com', 'business-loan'],
    ['Amit Patel', '91-9876543212', 'amit@example.com', 'home-loan,follow-up'],
    ['Sneha Gupta', '09876543213', 'sneha@example.com', 'personal-loan'],
    ['Vikram Singh', '9876-543-214', 'vikram@example.com', 'gold-loan,urgent'],
    ['Multiple Numbers Family', '9876543215,9876543216,9876543217', 'family@example.com', 'family-loan'],
    ['Business Contact', '9876543218;9876543219', 'business@example.com', 'business-loan,bulk'],
    ['Invalid Example', '123456789', 'invalid@example.com', 'test-data'],
    ['Mixed Format', '+91-9876543220, 09876543221', 'mixed@example.com', 'mixed-format']
  ]
  
  return sampleData.map(row => row.join(',')).join('\n')
}

export function generateSampleXLSX(): ArrayBuffer {
  const sampleData = [
    ['Name', 'Phone', 'Email', 'Tags'],
    ['Rajesh Kumar', '9876543210', 'rajesh@example.com', 'personal-loan,high-priority'],
    ['Priya Sharma', '+91-9876543211', 'priya@example.com', 'business-loan'],
    ['Amit Patel', '91-9876543212', 'amit@example.com', 'home-loan,follow-up'],
    ['Sneha Gupta', '09876543213', 'sneha@example.com', 'personal-loan'],
    ['Vikram Singh', '9876-543-214', 'vikram@example.com', 'gold-loan,urgent'],
    ['Multiple Numbers Family', '9876543215,9876543216,9876543217', 'family@example.com', 'family-loan'],
    ['Business Contact', '9876543218;9876543219', 'business@example.com', 'business-loan,bulk']
  ]
  
  const worksheet = XLSX.utils.aoa_to_sheet(sampleData)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Contacts')
  
  return XLSX.write(workbook, { type: 'array', bookType: 'xlsx' })
}

/**
 * Export validation report as CSV for external analysis
 */
export function exportValidationReport(validationResults: FileProcessingResult): string {
  const headers = ['Row', 'Field', 'Value', 'Error', 'Severity']
  const rows = validationResults.errors.map(error => [
    error.row.toString(),
    error.field,
    typeof error.value === 'string' ? error.value : JSON.stringify(error.value),
    error.error,
    error.severity
  ])
  
  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
    .join('\n')
  
  return csvContent
}

/**
 * Generate validation summary for quick overview
 */
export function generateValidationSummary(validationResults: FileProcessingResult): string {
  const { stats, validationReport } = validationResults
  const { dataQuality } = validationReport
  
  const summary = `
Validation Summary for ${validationReport.fileInfo.name}
================================================

File Information:
- File Size: ${(validationReport.fileInfo.size / 1024).toFixed(2)} KB
- Total Rows: ${stats.total}
- Columns: ${validationReport.fileInfo.columnCount}

Processing Results:
- Successful Records: ${stats.success} (${((stats.success / stats.total) * 100).toFixed(1)}%)
- Error Records: ${stats.errors}
- Warning Records: ${stats.warnings}
- Duplicate Records: ${stats.duplicates}

Data Quality Metrics:
- Completeness: ${dataQuality.completeness.toFixed(1)}%
- Accuracy: ${dataQuality.accuracy.toFixed(1)}%
- Consistency: ${dataQuality.consistency.toFixed(1)}%

Phone Number Processing:
- Total Numbers Processed: ${stats.phoneNumbersProcessed}
- Valid Numbers: ${stats.validPhoneNumbers}
- Invalid Numbers: ${stats.invalidPhoneNumbers}
- Multi-Number Cells: ${stats.multipleNumberCells}

Email Validation:
- Total Emails: ${stats.emailValidationResults.total}
- Valid Emails: ${stats.emailValidationResults.valid}
- Invalid Emails: ${stats.emailValidationResults.invalid}
- Missing Emails: ${stats.emailValidationResults.missing}

Recommendations:
${validationReport.recommendations.map(rec => `- ${rec}`).join('\n')}
`.trim()
  
  return summary
}

/**
 * Validate contact data against existing database records
 */
export async function validateAgainstDatabase(contacts: ContactData[]): Promise<{
  newContacts: ContactData[]
  existingContacts: Array<{ contact: ContactData; existingId: string }>
  conflicts: Array<{ contact: ContactData; conflict: string }>
}> {
  // This would typically use Prisma to check against existing records
  // For now, returning a mock implementation structure
  return {
    newContacts: contacts,
    existingContacts: [],
    conflicts: []
  }
}