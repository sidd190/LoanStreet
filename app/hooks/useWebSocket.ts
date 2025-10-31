import { useEffect, useRef, useState, useCallback } from 'react'
import { useAuth } from './useAuth'

export interface WebSocketMessage {
  type: string
  data?: any
  timestamp?: string
  id?: string
}

export interface WebSocketHookOptions {
  autoConnect?: boolean
  reconnectInterval?: number
  maxReconnectAttempts?: number
  onMessage?: (message: WebSocketMessage) => void
  onConnect?: () => void
  onDisconnect?: () => void
  onError?: (error: Event) => void
}

export interface WebSocketHookReturn {
  isConnected: boolean
  isConnecting: boolean
  connectionError: string | null
  send: (message: WebSocketMessage) => void
  subscribe: (room: string) => void
  unsubscribe: (room: string) => void
  connect: () => void
  disconnect: () => void
  lastMessage: WebSocketMessage | null
  connectionStats: {
    connectedAt: Date | null
    reconnectAttempts: number
    lastPing: Date | null
  }
}

export function useWebSocket(options: WebSocketHookOptions = {}): WebSocketHookReturn {
  const {
    autoConnect = true,
    reconnectInterval = 3000,
    maxReconnectAttempts = 5,
    onMessage,
    onConnect,
    onDisconnect,
    onError
  } = options

  const { user, token } = useAuth()
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null)
  const [reconnectAttempts, setReconnectAttempts] = useState(0)
  const [connectedAt, setConnectedAt] = useState<Date | null>(null)
  const [lastPing, setLastPing] = useState<Date | null>(null)

  const getWebSocketUrl = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host
    return `${protocol}//${host}/ws?token=${encodeURIComponent(token || '')}`
  }, [token])

  const cleanup = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current)
      pingIntervalRef.current = null
    }
  }, [])

  const startPingInterval = useCallback(() => {
    pingIntervalRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'PING' }))
        setLastPing(new Date())
      }
    }, 30000) // Ping every 30 seconds
  }, [])

  const connect = useCallback(() => {
    if (!token || !user) {
      setConnectionError('Authentication required')
      return
    }

    if (wsRef.current?.readyState === WebSocket.CONNECTING) {
      return // Already connecting
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return // Already connected
    }

    setIsConnecting(true)
    setConnectionError(null)

    try {
      const ws = new WebSocket(getWebSocketUrl())
      wsRef.current = ws

      ws.onopen = () => {
        setIsConnected(true)
        setIsConnecting(false)
        setConnectionError(null)
        setReconnectAttempts(0)
        setConnectedAt(new Date())
        startPingInterval()
        onConnect?.()
      }

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data)
          setLastMessage(message)
          
          // Handle system messages
          if (message.type === 'PONG') {
            setLastPing(new Date())
            return
          }
          
          onMessage?.(message)
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error)
        }
      }

      ws.onclose = (event) => {
        setIsConnected(false)
        setIsConnecting(false)
        setConnectedAt(null)
        cleanup()
        
        onDisconnect?.()

        // Attempt reconnection if not manually closed
        if (event.code !== 1000 && reconnectAttempts < maxReconnectAttempts) {
          setReconnectAttempts(prev => prev + 1)
          reconnectTimeoutRef.current = setTimeout(() => {
            connect()
          }, reconnectInterval * Math.pow(2, reconnectAttempts)) // Exponential backoff
        } else if (reconnectAttempts >= maxReconnectAttempts) {
          setConnectionError('Max reconnection attempts reached')
        }
      }

      ws.onerror = (error) => {
        setConnectionError('WebSocket connection error')
        setIsConnecting(false)
        onError?.(error)
      }

    } catch (error) {
      setIsConnecting(false)
      setConnectionError('Failed to create WebSocket connection')
      console.error('WebSocket connection error:', error)
    }
  }, [token, user, getWebSocketUrl, onConnect, onMessage, onDisconnect, onError, reconnectAttempts, maxReconnectAttempts, reconnectInterval, startPingInterval, cleanup])

  const disconnect = useCallback(() => {
    cleanup()
    if (wsRef.current) {
      wsRef.current.close(1000, 'Manual disconnect')
      wsRef.current = null
    }
    setIsConnected(false)
    setIsConnecting(false)
    setConnectedAt(null)
    setReconnectAttempts(0)
  }, [cleanup])

  const send = useCallback((message: WebSocketMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      try {
        const messageWithTimestamp = {
          ...message,
          timestamp: message.timestamp || new Date().toISOString()
        }
        wsRef.current.send(JSON.stringify(messageWithTimestamp))
      } catch (error) {
        console.error('Failed to send WebSocket message:', error)
        setConnectionError('Failed to send message')
      }
    } else {
      console.warn('WebSocket is not connected')
      setConnectionError('WebSocket is not connected')
    }
  }, [])

  const subscribe = useCallback((room: string) => {
    send({
      type: 'SUBSCRIBE',
      data: { room }
    })
  }, [send])

  const unsubscribe = useCallback((room: string) => {
    send({
      type: 'UNSUBSCRIBE',
      data: { room }
    })
  }, [send])

  // Auto-connect when component mounts and user is authenticated
  useEffect(() => {
    if (autoConnect && token && user) {
      connect()
    }

    return () => {
      disconnect()
    }
  }, [autoConnect, token, user, connect, disconnect])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup()
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [cleanup])

  return {
    isConnected,
    isConnecting,
    connectionError,
    send,
    subscribe,
    unsubscribe,
    connect,
    disconnect,
    lastMessage,
    connectionStats: {
      connectedAt,
      reconnectAttempts,
      lastPing
    }
  }
}

// Hook for specific event types
export function useWebSocketEvent<T = any>(
  eventType: string,
  handler: (data: T) => void,
  options: WebSocketHookOptions = {}
) {
  const { lastMessage, ...webSocket } = useWebSocket({
    ...options,
    onMessage: (message) => {
      if (message.type === eventType) {
        handler(message.data)
      }
      options.onMessage?.(message)
    }
  })

  return webSocket
}

// Hook for notifications
export function useWebSocketNotifications(
  onNotification: (notification: any) => void,
  options: WebSocketHookOptions = {}
) {
  return useWebSocketEvent('NOTIFICATION', onNotification, options)
}

// Hook for real-time stats
export function useWebSocketStats(
  onStatsUpdate: (stats: any) => void,
  options: WebSocketHookOptions = {}
) {
  return useWebSocketEvent('STATS_UPDATE', onStatsUpdate, options)
}

// Hook for message events
export function useWebSocketMessages(
  onMessageEvent: (event: any) => void,
  options: WebSocketHookOptions = {}
) {
  const webSocket = useWebSocket({
    ...options,
    onMessage: (message) => {
      if (message.type.startsWith('MESSAGE_')) {
        onMessageEvent(message.data)
      }
      options.onMessage?.(message)
    }
  })

  return webSocket
}