import { NextRequest, NextResponse } from 'next/server'
import { createSMSFreshService } from '@/lib/smsFreshService'

export async function POST(request: NextRequest) {
  try {
    const { phone, message } = await request.json()
    
    if (!phone || !message) {
      return NextResponse.json(
        { success: false, error: 'Phone and message are required' },
        { status: 400 }
      )
    }

    // Check if SMSFresh is configured
    const apiKey = process.env.SMSFRESH_API_KEY
    const apiUrl = process.env.SMSFRESH_API_URL
    
    if (!apiKey || !apiUrl) {
      return NextResponse.json({
        success: false,
        error: 'SMSFresh API not configured',
        configured: false,
        message: 'Please set SMSFRESH_API_KEY and SMSFRESH_API_URL environment variables'
      })
    }

    try {
      const smsFreshService = createSMSFreshService()
      
      // Test sending a WhatsApp message
      const result = await smsFreshService.sendWhatsAppText({
        phone: [phone],
        templateName: 'test_template',
        parameters: [message]
      })

      return NextResponse.json({
        success: result.success,
        configured: true,
        result,
        message: result.success ? 'WhatsApp API is working' : 'WhatsApp API failed'
      })
    } catch (apiError) {
      return NextResponse.json({
        success: false,
        configured: true,
        error: 'API call failed',
        details: apiError instanceof Error ? apiError.message : 'Unknown error',
        message: 'SMSFresh API is configured but the test call failed'
      })
    }
  } catch (error) {
    console.error('WhatsApp test error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  const apiKey = process.env.SMSFRESH_API_KEY
  const apiUrl = process.env.SMSFRESH_API_URL
  const webhookSecret = process.env.SMSFRESH_WEBHOOK_SECRET
  
  return NextResponse.json({
    configured: {
      apiKey: !!apiKey,
      apiUrl: !!apiUrl,
      webhookSecret: !!webhookSecret
    },
    status: (apiKey && apiUrl) ? 'ready' : 'needs_configuration',
    message: (apiKey && apiUrl) 
      ? 'SMSFresh API is configured and ready to use'
      : 'SMSFresh API needs configuration. Please set environment variables.'
  })
}