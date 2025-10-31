import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth, hasPermission } from '@/lib/auth'
import DataService from '@/lib/dataService'
import smsFreshService from '@/lib/smsFreshService'

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request)
    
    if (!user || !hasPermission(user, 'campaigns:view')) {
      return NextResponse.json(
        { success: false, message: 'Access denied' },
        { status: 403 }
      )
    }

    const campaigns = await DataService.getCampaigns()
    
    return NextResponse.json({
      success: true,
      campaigns
    })
  } catch (error) {
    console.error('Failed to fetch campaigns:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch campaigns' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request)
    
    if (!user || !hasPermission(user, 'campaigns:create')) {
      return NextResponse.json(
        { success: false, message: 'Access denied' },
        { status: 403 }
      )
    }

    const campaignData = await request.json()
    
    campaignData.createdById = user.id
    campaignData.createdBy = user.name
    campaignData.id = `campaign_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    campaignData.createdAt = new Date().toISOString()
    campaignData.updatedAt = new Date().toISOString()
    
    const campaign = await DataService.createCampaign(campaignData)
    
    return NextResponse.json({
      success: true,
      campaign,
      message: 'Campaign created successfully'
    })
  } catch (error) {
    console.error('Failed to create campaign:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to create campaign' },
      { status: 500 }
    )
  }
}