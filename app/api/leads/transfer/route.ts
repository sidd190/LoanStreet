import { NextRequest, NextResponse } from 'next/server'
import LeadAssignmentService from '../../../../lib/leadAssignmentService'

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    
    // Validate required fields
    if (!data.leadId || !data.fromUserId || !data.toUserId || !data.reason) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields: leadId, fromUserId, toUserId, reason' 
        },
        { status: 400 }
      )
    }

    // Transfer lead
    const result = await LeadAssignmentService.transferLead(
      data.leadId,
      data.fromUserId,
      data.toUserId,
      data.reason
    )

    return NextResponse.json({
      success: result.success,
      assignedTo: result.assignedTo,
      reason: result.reason,
      confidence: result.confidence
    })

  } catch (error) {
    console.error('Error in lead transfer API:', error)
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