import { NextRequest, NextResponse } from 'next/server'
import { getAutomationService } from '../../../../../lib/automationService'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const automationService = getAutomationService()
    const success = await automationService.executeAutomation(params.id)

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to run automation' },
        { status: 500 }
      )
    }

    console.log(`✅ Successfully executed automation ${params.id}`)
    return NextResponse.json({ 
      success: true, 
      message: 'Automation executed successfully'
    })
  } catch (error) {
    console.error('❌ Error running automation:', error)
    return NextResponse.json(
      { error: 'Failed to run automation' },
      { status: 500 }
    )
  }
}