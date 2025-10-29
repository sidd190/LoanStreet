import { NextRequest } from 'next/server'
import { validateFileUpload, FileValidationOptions } from './validation'

/**
 * Secure file upload validation and processing
 */

// File type configurations
export const FILE_TYPES = {
  SPREADSHEET: {
    types: [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/csv',
      'text/plain'
    ],
    extensions: ['.csv', '.xls', '.xlsx'],
    maxSize: 10 * 1024 * 1024, // 10MB
  },
  IMAGE: {
    types: [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp'
    ],
    extensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
    maxSize: 5 * 1024 * 1024, // 5MB
  },
  VIDEO: {
    types: [
      'video/mp4',
      'video/mpeg',
      'video/quicktime',
      'video/x-msvideo'
    ],
    extensions: ['.mp4', '.mpeg', '.mov', '.avi'],
    maxSize: 50 * 1024 * 1024, // 50MB
  },
  DOCUMENT: {
    types: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ],
    extensions: ['.pdf', '.doc', '.docx', '.txt'],
    maxSize: 10 * 1024 * 1024, // 10MB
  }
} as const

// Dangerous file extensions that should never be allowed
const DANGEROUS_EXTENSIONS = [
  '.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js', '.jar',
  '.app', '.deb', '.pkg', '.dmg', '.rpm', '.msi', '.run', '.bin',
  '.sh', '.ps1', '.php', '.asp', '.jsp', '.py', '.rb', '.pl'
]

// MIME types that should never be allowed
const DANGEROUS_MIME_TYPES = [
  'application/x-executable',
  'application/x-msdownload',
  'application/x-msdos-program',
  'application/x-winexe',
  'application/x-javascript',
  'text/javascript',
  'application/javascript',
  'application/x-php',
  'text/x-php',
  'application/x-httpd-php'
]

/**
 * Validate file security
 */
export function validateFileSecurity(file: File): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  
  // Check file name for dangerous patterns
  const fileName = file.name.toLowerCase()
  
  // Check for dangerous extensions
  const hasDangerousExtension = DANGEROUS_EXTENSIONS.some(ext => fileName.endsWith(ext))
  if (hasDangerousExtension) {
    errors.push(`File type not allowed: ${fileName}`)
  }
  
  // Check for dangerous MIME types
  if (DANGEROUS_MIME_TYPES.includes(file.type)) {
    errors.push(`MIME type not allowed: ${file.type}`)
  }
  
  // Check for null bytes in filename (directory traversal attempt)
  if (fileName.includes('\0')) {
    errors.push('Invalid file name: contains null bytes')
  }
  
  // Check for path traversal attempts
  if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
    errors.push('Invalid file name: contains path traversal characters')
  }
  
  // Check for hidden files (starting with dot)
  if (fileName.startsWith('.')) {
    errors.push('Hidden files not allowed')
  }
  
  // Check file name length
  if (fileName.length > 255) {
    errors.push('File name too long')
  }
  
  // Check for empty file name
  if (fileName.trim().length === 0) {
    errors.push('File name cannot be empty')
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Validate file content by checking magic bytes
 */
export async function validateFileContent(file: File, expectedType: keyof typeof FILE_TYPES): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = []
  
  try {
    // Read first few bytes to check magic numbers
    const buffer = await file.slice(0, 16).arrayBuffer()
    const bytes = new Uint8Array(buffer)
    
    // Magic number validation
    const magicNumbers = {
      SPREADSHEET: [
        [0x50, 0x4B], // ZIP-based files (XLSX)
        [0xD0, 0xCF], // OLE2 files (XLS)
        [0xEF, 0xBB, 0xBF], // UTF-8 BOM (CSV)
      ],
      IMAGE: [
        [0xFF, 0xD8, 0xFF], // JPEG
        [0x89, 0x50, 0x4E, 0x47], // PNG
        [0x47, 0x49, 0x46], // GIF
        [0x52, 0x49, 0x46, 0x46], // WEBP
      ],
      VIDEO: [
        [0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70], // MP4
        [0x00, 0x00, 0x01, 0xBA], // MPEG
        [0x00, 0x00, 0x00, 0x14, 0x66, 0x74, 0x79, 0x70], // MOV
      ],
      DOCUMENT: [
        [0x25, 0x50, 0x44, 0x46], // PDF
        [0xD0, 0xCF, 0x11, 0xE0], // DOC
        [0x50, 0x4B, 0x03, 0x04], // DOCX
      ]
    }
    
    const expectedMagicNumbers = magicNumbers[expectedType]
    if (expectedMagicNumbers) {
      const hasValidMagicNumber = expectedMagicNumbers.some(magic => {
        return magic.every((byte, index) => bytes[index] === byte)
      })
      
      // For CSV files, also allow plain text
      if (!hasValidMagicNumber && expectedType === 'SPREADSHEET') {
        // Check if it's likely a CSV by looking for common CSV patterns
        const text = new TextDecoder().decode(bytes)
        const hasCommas = text.includes(',')
        const hasNewlines = text.includes('\n') || text.includes('\r')
        
        if (!hasCommas && !hasNewlines) {
          errors.push('File content does not match expected CSV format')
        }
      } else if (!hasValidMagicNumber) {
        errors.push(`File content does not match expected ${expectedType.toLowerCase()} format`)
      }
    }
  } catch (error) {
    errors.push('Unable to validate file content')
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Comprehensive file validation
 */
export async function validateUploadedFile(
  file: File,
  fileType: keyof typeof FILE_TYPES,
  customOptions?: Partial<FileValidationOptions>
): Promise<{ valid: boolean; errors: string[] }> {
  const allErrors: string[] = []
  
  // Basic security validation
  const securityValidation = validateFileSecurity(file)
  allErrors.push(...securityValidation.errors)
  
  // File type and size validation
  const typeConfig = FILE_TYPES[fileType]
  const validationOptions: FileValidationOptions = {
    allowedTypes: typeConfig.types,
    maxSize: typeConfig.maxSize,
    ...customOptions
  }
  
  const typeValidation = validateFileUpload(file, validationOptions)
  allErrors.push(...typeValidation.errors)
  
  // Content validation (magic bytes)
  const contentValidation = await validateFileContent(file, fileType)
  allErrors.push(...contentValidation.errors)
  
  return {
    valid: allErrors.length === 0,
    errors: allErrors
  }
}

/**
 * Extract and validate files from FormData
 */
export async function extractAndValidateFiles(
  request: NextRequest,
  fieldName: string,
  fileType: keyof typeof FILE_TYPES,
  maxFiles: number = 1
): Promise<{
  success: boolean
  files: File[]
  errors: string[]
}> {
  try {
    const formData = await request.formData()
    const files: File[] = []
    const errors: string[] = []
    
    // Extract files from form data
    const fileEntries = formData.getAll(fieldName)
    
    if (fileEntries.length === 0) {
      return {
        success: false,
        files: [],
        errors: ['No files provided']
      }
    }
    
    if (fileEntries.length > maxFiles) {
      return {
        success: false,
        files: [],
        errors: [`Maximum ${maxFiles} files allowed`]
      }
    }
    
    // Validate each file
    for (const entry of fileEntries) {
      if (entry instanceof File) {
        const validation = await validateUploadedFile(entry, fileType)
        
        if (validation.valid) {
          files.push(entry)
        } else {
          errors.push(...validation.errors)
        }
      } else {
        errors.push('Invalid file entry')
      }
    }
    
    return {
      success: errors.length === 0,
      files,
      errors
    }
  } catch (error) {
    return {
      success: false,
      files: [],
      errors: ['Failed to process uploaded files']
    }
  }
}

/**
 * Generate secure file name
 */
export function generateSecureFileName(originalName: string, prefix?: string): string {
  // Remove dangerous characters and normalize
  const cleanName = originalName
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/\.+/g, '.')
    .toLowerCase()
  
  // Extract extension
  const lastDotIndex = cleanName.lastIndexOf('.')
  const name = lastDotIndex > 0 ? cleanName.substring(0, lastDotIndex) : cleanName
  const extension = lastDotIndex > 0 ? cleanName.substring(lastDotIndex) : ''
  
  // Generate timestamp and random string
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  
  // Construct secure filename
  const secureBaseName = `${prefix ? prefix + '_' : ''}${timestamp}_${random}_${name}`
  
  // Limit length and add extension
  const maxLength = 100
  const truncatedName = secureBaseName.length > maxLength 
    ? secureBaseName.substring(0, maxLength) 
    : secureBaseName
  
  return truncatedName + extension
}

/**
 * File upload middleware with security validation
 */
export function withSecureFileUpload(
  fileType: keyof typeof FILE_TYPES,
  maxFiles: number = 1,
  fieldName: string = 'file'
) {
  return async function secureFileUploadMiddleware(
    request: NextRequest,
    handler: (req: NextRequest, files: File[]) => Promise<Response>
  ): Promise<Response> {
    try {
      const validation = await extractAndValidateFiles(request, fieldName, fileType, maxFiles)
      
      if (!validation.success) {
        return new Response(
          JSON.stringify({
            success: false,
            message: 'File validation failed',
            errors: validation.errors
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          }
        )
      }
      
      return handler(request, validation.files)
    } catch (error) {
      console.error('Secure file upload middleware error:', error)
      return new Response(
        JSON.stringify({
          success: false,
          message: 'File upload processing failed'
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }
  }
}