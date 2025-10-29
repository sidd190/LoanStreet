import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'detect'
    
    console.log(`🔍 Duplicate detection - action: ${action}`)

    if (action === 'detect') {
      // Find duplicate phone numbers in database
      const duplicates = await prisma.$queryRaw`
        SELECT phone, COUNT(*) as count, GROUP_CONCAT(id) as ids
        FROM Contact 
        GROUP BY phone 
        HAVING COUNT(*) > 1
        ORDER BY count DESC
      ` as Array<{ phone: string; count: number; ids: string }>

      const duplicateDetails = await Promise.all(
        duplicates.map(async (dup) => {
          const ids = dup.ids.split(',')
          const contacts = await prisma.contact.findMany({
            where: { id: { in: ids } },
            select: {
              id: true,
              name: true,
              phone: true,
              email: true,
              source: true,
              createdAt: true,
              updatedAt: true
            }
          })
          
          return {
            phone: dup.phone,
            count: dup.count,
            contacts
          }
        })
      )

      return NextResponse.json({
        message: 'Duplicate detection completed',
        duplicates: duplicateDetails,
        stats: {
          totalDuplicateGroups: duplicates.length,
          totalDuplicateContacts: duplicates.reduce((sum, dup) => sum + dup.count, 0)
        }
      })
    }

    return NextResponse.json(
      { message: 'Invalid action parameter' },
      { status: 400 }
    )

  } catch (error) {
    console.error('❌ Duplicate detection failed:', error)
    return NextResponse.json(
      { 
        message: 'Duplicate detection failed', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, duplicateGroups } = await request.json()
    
    if (!action || !duplicateGroups) {
      return NextResponse.json(
        { message: 'Action and duplicateGroups are required' },
        { status: 400 }
      )
    }

    console.log(`🔧 Duplicate management - action: ${action}, groups: ${duplicateGroups.length}`)

    let processedCount = 0
    let errorCount = 0

    if (action === 'merge') {
      // Merge duplicate contacts - keep the oldest, merge data from others
      for (const group of duplicateGroups) {
        try {
          const contacts = await prisma.contact.findMany({
            where: { phone: group.phone },
            orderBy: { createdAt: 'asc' }
          })

          if (contacts.length > 1) {
            const primaryContact = contacts[0]
            const duplicateContacts = contacts.slice(1)

            // Merge data into primary contact
            const mergedTags = new Set([
              ...(primaryContact.tags || []),
              ...duplicateContacts.flatMap(c => c.tags || [])
            ])

            const mergedEmail = primaryContact.email || 
              duplicateContacts.find(c => c.email)?.email

            // Update primary contact with merged data
            await prisma.contact.update({
              where: { id: primaryContact.id },
              data: {
                email: mergedEmail,
                tags: Array.from(mergedTags),
                updatedAt: new Date()
              }
            })

            // Delete duplicate contacts
            await prisma.contact.deleteMany({
              where: { 
                id: { in: duplicateContacts.map(c => c.id) }
              }
            })

            processedCount++
          }
        } catch (error) {
          console.error(`Error merging duplicates for phone ${group.phone}:`, error)
          errorCount++
        }
      }
    } else if (action === 'delete_duplicates') {
      // Delete all but the first occurrence of each duplicate
      for (const group of duplicateGroups) {
        try {
          const contacts = await prisma.contact.findMany({
            where: { phone: group.phone },
            orderBy: { createdAt: 'asc' }
          })

          if (contacts.length > 1) {
            const duplicateIds = contacts.slice(1).map(c => c.id)
            
            await prisma.contact.deleteMany({
              where: { id: { in: duplicateIds } }
            })

            processedCount++
          }
        } catch (error) {
          console.error(`Error deleting duplicates for phone ${group.phone}:`, error)
          errorCount++
        }
      }
    } else {
      return NextResponse.json(
        { message: 'Invalid action. Use "merge" or "delete_duplicates"' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      message: `Duplicate ${action} completed`,
      stats: {
        processedGroups: processedCount,
        errorGroups: errorCount,
        totalGroups: duplicateGroups.length
      }
    })

  } catch (error) {
    console.error('❌ Duplicate management failed:', error)
    return NextResponse.json(
      { 
        message: 'Duplicate management failed', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}