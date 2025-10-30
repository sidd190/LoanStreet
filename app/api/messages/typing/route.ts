import { NextRequest, NextResponse } from 'next/server'
import { withAuthAndRole } from '@/lib/middleware/auth'
import { broadcastTypingIndicator } from '@/lib/realTimeMessaging'

export async function POST(request: NextRequest) {
  return withAuthAndRole(['ADMIN', 'EMPLOYEE'])(request, async (req) => {
    try {
      const { contactId, isTyping } = await req.json()
      
      if (!contactId) {
        return NextResponse.json(
          { success: false, message: 'Contact ID is required' },
          { status: 400 }
        )
      }

      // Broadcast typing indicator to other subscribers
      broadcastTypingIndicator(contactId, isTyping, req.user!.id)

      return NextResponse.json({
        success: true,
        message: 'Typing indicator sent'
      })
    } catch (error) {
      console.error('Typing indicator error:', error)
      return NextResponse.json(
        { success: false, message: 'Failed to send typing indicator' },
        { status: 500 }
      )
    }
  })
}