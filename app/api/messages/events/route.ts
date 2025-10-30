import { NextRequest } from 'next/server'
import { withAuthAndRole } from '@/lib/middleware/auth'
import { addConnection, removeConnection } from '@/lib/realTimeMessaging'

export async function GET(request: NextRequest) {
  return withAuthAndRole(['ADMIN', 'EMPLOYEE'])(request, async (req) => {
    const { searchParams } = new URL(req.url)
    const contactId = searchParams.get('contactId')
    
    if (!contactId) {
      return new Response('Contact ID required', { status: 400 })
    }

    const connectionId = `${req.user!.id}-${Date.now()}`
    
    const stream = new ReadableStream({
      start(controller) {
        // Add connection to service
        addConnection(connectionId, controller, contactId, req.user!.id)
        
        // Send initial connection message
        controller.enqueue(`data: ${JSON.stringify({
          type: 'connected',
          connectionId,
          contactId,
          timestamp: new Date().toISOString()
        })}\n\n`)
        
        // Keep connection alive with periodic pings
        const pingInterval = setInterval(() => {
          try {
            controller.enqueue(`data: ${JSON.stringify({
              type: 'ping',
              timestamp: new Date().toISOString()
            })}\n\n`)
          } catch (error) {
            clearInterval(pingInterval)
            cleanup()
          }
        }, 30000)
        
        const cleanup = () => {
          clearInterval(pingInterval)
          removeConnection(connectionId)
        }
        
        // Cleanup on close
        req.signal?.addEventListener('abort', cleanup)
      },
      
      cancel() {
        // Connection closed by client
        removeConnection(connectionId)
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      }
    })
  })
}

