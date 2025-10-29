import { NextRequest, NextResponse } from 'next/server'
import { processContactData } from '../../../../lib/dataProcessor'

export async function POST(request: NextRequest) {
  try {
    const { data, filename, options } = await request.json()
    
    if (!data || !Array.isArray(data)) {
      return NextResponse.json(
        { message: 'Invalid data provided' },
        { status: 400 }
      )
    }

    console.log(`🔍 Validating contact data - ${data.length} rows from ${filename || 'unknown file'}`)

    // Process with enhanced validation
    const results = processContactData(data, filename || 'validation-data')
    
    // Apply options if provided
    if (options?.removeDuplicates && results.duplicates.length > 0) {
      // Remove duplicate entries from success array
      const duplicatePhones = new Set(results.duplicates.map(d => d.phone))
      results.success = results.success.filter(contact => !duplicatePhones.has(contact.phone))
      
      // Update stats
      results.stats.success = results.success.length
      results.stats.duplicates = 0
      results.duplicates = []
    }

    console.log(`✅ Validation completed:`, {
      filename: filename || 'validation-data',
      dataQuality: results.validationReport.dataQuality,
      recommendations: results.validationReport.recommendations.length
    })

    return NextResponse.json({
      message: 'Validation completed',
      results
    })

  } catch (error) {
    console.error('❌ Validation failed:', error)
    return NextResponse.json(
      { 
        message: 'Validation failed', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}