import { NextRequest, NextResponse } from 'next/server'
import { withAuthAndRole } from '@/lib/middleware/auth'
import DataService from '@/lib/dataService'
import { logDataAccess } from '@/lib/security/auditLogger'
import { trackError } from '@/lib/security/errorTracking'
import { recordPerformance } from '@/lib/security/monitoring'

// GET /api/contacts/export - Admin only
export async function GET(request: NextRequest) {
  return withAuthAndRole(['ADMIN'])(request, async (req) => {
    const startTime = Date.now()
    
    try {
      const { searchParams } = new URL(req.url)
      
      // Parse export parameters
      const format = searchParams.get('format') || 'csv'
      const fields = searchParams.get('fields')?.split(',') || ['name', 'phone', 'email', 'tags', 'source', 'status', 'createdAt']
      const includeHeaders = searchParams.get('includeHeaders') !== 'false'
      const dateFormat = searchParams.get('dateFormat') || 'readable'
      
      // Parse filter parameters
      const status = searchParams.get('status')?.split(',')
      const source = searchParams.get('source')?.split(',')
      const tags = searchParams.get('tags')?.split(',')
      const searchTerm = searchParams.get('search')

      // Log export attempt
      await logDataAccess(
        'contacts',
        'export',
        req.user!,
        undefined,
        {
          format,
          fields: fields.length,
          filters: { status, source, tags, searchTerm },
          endpoint: '/api/contacts/export'
        }
      )

      // Get all contacts
      const allContacts = await DataService.getContacts()
      
      // Apply filters
      let filteredContacts = allContacts

      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase()
        filteredContacts = filteredContacts.filter(contact => 
          contact.name.toLowerCase().includes(searchLower) ||
          contact.phone.includes(searchLower) ||
          contact.email?.toLowerCase().includes(searchLower) ||
          contact.tags?.some(tag => tag.toLowerCase().includes(searchLower))
        )
      }

      if (status && status.length > 0) {
        filteredContacts = filteredContacts.filter(contact => status.includes(contact.status))
      }

      if (source && source.length > 0) {
        filteredContacts = filteredContacts.filter(contact => source.includes(contact.source))
      }

      if (tags && tags.length > 0) {
        filteredContacts = filteredContacts.filter(contact => 
          contact.tags?.some(tag => tags.includes(tag))
        )
      }

      // Field mapping for headers
      const fieldLabels: Record<string, string> = {
        name: 'Name',
        phone: 'Phone',
        email: 'Email',
        tags: 'Tags',
        source: 'Source',
        status: 'Status',
        totalMessages: 'Total Messages',
        totalCampaigns: 'Total Campaigns',
        responseRate: 'Response Rate',
        lastContact: 'Last Contact',
        createdAt: 'Created Date',
        updatedAt: 'Updated Date'
      }

      if (format === 'csv') {
        // Generate CSV
        const headers = fields.map(field => fieldLabels[field] || field)
        
        const rows = filteredContacts.map(contact => 
          fields.map(field => {
            let value = contact[field as keyof typeof contact]
            
            // Handle special formatting
            if (field === 'tags' && Array.isArray(value)) {
              value = value.join(';')
            } else if ((field === 'createdAt' || field === 'updatedAt' || field === 'lastContact') && value) {
              if (dateFormat === 'readable') {
                value = new Date(value as string).toLocaleString()
              }
            }
            
            // Escape commas and quotes for CSV
            const stringValue = String(value || '')
            if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
              return `"${stringValue.replace(/"/g, '""')}"`
            }
            return stringValue
          })
        )
        
        const csvContent = [
          includeHeaders ? headers.join(',') : null,
          ...rows.map(row => row.join(','))
        ].filter(Boolean).join('\n')

        // Record performance
        recordPerformance(
          'contacts:export',
          Date.now() - startTime,
          true,
          undefined,
          { 
            format,
            contactCount: filteredContacts.length,
            fieldCount: fields.length
          }
        )

        return new NextResponse(csvContent, {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="contacts_export_${new Date().toISOString().split('T')[0]}.csv"`
          }
        })
      } else if (format === 'json') {
        // Generate JSON
        const jsonData = filteredContacts.map(contact => {
          const exportContact: any = {}
          fields.forEach(field => {
            let value = contact[field as keyof typeof contact]
            
            // Handle date formatting for JSON
            if ((field === 'createdAt' || field === 'updatedAt' || field === 'lastContact') && value) {
              if (dateFormat === 'readable') {
                value = new Date(value as string).toLocaleString()
              }
            }
            
            exportContact[field] = value
          })
          return exportContact
        })

        // Record performance
        recordPerformance(
          'contacts:export',
          Date.now() - startTime,
          true,
          undefined,
          { 
            format,
            contactCount: filteredContacts.length,
            fieldCount: fields.length
          }
        )

        return new NextResponse(JSON.stringify(jsonData, null, 2), {
          headers: {
            'Content-Type': 'application/json',
            'Content-Disposition': `attachment; filename="contacts_export_${new Date().toISOString().split('T')[0]}.json"`
          }
        })
      } else {
        return NextResponse.json(
          { success: false, message: 'Unsupported format' },
          { status: 400 }
        )
      }

    } catch (error) {
      console.error('Contact export error:', error)

      // Track error
      await trackError(error, {
        userId: req.user!.id,
        userEmail: req.user!.email,
        userRole: req.user!.role,
        endpoint: '/api/contacts/export',
        method: 'GET',
        timestamp: new Date()
      }, {
        operation: 'contacts:export',
        duration: Date.now() - startTime
      })

      // Record failed performance
      recordPerformance(
        'contacts:export',
        Date.now() - startTime,
        false,
        error instanceof Error ? error.message : 'Unknown error'
      )

      return NextResponse.json(
        { success: false, message: 'Failed to export contacts' },
        { status: 500 }
      )
    }
  })
}