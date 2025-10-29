import { NextRequest, NextResponse } from 'next/server'
import { processFileUpload, processContactData } from '../../../../lib/dataProcessor'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json(
        { message: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file type
    const allowedTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
    const allowedExtensions = ['.csv', '.xls', '.xlsx']
    
    const fileExtension = '.' + file.name.toLowerCase().split('.').pop()
    
    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
      return NextResponse.json(
        { message: 'Invalid file type. Please upload CSV or XLSX files only.' },
        { status: 400 }
      )
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { message: 'File size too large. Maximum size is 10MB.' },
        { status: 400 }
      )
    }

    console.log(`📁 Processing file upload: ${file.name} (${file.size} bytes)`)

    // Process the file
    const rawData = await processFileUpload(file)
    const results = processContactData(rawData, file.name)
    
    // Update file info in validation report
    results.validationReport.fileInfo.size = file.size
    results.validationReport.fileInfo.type = file.type || file.name.split('.').pop() || 'unknown'

    console.log(`✅ File processed successfully:`, {
      filename: file.name,
      totalRows: results.stats.total,
      successRows: results.stats.success,
      errorRows: results.stats.errors,
      warnings: results.stats.warnings,
      duplicates: results.stats.duplicates,
      dataQuality: results.validationReport.dataQuality
    })

    return NextResponse.json({
      message: 'File processed successfully',
      filename: file.name,
      results: {
        success: results.success,
        errors: results.errors,
        stats: results.stats,
        validationReport: results.validationReport
      }
    })

  } catch (error) {
    console.error('❌ File upload processing failed:', error)
    return NextResponse.json(
      { 
        message: 'File processing failed', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

// File upload handling is built into Next.js 13+ App Router