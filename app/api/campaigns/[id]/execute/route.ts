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
      const result = await campaignExecutor.executeCampaign(params.id, req.user!.id)

      if (result.success) {
        return NextResponse.json({
          success: true,
          totalProcessed: result.totalProcessed,
          successCount: result.successCount,
          failureCount: result.failureCount,
          message: `Campaign executed successfully. ${result.successCount} messages sent, ${result.failureCount} failed.`
        })
      } else {
        return NextResponse.json({
          success: false,
          totalProcessed: result.totalProcessed,
          successCount: result.successCount,
          failureCount: result.failureCount,
          errors: result.errors,
          message: `Campaign execution completed with errors. ${result.successCount} messages sent, ${result.failureCount} failed.`
        }, { status: 207 }) // 207 Multi-Status for partial success
      }
    } catch (error) {
      console.error('Error executing campaign:', error)
      return NextResponse.json(
        { error: 'Failed to execute campaign' },
        { status: 500 }
      )
    }
  })
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuthAndPermissions([PERMISSIONS.CAMPAIGN_READ])(request, async (req) => {
    try {
      const campaignExecutor = getCampaignExecutor()
      const status = await campaignExecutor.getCampaignStatus(params.id)

      return NextResponse.json(status)
    } catch (error) {
      console.error('Error getting campaign status:', error)
      return NextResponse.json(
        { error: 'Failed to get campaign status' },
        { status: 500 }
      )
    }
  })
}