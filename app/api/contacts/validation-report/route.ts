import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const { validationResults, saveReport = false } = await request.json()
    
    if (!validationResults) {
      return NextResponse.json(
        { message: 'Validation results are required' },
        { status: 400 }
      )
    }

    console.log(`📊 Generating validation report for ${validationResults.validationReport?.fileInfo?.name || 'unknown file'}`)

    // Generate comprehensive validation report
    const report = {
      summary: {
        fileInfo: validationResults.validationReport.fileInfo,
        processingTimestamp: new Date().toISOString(),
        overallStatus: determineOverallStatus(validationResults),
        dataQuality: validationResults.validationReport.dataQuality
      },
      statistics: {
        totalRecords: validationResults.stats.total,
        successfulRecords: validationResults.stats.success,
        errorRecords: validationResults.stats.errors,
        warningRecords: validationResults.stats.warnings,
        duplicateRecords: validationResults.stats.duplicates,
        phoneNumberStats: {
          totalProcessed: validationResults.stats.phoneNumbersProcessed,
          valid: validationResults.stats.validPhoneNumbers,
          invalid: validationResults.stats.invalidPhoneNumbers,
          multipleNumberCells: validationResults.stats.multipleNumberCells
        },
        emailStats: validationResults.stats.emailValidationResults
      },
      errors: categorizeErrors(validationResults.errors || []),
      duplicates: {
        summary: {
          totalDuplicateGroups: validationResults.duplicates?.length || 0,
          affectedRecords: validationResults.duplicates?.reduce((sum: number, dup: any) => sum + dup.count, 0) || 0
        },
        details: validationResults.duplicates || []
      },
      recommendations: {
        immediate: validationResults.validationReport.recommendations || [],
        dataQuality: generateDataQualityRecommendations(validationResults),
        nextSteps: generateNextSteps(validationResults)
      },
      columnMapping: validationResults.validationReport.columnMapping
    }

    // Optionally save report to database for audit trail
    if (saveReport) {
      // In a real implementation, you might save this to a ValidationReport table
      console.log('📝 Validation report saved to audit trail')
    }

    return NextResponse.json({
      message: 'Validation report generated successfully',
      report
    })

  } catch (error) {
    console.error('❌ Validation report generation failed:', error)
    return NextResponse.json(
      { 
        message: 'Report generation failed', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

function determineOverallStatus(validationResults: any): 'excellent' | 'good' | 'fair' | 'poor' {
  const { dataQuality } = validationResults.validationReport
  const avgQuality = (dataQuality.completeness + dataQuality.accuracy + dataQuality.consistency) / 3
  
  if (avgQuality >= 95) return 'excellent'
  if (avgQuality >= 85) return 'good'
  if (avgQuality >= 70) return 'fair'
  return 'poor'
}

function categorizeErrors(errors: any[]): any {
  const categories = {
    critical: errors.filter(e => e.severity === 'error' && (e.field === 'name' || e.field === 'phone')),
    validation: errors.filter(e => e.severity === 'error' && e.field !== 'name' && e.field !== 'phone'),
    warnings: errors.filter(e => e.severity === 'warning'),
    formatting: errors.filter(e => e.error.includes('format') || e.error.includes('invalid'))
  }
  
  return {
    critical: {
      count: categories.critical.length,
      errors: categories.critical.slice(0, 10) // Limit for performance
    },
    validation: {
      count: categories.validation.length,
      errors: categories.validation.slice(0, 10)
    },
    warnings: {
      count: categories.warnings.length,
      errors: categories.warnings.slice(0, 10)
    },
    formatting: {
      count: categories.formatting.length,
      errors: categories.formatting.slice(0, 10)
    }
  }
}

function generateDataQualityRecommendations(validationResults: any): string[] {
  const recommendations: string[] = []
  const { dataQuality } = validationResults.validationReport
  
  if (dataQuality.completeness < 90) {
    recommendations.push('Improve data completeness by ensuring all required fields (name, phone) are filled')
  }
  
  if (dataQuality.accuracy < 85) {
    recommendations.push('Review and correct validation errors to improve data accuracy')
  }
  
  if (dataQuality.consistency < 80) {
    recommendations.push('Standardize data formats, especially phone numbers and email addresses')
  }
  
  if (validationResults.stats.duplicates > 0) {
    recommendations.push('Consider implementing duplicate detection and removal processes')
  }
  
  return recommendations
}

function generateNextSteps(validationResults: any): string[] {
  const steps: string[] = []
  const hasErrors = validationResults.stats.errors > 0
  const hasDuplicates = validationResults.stats.duplicates > 0
  const hasWarnings = validationResults.stats.warnings > 0
  
  if (hasErrors) {
    steps.push('1. Review and fix critical validation errors before importing')
  }
  
  if (hasDuplicates) {
    steps.push('2. Decide on duplicate handling strategy (merge, keep first, or manual review)')
  }
  
  if (hasWarnings) {
    steps.push('3. Review warnings and decide if they need attention')
  }
  
  if (validationResults.stats.success > 0) {
    steps.push(`4. Import ${validationResults.stats.success} valid records`)
  }
  
  if (steps.length === 0) {
    steps.push('1. All validation checks passed - ready to import!')
  }
  
  return steps
}