import { NextRequest, NextResponse } from 'next/server'
import { withAuthAndRole } from '@/lib/middleware/auth'
import DataService from '@/lib/dataService'
import { logDataAccess, logDataModification } from '@/lib/security/auditLogger'
import { trackError } from '@/lib/security/errorTracking'
import { recordPerformance } from '@/lib/security/monitoring'
import { validatePagination } from '@/lib/security/serverValidation'

// GET /api/contacts - Admin only
export async function GET(request: NextRequest) {
  return withAuthAndRole(['ADMIN'])(request, async (req) => {
    const startTime = Date.now()
    
    try {
      const { searchParams } = new URL(req.url)
      
      // Validate pagination parameters
      const paginationValidation = validatePagination(
        searchParams.get('limit') || undefined,
        searchParams.get('offset') || undefined
      )
      
      if (paginationValidation.errors.length > 0) {
        return NextResponse.json(
          {
            success: false,
            message: 'Invalid pagination parameters',
            errors: paginationValidation.errors
          },
          { status: 400 }
        )
      }
      
      const search = searchParams.get('search') || ''
      
      // Log data access
      await logDataAccess(
        'contacts',
        'list',
        req.user!,
        undefined,
        {
          limit: paginationValidation.limit,
          offset: paginationValidation.offset,
          search,
          endpoint: '/api/contacts'
        }
      )
      
      const contacts = await DataService.getContacts({ 
        limit: paginationValidation.limit, 
        offset: paginationValidation.offset, 
        search 
      })
      
      // Record performance
      recordPerformance(
        'contacts:list',
        Date.now() - startTime,
        true,
        undefined,
        { contactCount: contacts.length, search: !!search }
      )
      
      return NextResponse.json({
        success: true,
        contacts,
        pagination: {
          limit: paginationValidation.limit,
          offset: paginationValidation.offset,
          total: contacts.length
        }
      })
    } catch (error) {
      console.error('Contacts fetch error:', error)
      
      // Track error
      await trackError(error, {
        userId: req.user!.id,
        userEmail: req.user!.email,
        userRole: req.user!.role,
        endpoint: '/api/contacts',
        method: 'GET',
        timestamp: new Date()
      }, {
        operation: 'contacts:list',
        duration: Date.now() - startTime
      })
      
      // Record failed performance
      recordPerformance(
        'contacts:list',
        Date.now() - startTime,
        false,
        error instanceof Error ? error.message : 'Unknown error'
      )
      
      return NextResponse.json(
        { success: false, message: 'Failed to fetch contacts' },
        { status: 500 }
      )
    }
  })
}

// POST /api/contacts - Admin only
export async function POST(request: NextRequest) {
  return withAuthAndRole(['ADMIN'])(request, async (req) => {
    const startTime = Date.now()
    
    try {
      const contactData = await req.json()
      
      // Log data modification attempt
      await logDataModification(
        'contact',
        'create',
        req.user!,
        undefined,
        {
          contactData: {
            phone: contactData.phone,
            name: contactData.name,
            email: contactData.email
          },
          endpoint: '/api/contacts'
        }
      )
      
      const contact = await DataService.createContact(contactData)
      
      // Log successful creation
      await logDataModification(
        'contact',
        'create',
        req.user!,
        contact.id,
        {
          contactId: contact.id,
          phone: contact.phone,
          endpoint: '/api/contacts'
        },
        true
      )
      
      // Record performance
      recordPerformance(
        'contacts:create',
        Date.now() - startTime,
        true,
        undefined,
        { contactId: contact.id }
      )
      
      return NextResponse.json({
        success: true,
        contact,
        message: 'Contact created successfully'
      })
    } catch (error) {
      console.error('Contact creation error:', error)
      
      // Log failed creation
      await logDataModification(
        'contact',
        'create',
        req.user!,
        undefined,
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          endpoint: '/api/contacts'
        },
        false
      )
      
      // Track error
      await trackError(error, {
        userId: req.user!.id,
        userEmail: req.user!.email,
        userRole: req.user!.role,
        endpoint: '/api/contacts',
        method: 'POST',
        timestamp: new Date()
      }, {
        operation: 'contacts:create',
        duration: Date.now() - startTime
      })
      
      // Record failed performance
      recordPerformance(
        'contacts:create',
        Date.now() - startTime,
        false,
        error instanceof Error ? error.message : 'Unknown error'
      )
      
      return NextResponse.json(
        { success: false, message: 'Failed to create contact' },
        { status: 500 }
      )
    }
  })
}