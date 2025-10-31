import { NextRequest, NextResponse } from 'next/server'
import LeadAssignmentService from '../../../../lib/leadAssignmentService'

export async function POST(request: NextRequest) {
  try {
    // Process escalations
    const results = await LeadAssignmentService.processEscalations()

    return NextResponse.json({
      success: true,
      results
    })

  } catch (error) {
    console.error('Error processing escalations:', error)
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '30')

    // Get assignment statistics
    const stats = await LeadAssignmentService.getAssignmentStats(days)

    return NextResponse.json({
      success: true,
      stats,
      period: `${days} days`
    })

  } catch (error) {
    console.error('Error getting assignment stats:', error)
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