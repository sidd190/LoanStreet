import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    // Try to get contacts from database
    const contacts = await prisma.contact.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Transform Prisma data to match our interface
    const transformedContacts = contacts.map(contact => ({
      id: contact.id,
      name: contact.name || 'Unknown',
      phone: contact.phone,
      email: contact.email,
      tags: contact.tags ? JSON.parse(contact.tags) : [],
      source: 'Database',
      status: contact.isActive ? 'ACTIVE' : 'INACTIVE',
      lastContact: contact.lastContact?.toISOString(),
      totalMessages: 0, // Would need to count from messages table
      totalCampaigns: 0, // Would need to count from campaign_contacts table
      responseRate: 0, // Would need to calculate
      createdAt: contact.createdAt.toISOString(),
      updatedAt: contact.updatedAt.toISOString()
    }))

    return NextResponse.json(transformedContacts)
  } catch (error) {
    console.error('Database error in /api/contacts:', error)
    // Return error so DataService falls back to JSON data
    return NextResponse.json(
      { error: 'Database not available' },
      { status: 503 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    
    const contact = await prisma.contact.create({
      data: {
        name: data.name,
        phone: data.phone,
        email: data.email,
        tags: JSON.stringify(data.tags || []),
        isActive: data.status === 'ACTIVE'
      }
    })

    return NextResponse.json(contact)
  } catch (error) {
    console.error('Error creating contact:', error)
    return NextResponse.json(
      { error: 'Failed to create contact' },
      { status: 500 }
    )
  }
}