import { NextRequest, NextResponse } from 'next/server'
import LeadScoringEngine from '../../../../lib/leadScoringEngine'

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    
    if (data.action === 'update_single') {
      // Update single lead score
      if (!data.leadId) {
        return NextResponse.json(
          { success: false, error: 'Missing leadId' },
          { status: 400 }
        )
      }

      const result = await LeadScoringEngine.updateLeadScore(data.leadId)
      
      return NextResponse.json({
        success: true,
        updated: !!result,
        result
      })

    } else if (data.action === 'bulk_update') {
      // Bulk update all lead scores
      const results = await LeadScoringEngine.bulkUpdateLeadScores()
      
      return NextResponse.json({
        success: true,
        results
      })

    } else if (data.action === 'qualify') {
      // Qualify a lead
      if (!data.leadId) {
        return NextResponse.json(
          { success: false, error: 'Missing leadId' },
          { status: 400 }
        )
      }

      const qualification = await LeadScoringEngine.qualifyLead(data.leadId)
      
      return NextResponse.json({
        success: true,
        qualification
      })

    } else if (data.action === 'process_progression') {
      // Process lead progression
      const results = await LeadScoringEngine.processLeadProgression()
      
      return NextResponse.json({
        success: true,
        results
      })

    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid action' },
        { status: 400 }
      )
    }

  } catch (error) {
    console.error('Error in lead scoring API:', error)
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
    const action = searchParams.get('action')
    
    if (action === 'report') {
      const days = parseInt(searchParams.get('days') || '30')
      const report = await LeadScoringEngine.generateScoringReport(days)
      
      return NextResponse.json({
        success: true,
        report
      })

    } else if (action === 'insights') {
      const leadId = searchParams.get('leadId')
      
      if (!leadId) {
        return NextResponse.json(
          { success: false, error: 'Missing leadId' },
          { status: 400 }
        )
      }

      const insights = await LeadScoringEngine.getLeadInsights(leadId)
      
      return NextResponse.json({
        success: true,
        insights
      })

    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid action' },
        { status: 400 }
      )
    }

  } catch (error) {
    console.error('Error in lead scoring GET API:', error)
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