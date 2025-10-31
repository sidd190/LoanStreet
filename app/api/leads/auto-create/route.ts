import { NextRequest, NextResponse } from 'next/server'
import LeadCreationService from '../../../../lib/leadCreationService'

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    
    // Validate required fields
    if (!data.messageId || !data.contactId || !data.content || !data.contactPhone) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields: messageId, contactId, content, contactPhone' 
        },
        { status: 400 }
      )
    }

    // Create lead from message
    const result = await LeadCreationService.createLeadFromMessage(
      data.messageId,
      data.contactId,
      data.content,
      data.contactPhone,
      data.contactName,
      data.contactEmail
    )

    return NextResponse.json({
      success: result.success,
      leadId: result.leadId,
      lead: result.lead,
      confidence: result.confidence,
      detectedKeywords: result.detectedKeywords,
      extractedInfo: result.extractedInfo,
      reason: result.reason
    })

  } catch (error) {
    console.error('Error in auto-create lead API:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Bulk processing endpoint
export async function PUT(request: NextRequest) {
  try {
    const { messages } = await request.json()
    
    if (!Array.isArray(messages)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Messages must be an array' 
        },
        { status: 400 }
      )
    }

    // Process bulk messages
    const results = await LeadCreationService.processBulkMessages(messages)

    return NextResponse.json({
      success: true,
      results
    })

  } catch (error) {
    console.error('Error in bulk lead creation API:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}