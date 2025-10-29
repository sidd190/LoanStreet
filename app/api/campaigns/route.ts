import { NextRequest, NextResponse } from 'next/server'
import { withAuthAndRole } from '@/lib/middleware/auth'
import DataService from '@/lib/dataService'

// GET /api/campaigns - Admin only
export async function GET(request: NextRequest) {
  return withAuthAndRole(['ADMIN'])(request, async (req) => {
    try {
      const campaigns = await DataService.getCampaigns()
      
      return NextResponse.json({
        success: true,
        campaigns
      })
    } catch (error) {
      console.error('Campaigns fetch error:', error)
      return NextResponse.json(
        { success: false, message: 'Failed to fetch campaigns' },
        { status: 500 }
      )
    }
  })
}

// POST /api/campaigns - Admin only
export async function POST(request: NextRequest) {
  return withAuthAndRole(['ADMIN'])(request, async (req) => {
    try {
      const campaignData = await req.json()
      
      // Add created by information
      campaignData.createdById = req.user!.id
      campaignData.createdBy = req.user!.name
      
      const campaign = await DataService.createCampaign(campaignData)
      
      return NextResponse.json({
        success: true,
        campaign,
        message: 'Campaign created successfully'
      })
    } catch (error) {
      console.error('Campaign creation error:', error)
      return NextResponse.json(
        { success: false, message: 'Failed to create campaign' },
        { status: 500 }
      )
    }
  })
}