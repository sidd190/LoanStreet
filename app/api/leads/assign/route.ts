import { NextRequest, NextResponse } from 'next/server'
import LeadAssignmentService from '../../../../lib/leadAssignmentService'

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    
    // Validate required fields
    if (!data.leadId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required field: leadId' 
        },
        { status: 400 }
      )
    }

    // Assign lead
    const result = await LeadAssignmentService.assignLead(
      data.leadId,
      data.assigneeId // Optional for manual assignment
    )

    return NextResponse.json({
      success: result.success,
      assignedTo: result.assignedTo,
      reason: result.reason,
      confidence: result.confidence,
      alternativeOptions: result.alternativeOptions
    })

  } catch (error) {
    console.error('Error in lead assignment API:', error)
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

// Bulk assignment endpoint
export async function PUT(request: NextRequest) {
  try {
    const { leadIds, assigneeId } = await request.json()
    
    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'leadIds must be a non-empty array' 
        },
        { status: 400 }
      )
    }

    const results = []
    let successCount = 0
    let errorCount = 0

    for (const leadId of leadIds) {
      try {
        const result = await LeadAssignmentService.assignLead(leadId, assigneeId)
        results.push({ leadId, ...result })
        
        if (result.success) {
          successCount++
        } else {
          errorCount++
        }
      } catch (error) {
        results.push({
          leadId,
          success: false,
          reason: error instanceof Error ? error.message : 'Unknown error'
        })
        errorCount++
      }
    }

    return NextResponse.json({
      success: successCount > 0,
      summary: {
        total: leadIds.length,
        successful: successCount,
        failed: errorCount
      },
      results
    })

  } catch (error) {
    console.error('Error in bulk lead assignment API:', error)
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