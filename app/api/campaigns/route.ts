import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth'
import DataService from '@/lib/dataService'
import smsFreshService from '@/lib/smsFreshService'
import Logger, { DataSource } from '@/lib/logger'

// GET /api/campaigns - Admin only
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

    // Check admin role
    if (authResult.user!.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Admin access required' },
        { status: 403 }
      )
    }

    Logger.info(DataSource.API, 'campaigns', 'Fetching campaigns')
    
    const campaigns = await DataService.getCampaigns()
    
    Logger.success(DataSource.API, 'campaigns', `Retrieved ${campaigns.length} campaigns`)
    
    return NextResponse.json({
      success: true,
      campaigns
    })
  } catch (error) {
    Logger.error(DataSource.API, 'campaigns', 'Failed to fetch campaigns', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch campaigns' },
      { status: 500 }
    )
  }
}

// POST /api/campaigns - Admin only
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request)
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, message: authResult.error },
        { status: 401 }
      )
    }

    // Check admin role
    if (authResult.user!.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Admin access required' },
        { status: 403 }
      )
    }

    const user = authResult.user!
    const campaignData = await request.json()
    
    Logger.info(DataSource.API, 'campaigns', `Creating campaign: ${campaignData.name}`)
    
    // Add created by information
    campaignData.createdById = user.id
    campaignData.createdBy = user.name
    campaignData.id = `campaign_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    campaignData.createdAt = new Date().toISOString()
    campaignData.updatedAt = new Date().toISOString()
    
    // If it's a WhatsApp campaign, validate template
    if (campaignData.type === 'WHATSAPP' && campaignData.templateName) {
      const templates = await smsFreshService.getTemplates()
      const template = templates.find(t => t.name === campaignData.templateName)
      
      if (!template) {
        return NextResponse.json(
          { success: false, message: `WhatsApp template '${campaignData.templateName}' not found` },
          { status: 400 }
        )
      }
      
      if (template.status !== 'APPROVED') {
        return NextResponse.json(
          { success: false, message: `WhatsApp template '${campaignData.templateName}' is not approved` },
          { status: 400 }
        )
      }
    }
    
    const campaign = await DataService.createCampaign(campaignData)
    
    Logger.success(DataSource.API, 'campaigns', `Campaign created successfully: ${campaign.id}`)
    
    return NextResponse.json({
      success: true,
      campaign,
      message: 'Campaign created successfully'
    })
  } catch (error) {
    Logger.error(DataSource.API, 'campaigns', 'Failed to create campaign', error)
    return NextResponse.json(
      { success: false, message: 'Failed to create campaign' },
      { status: 500 }
    )
  }
}