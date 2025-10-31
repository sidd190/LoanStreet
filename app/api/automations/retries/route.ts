import { NextRequest, NextResponse } from 'next/server'
import { getAutomationRetryManager } from '../../../../lib/automationRetryManager'

export async function GET(request: NextRequest) {
  try {
    const retryManager = getAutomationRetryManager()
    
    const pendingRetries = retryManager.getPendingRetries()
    const stats = retryManager.getRetryStats()

    return NextResponse.json({
      success: true,
      pendingRetries,
      stats
    })
  } catch (error) {
    console.error('❌ Error fetching retries:', error)
    return NextResponse.json(
      { error: 'Failed to fetch retries' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { retryId } = await request.json()
    
    if (!retryId) {
      return NextResponse.json(
        { error: 'retryId is required' },
        { status: 400 }
      )
    }

    const retryManager = getAutomationRetryManager()
    const cancelled = await retryManager.cancelRetry(retryId)

    if (!cancelled) {
      return NextResponse.json(
        { error: 'Retry not found or already executed' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Retry cancelled successfully'
    })
  } catch (error) {
    console.error('❌ Error cancelling retry:', error)
    return NextResponse.json(
      { error: 'Failed to cancel retry' },
      { status: 500 }
    )
  }
}