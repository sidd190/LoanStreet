import { NextRequest, NextResponse } from 'next/server'
import { executeAutomatedCampaign, CampaignAutomationConfig } from '../../../../../lib/campaignExecutor'
import { logger } from '../../../../../lib/logger'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { userId, automationConfig } = body

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    logger.info(`Starting automated campaign execution: ${params.id}`)

    const config: CampaignAutomationConfig = {
      markProcessedContacts: automationConfig?.markProcessedContacts ?? true,
      autoProgressToNextDataSet: automationConfig?.autoProgressToNextDataSet ?? true,
      generatePerformanceReport: automationConfig?.generatePerformanceReport ?? true,
      triggerFollowUpCampaigns: automationConfig?.triggerFollowUpCampaigns ?? false,
      leadScoringUpdate: automationConfig?.leadScoringUpdate ?? true
    }

    const result = await executeAutomatedCampaign(params.id, userId, config)

    if (result.success) {
      logger.info(`Automated campaign execution completed successfully: ${params.id}`)
      return NextResponse.json({
        success: true,
        message: 'Automated campaign executed successfully',
        result
      })
    } else {
      logger.error(`Automated campaign execution failed: ${params.id}`, result.errors)
      return NextResponse.json(
        { 
          error: 'Campaign execution failed', 
          details: result.errors 
        },
        { status: 500 }
      )
    }
  } catch (error) {
    logger.error(`Error in automated campaign execution API: ${params.id}`, error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}