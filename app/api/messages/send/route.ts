import { NextRequest, NextResponse } from 'next/server'
import { withAuthAndRole } from '@/lib/middleware/auth'
import DataService from '@/lib/dataService'
import { broadcastMessageReceived, broadcastMessageStatusUpdate } from '@/lib/realTimeMessaging'

// POST /api/messages/send - Both admin and employee can send messages
export async function POST(request: NextRequest) {
  return withAuthAndRole(['ADMIN', 'EMPLOYEE'])(request, async (req) => {
    try {
      const messageData = await req.json()
      
      // Add sender information
      messageData.sentById = req.user!.id
      messageData.sentBy = req.user!.name
      messageData.sentAt = new Date().toISOString()
      
      // Validate required fields
      if (!messageData.content || !messageData.contactPhone) {
        return NextResponse.json(
          { success: false, message: 'Content and contact phone are required' },
          { status: 400 }
        )
      }
      
      // Set default values
      messageData.direction = 'OUTBOUND'
      messageData.status = 'SENT'
      messageData.type = messageData.type || 'WHATSAPP'
      
      const message = await DataService.sendMessage(messageData)
      
      // Broadcast message to real-time subscribers
      try {
        const contactId = messageData.contactPhone // Using phone as contactId for now
        broadcastMessageReceived(contactId, message)
        
        // Simulate status updates for demo purposes
        setTimeout(() => {
          broadcastMessageStatusUpdate(contactId, message.id, 'DELIVERED')
        }, 2000)
        
        setTimeout(() => {
          broadcastMessageStatusUpdate(contactId, message.id, 'READ')
        }, 5000)
      } catch (broadcastError) {
        console.error('Failed to broadcast message:', broadcastError)
      }
      
      // Log employee action if user is employee
      if (req.user!.role === 'EMPLOYEE') {
        try {
          await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/employee/log-action`, {
            method: 'POST',
            headers: {
              'Authorization': req.headers.get('authorization') || '',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              action: 'send_message',
              details: {
                messageId: message.id,
                contactPhone: messageData.contactPhone,
                messageType: messageData.type,
                contentLength: messageData.content.length
              }
            })
          })
        } catch (logError) {
          console.error('Failed to log employee action:', logError)
        }
      }
      
      return NextResponse.json({
        success: true,
        message,
        message: 'Message sent successfully'
      })
    } catch (error) {
      console.error('Message send error:', error)
      return NextResponse.json(
        { success: false, message: 'Failed to send message' },
        { status: 500 }
      )
    }
  })
}