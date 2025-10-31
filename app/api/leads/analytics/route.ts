import { NextRequest, NextResponse } from 'next/server'
import LeadAnalyticsService from '../../../../lib/leadAnalyticsService'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    
    // Parse date parameters
    const startDateParam = searchParams.get('startDate')
    const endDateParam = searchParams.get('endDate')
    const days = parseInt(searchParams.get('days') || '30')
    
    let startDate: Date
    let endDate: Date
    
    if (startDateParam && endDateParam) {
      startDate = new Date(startDateParam)
      endDate = new Date(endDateParam)
    } else {
      endDate = new Date()
      startDate = new Date()
      startDate.setDate(startDate.getDate() - days)
    }

    // Parse filters
    const filters: any = {}
    const sources = searchParams.get('sources')
    const loanTypes = searchParams.get('loanTypes')
    const employees = searchParams.get('employees')
    const minAmount = searchParams.get('minAmount')
    const maxAmount = searchParams.get('maxAmount')
    
    if (sources) filters.sources = sources.split(',')
    if (loanTypes) filters.loanTypes = loanTypes.split(',')
    if (employees) filters.employees = employees.split(',')
    if (minAmount) filters.minAmount = parseInt(minAmount)
    if (maxAmount) filters.maxAmount = parseInt(maxAmount)

    switch (action) {
      case 'report':
        const report = await LeadAnalyticsService.generateAnalyticsReport(
          startDate,
          endDate,
          Object.keys(filters).length > 0 ? filters : undefined
        )
        
        return NextResponse.json({
          success: true,
          report
        })

      case 'funnel':
        const funnelAnalysis = await LeadAnalyticsService.getLeadFunnelAnalysis(startDate, endDate)
        
        return NextResponse.json({
          success: true,
          funnel: funnelAnalysis
        })

      case 'cohort':
        const months = parseInt(searchParams.get('months') || '6')
        const cohortAnalysis = await LeadAnalyticsService.getLeadCohortAnalysis(months)
        
        return NextResponse.json({
          success: true,
          cohort: cohortAnalysis
        })

      case 'export':
        const exportType = searchParams.get('type') as 'leads' | 'conversions' | 'sources' | 'performance'
        
        if (!exportType || !['leads', 'conversions', 'sources', 'performance'].includes(exportType)) {
          return NextResponse.json(
            { success: false, error: 'Invalid export type' },
            { status: 400 }
          )
        }

        const csvContent = await LeadAnalyticsService.exportAnalyticsToCSV(startDate, endDate, exportType)
        
        return new NextResponse(csvContent, {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="lead_${exportType}_${startDate.toISOString().split('T')[0]}_to_${endDate.toISOString().split('T')[0]}.csv"`
          }
        })

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Error in lead analytics API:', error)
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