import { NextRequest, NextResponse } from 'next/server'
import { withAuthAndPermissions } from '@/lib/middleware/auth'
import { PERMISSIONS } from '@/lib/auth'
import { getCampaignExecutor } from '@/lib/campaignExecutor'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuthAndPermissions([PERMISSIONS.CAMPAIGN_EXECUTE])(request, async (req) => {
    try {
      const campaignExecutor = getCampaignExecutor()
      const success = await campaignExecutor.pauseCampaign(params.id)

      if (success) {
        return NextResponse.json({
          success: true,
          message: 'Campaign paused successfully'
        })
      } else {
        return NextResponse.json({
          success: false,
          message: 'Failed to pause campaign'
        }, { status: 400 })
      }
    } catch (error) {
      console.error('Error pausing campaign:', error)
      return NextResponse.json(
        { error: 'Failed to pause campaign' },
        { status: 500 }
      )
    }
  })
}