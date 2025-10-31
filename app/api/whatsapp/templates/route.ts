import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth'
import smsFreshService from '@/lib/smsFreshService'
import Logger, { DataSource } from '@/lib/logger'

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request)
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, message: authResult.error },
        { status: 401 }
      )
    }

    Logger.info(DataSource.API, 'whatsapp_templates', 'Fetching WhatsApp templates')

    // Get templates from SMSFresh service
    const templates = await smsFreshService.getTemplates()

    Logger.success(DataSource.API, 'whatsapp_templates', `Retrieved ${templates.length} WhatsApp templates`)

    return NextResponse.json({
      success: true,
      templates,
      count: templates.length
    })

  } catch (error) {
    Logger.error(DataSource.API, 'whatsapp_templates', 'Failed to fetch WhatsApp templates', error)
    
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch WhatsApp templates',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}