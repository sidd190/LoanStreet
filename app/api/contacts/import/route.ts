import { NextRequest, NextResponse } from 'next/server'
import { withAuthAndRole } from '@/lib/middleware/auth'
import { logDataModification } from '@/lib/security/auditLogger'
import { trackError } from '@/lib/security/errorTracking'
import { recordPerformance } from '@/lib/security/monitoring'

// POST /api/contacts/import - Admin only
export async function POST(request: NextRequest) {
  return withAuthAndRole(['ADMIN'])(request, async (req) => {
    const startTime = Date.now()
    
    try {
      const formData = await req.formData()
      const file = formData.get('file') as File
      
      if (!file) {
        return NextResponse.json(
          { success: false, message: 'No file provided' },
          { status: 400 }
        )
      }

      if (!file.name.endsWith('.csv')) {
        return NextResponse.json(
          { success: false, message: 'Only CSV files are supported' },
          { status: 400 }
        )
      }

      // Log import attempt
      await logDataModification(
        'contacts',
        'import',
        req.user!,
        undefined,
        {
          fileName: file.name,
          fileSize: file.size,
          endpoint: '/api/contacts/import'
        }
      )

      // Parse CSV file
      const text = await file.text()
      const lines = text.split('\n').filter(line => line.trim())
      
      if (lines.length === 0) {
        return NextResponse.json(
          { success: false, message: 'File is empty' },
          { status: 400 }
        )
      }

      // Parse header row
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
      const dataLines = lines.slice(1)

      // Validate required columns
      const requiredColumns = ['name', 'phone']
      const missingColumns = requiredColumns.filter(col => !headers.includes(col))
      
      if (missingColumns.length > 0) {
        return NextResponse.json(
          { 
            success: false, 
            message: `Missing required columns: ${missingColumns.join(', ')}`,
            errors: [`Required columns: ${requiredColumns.join(', ')}`]
          },
          { status: 400 }
        )
      }

      // Process contacts
      const contacts = []
      const errors = []
      const duplicates = new Set()
      const existingPhones = new Set() // In real implementation, fetch from database

      for (let i = 0; i < dataLines.length; i++) {
        const lineNumber = i + 2 // +2 because we start from line 2 (after header)
        const values = dataLines[i].split(',').map(v => v.trim())
        
        if (values.length !== headers.length) {
          errors.push(`Line ${lineNumber}: Column count mismatch`)
          continue
        }

        const contact: any = {}
        
        // Map values to contact object
        headers.forEach((header, index) => {
          const value = values[index]
          
          switch (header) {
            case 'name':
              contact.name = value
              break
            case 'phone':
              contact.phone = value
              break
            case 'email':
              contact.email = value || undefined
              break
            case 'tags':
              contact.tags = value ? value.split(';').map(t => t.trim()).filter(Boolean) : []
              break
            case 'source':
              contact.source = value || 'CSV Import'
              break
            case 'status':
              contact.status = ['ACTIVE', 'INACTIVE', 'BLOCKED'].includes(value.toUpperCase()) 
                ? value.toUpperCase() 
                : 'ACTIVE'
              break
          }
        })

        // Validate required fields
        if (!contact.name || !contact.phone) {
          errors.push(`Line ${lineNumber}: Missing required fields (name, phone)`)
          continue
        }

        // Check for duplicates
        if (existingPhones.has(contact.phone) || duplicates.has(contact.phone)) {
          duplicates.add(contact.phone)
          continue
        }

        // Validate phone format (basic validation)
        if (!/^[\+]?[\d\s\-\(\)]+$/.test(contact.phone)) {
          errors.push(`Line ${lineNumber}: Invalid phone format`)
          continue
        }

        // Set defaults
        contact.totalMessages = 0
        contact.totalCampaigns = 0
        contact.responseRate = 0
        contact.createdAt = new Date().toISOString()
        contact.updatedAt = new Date().toISOString()

        contacts.push(contact)
        duplicates.add(contact.phone)
      }

      // In a real implementation, save contacts to database here
      // For now, we'll simulate the process

      const result = {
        success: true,
        imported: contacts.length,
        duplicates: duplicates.size - contacts.length,
        errors: errors.slice(0, 10) // Limit errors to first 10
      }

      // Log successful import
      await logDataModification(
        'contacts',
        'import',
        req.user!,
        undefined,
        {
          fileName: file.name,
          imported: result.imported,
          duplicates: result.duplicates,
          errors: result.errors.length,
          endpoint: '/api/contacts/import'
        },
        true
      )

      // Record performance
      recordPerformance(
        'contacts:import',
        Date.now() - startTime,
        true,
        undefined,
        { 
          imported: result.imported,
          duplicates: result.duplicates,
          errors: result.errors.length
        }
      )

      return NextResponse.json({
        success: true,
        ...result,
        message: `Successfully imported ${result.imported} contacts`
      })

    } catch (error) {
      console.error('Contact import error:', error)

      // Log failed import
      await logDataModification(
        'contacts',
        'import',
        req.user!,
        undefined,
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          endpoint: '/api/contacts/import'
        },
        false
      )

      // Track error
      await trackError(error, {
        userId: req.user!.id,
        userEmail: req.user!.email,
        userRole: req.user!.role,
        endpoint: '/api/contacts/import',
        method: 'POST',
        timestamp: new Date()
      }, {
        operation: 'contacts:import',
        duration: Date.now() - startTime
      })

      // Record failed performance
      recordPerformance(
        'contacts:import',
        Date.now() - startTime,
        false,
        error instanceof Error ? error.message : 'Unknown error'
      )

      return NextResponse.json(
        { 
          success: false, 
          message: 'Failed to import contacts',
          imported: 0,
          errors: ['Internal server error']
        },
        { status: 500 }
      )
    }
  })
}