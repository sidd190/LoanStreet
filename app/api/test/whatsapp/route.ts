import { NextRequest, NextResponse } from 'next/server'
import smsFreshService from '@/lib/smsFreshService'
import Logger, { DataSource } from '@/lib/logger'

export async function GET(request: NextRequest) {
  try {
    Logger.info(DataSource.API, 'test_whatsapp', 'Testing WhatsApp API configuration')

    // Test the SMSFresh service connection
    const connectionTest = await smsFreshService.testConnection()
    
    // Get service status
    const status = smsFreshService.getStatus()
    
    // Get available templates
    const templates = await smsFreshService.getTemplates()

    const response = {
      status: connectionTest.success ? 'ready' : 'error',
      message: connectionTest.message,
      configuration: {
        configured: status.configured,
        baseUrl: status.baseUrl,
        user: status.user,
        sender: status.sender
      },
      templates: {
        count: templates.length,
        available: templates.map(t => ({
          name: t.name,
          category: t.category,
          status: t.status
        }))
      },
      connectionTest: connectionTest.details
    }

    if (connectionTest.success) {
      Logger.success(DataSource.API, 'test_whatsapp', 'WhatsApp API test completed successfully')
    } else {
      Logger.warn(DataSource.API, 'test_whatsapp', 'WhatsApp API test failed', connectionTest)
    }

    return NextResponse.json(response)

  } catch (error) {
    Logger.error(DataSource.API, 'test_whatsapp', 'WhatsApp API test failed', error)
    
    return NextResponse.json({
      status: 'error',
      message: 'Failed to test WhatsApp API',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { phone, message, templateName, params } = body

    if (!phone || (!message && !templateName)) {
      return NextResponse.json({
        success: false,
        error: 'Phone number and message/template are required'
      }, { status: 400 })
    }

    Logger.info(DataSource.API, 'test_whatsapp', `Sending test WhatsApp message to ${phone}`)

    let result
    if (templateName) {
      result = await smsFreshService.sendTemplateMessage(phone, templateName, params)
    } else {
      result = await smsFreshService.sendTextMessage(phone, message)
    }

    if (result.success) {
      Logger.success(DataSource.API, 'test_whatsapp', `Test WhatsApp message sent successfully to ${phone}`)
    } else {
      Logger.error(DataSource.API, 'test_whatsapp', `Test WhatsApp message failed for ${phone}`, result.error)
    }

    return NextResponse.json(result)

  } catch (error) {
    Logger.error(DataSource.API, 'test_whatsapp', 'Test WhatsApp message sending failed', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}