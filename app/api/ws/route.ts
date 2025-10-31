import { NextRequest } from 'next/server'
import { webSocketManager } from '../../../lib/websocket/server'

// This endpoint provides WebSocket server statistics and health check
export async function GET(request: NextRequest) {
  try {
    const stats = webSocketManager.getStats()
    
    return Response.json({
      success: true,
      data: {
        ...stats,
        endpoint: '/ws',
        protocol: 'WebSocket',
        timestamp: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('WebSocket stats error:', error)
    return Response.json(
      { success: false, message: 'Failed to get WebSocket stats' },
      { status: 500 }
    )
  }
}

// WebSocket connections are handled by the WebSocket server directly
// This endpoint is for HTTP requests only
export async function POST(request: NextRequest) {
  return Response.json(
    { 
      success: false, 
      message: 'WebSocket connections should use ws:// or wss:// protocol',
      endpoint: '/ws'
    },
    { status: 400 }
  )
}