import { NextRequest, NextResponse } from 'next/server'
import LeadCreationService from '../../../../lib/leadCreationService'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '30')

    // Get lead creation statistics
    const stats = await LeadCreationService.getLeadCreationStats(days)

    return NextResponse.json({
      success: true,
      stats,
      period: `${days} days`
    })

  } catch (error) {
    console.error('Error getting lead creation stats:', error)
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