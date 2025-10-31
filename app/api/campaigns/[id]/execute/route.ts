import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth'
import DataService from '@/lib/dataService'
import smsFreshService from '@/lib/smsFreshService'
import Logger, { DataSource } from '@/lib/logger'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const campaignId = params.id
    Logger.info(DataSource.API, 'campaign_execute', `Executing campaign: ${campaignId}`)

    // Get campaign details
    const campaign = await DataService.getCampaign(campaignId)
    if (!campaign) {
      return NextResponse.json(
        { success: false, message: 'Campaign not found' },
        { status: 404 }
      )
    }

    // Check if campaign is in a valid state for execution
    if (campaign.status !== 'DRAFT' && campaign.status !== 'SCHEDULED') {
      return NextResponse.json(
        { success: false, message: 'Campaign cannot be executed in current state' },
        { status: 400 }
      )
    }

    // Get contacts for the campaign
    const contacts = await DataService.getContacts()
    
    // Filter contacts based on campaign criteria (if any)
    let targetContacts = contacts.filter(contact => contact.status === 'ACTIVE')
    
    if (targetContacts.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No active contacts found for campaign' },
        { status: 400 }
      )
    }

    Logger.info(DataSource.API, 'campaign_execute', `Sending to ${targetContacts.length} contacts`)

    // Update campaign status to RUNNING
    await DataService.updateCampaign(campaignId, {
      status: 'RUNNING',
      sentAt: new Date().toISOString(),
      totalContacts: targetContacts.length
    })

    // Prepare messages for bulk sending
    const messages = targetContacts.map(contact => ({
      phone: contact.phone,
      text: campaign.message,
      templateName: campaign.templateName,
      params: campaign.templateParams ? [contact.name, ...campaign.templateParams] : [contact.name]
    }))

    // Send messages in batches
    let totalSent = 0
    let totalFailed = 0
    const batchSize = 50 // Send in batches of 50

    for (let i = 0; i < messages.length; i += batchSize) {
      const batch = messages.slice(i, i + batchSize)
      
      Logger.info(DataSource.API, 'campaign_execute', `Sending batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(messages.length/batchSize)}`)
      
      const results = await smsFreshService.sendBulkMessages(batch)
      
      const batchSent = results.filter(r => r.success).length
      const batchFailed = results.filter(r => !r.success).length
      
      totalSent += batchSent
      totalFailed += batchFailed
      
      // Add delay between batches
      if (i + batchSize < messages.length) {
        await new Promise(resolve => setTimeout(resolve, 2000)) // 2 second delay
      }
    }

    // Update campaign with final results
    const finalStatus = totalFailed === 0 ? 'COMPLETED' : 'COMPLETED'
    await DataService.updateCampaign(campaignId, {
      status: finalStatus,
      totalSent,
      totalDelivered: totalSent, // Assume delivered for now
      totalFailed,
      completedAt: new Date().toISOString()
    })

    Logger.success(DataSource.API, 'campaign_execute', `Campaign executed: ${totalSent} sent, ${totalFailed} failed`)

    return NextResponse.json({
      success: true,
      message: 'Campaign executed successfully',
      results: {
        totalContacts: targetContacts.length,
        totalSent,
        totalFailed,
        successRate: Math.round((totalSent / targetContacts.length) * 100)
      }
    })

  } catch (error) {
    Logger.error(DataSource.API, 'campaign_execute', 'Campaign execution failed', error)
    
    // Update campaign status to failed
    try {
      await DataService.updateCampaign(params.id, {
        status: 'CANCELLED',
        failureReason: error instanceof Error ? error.message : 'Unknown error'
      })
    } catch (updateError) {
      Logger.error(DataSource.API, 'campaign_execute', 'Failed to update campaign status', updateError)
    }
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Campaign execution failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}