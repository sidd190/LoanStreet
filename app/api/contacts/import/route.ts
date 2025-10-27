import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const { contacts, filename } = await request.json()

    console.log(`📥 Contact import started - ${contacts?.length || 0} contacts from ${filename || 'unknown file'}`)

    if (!contacts || !Array.isArray(contacts)) {
      console.error('❌ Invalid contacts data provided')
      return NextResponse.json(
        { message: 'Invalid contacts data' },
        { status: 400 }
      )
    }

    // Process contacts in batches to avoid overwhelming the database
    const batchSize = 100
    const results = []

    for (let i = 0; i < contacts.length; i += batchSize) {
      const batch = contacts.slice(i, i + batchSize)
      
      const batchResults = await Promise.allSettled(
        batch.map(async (contact: any) => {
          try {
            // Check if contact already exists
            const existingContact = await prisma.contact.findFirst({
              where: {
                OR: [
                  { phone: contact.phone },
                  { email: contact.email }
                ]
              }
            })

            if (existingContact) {
              // Update existing contact
              return await prisma.contact.update({
                where: { id: existingContact.id },
                data: {
                  name: contact.name,
                  phone: contact.phone,
                  email: contact.email,
                  tags: contact.tags || [],
                  updatedAt: new Date()
                }
              })
            } else {
              // Create new contact
              return await prisma.contact.create({
                data: {
                  name: contact.name,
                  phone: contact.phone,
                  email: contact.email,
                  tags: contact.tags || [],
                  source: 'CSV_IMPORT',
                  status: 'ACTIVE'
                }
              })
            }
          } catch (error) {
            console.error('Error processing contact:', error)
            throw error
          }
        })
      )

      results.push(...batchResults)
    }

    const successful = results.filter(result => result.status === 'fulfilled').length
    const failed = results.filter(result => result.status === 'rejected').length

    console.log(`✅ Contact import completed - ${successful} successful, ${failed} failed out of ${contacts.length} total`)

    return NextResponse.json({
      message: 'Import completed',
      stats: {
        total: contacts.length,
        successful,
        failed
      }
    })

  } catch (error) {
    console.error('❌ Contact import failed:', error)
    return NextResponse.json(
      { message: 'Import failed', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}