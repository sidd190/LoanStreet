import { NextRequest, NextResponse } from 'next/server'
import { getAutomationEngine } from '../../../../../lib/automationEngine'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { isActive } = await request.json()
    
    const automationEngine = getAutomationEngine()
    const success = await automationEngine.toggleAutomation(params.id, isActive)

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to toggle automation' },
        { status: 500 }
      )
    }

    console.log(`✅ Successfully ${isActive ? 'activated' : 'deactivated'} automation ${params.id}`)
    return NextResponse.json({ success: true, isActive })
  } catch (error) {
    console.error('❌ Error toggling automation:', error)
    return NextResponse.json(
      { error: 'Failed to toggle automation' },
      { status: 500 }
    )
  }
}