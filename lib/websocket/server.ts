import { WebSocketServer, WebSocket } from 'ws'
import { IncomingMessage } from 'http'
import { parse } from 'url'
import { verifyToken, AuthUser } from '../auth'
import Logger, { DataSource } from '../logger'

export interface WebSocketConnection {
  id: string
  ws: WebSocket
  user: AuthUser
  connectedAt: Date
  lastPing: Date
  subscriptions: Set<string>
}

export interface WebSocketMessage {
  type: string
  data?: any
  timestamp?: string
  id?: string
}

export interface WebSocketEvent {
  type: string
  data: any
  targetUsers?: string[]
  targetRoles?: string[]
  room?: string
}

class WebSocketManager {
  private wss: WebSocketServer | null = null
  private connections: Map<string, WebSocketConnection> = new Map()
  private rooms: Map<string, Set<string>> = new Map()
  private isRunning = false
  private pingInterval: NodeJS.Timeout | null = null

  constructor() {
    this.setupCleanupInterval()
  }

  /**
   * Initialize WebSocket server
   */
  initialize(server: any): void {
    if (this.wss) {
      Logger.warn(DataSource.WEBSOCKET, 'server', 'WebSocket server already initialized')
      return
    }

    this.wss = new WebSocketServer({
      server,
      path: '/ws',
      verifyClient: this.verifyClient.bind(this)
    })

    this.wss.on('connection', this.handleConnection.bind(this))
    this.wss.on('error', this.handleError.bind(this))

    this.isRunning = true
    this.startPingInterval()

    Logger.info(DataSource.WEBSOCKET, 'server', 'WebSocket server initialized')
  }

  /**
   * Verify client connection with authentication
   */
  private async verifyClient(info: { origin: string; secure: boolean; req: IncomingMessage }): Promise<boolean> {
    try {
      const url = parse(info.req.url || '', true)
      const token = url.query.token as string || info.req.headers.authorization?.replace('Bearer ', '')

      if (!token) {
        Logger.warn(DataSource.WEBSOCKET, 'auth', 'Connection rejected: No token provided')
        return false
      }

      const payload = verifyToken(token)
      if (!payload) {
        Logger.warn(DataSource.WEBSOCKET, 'auth', 'Connection rejected: Invalid token')
        return false
      }

      // Store user info for later use in connection handler
      ;(info.req as any).user = payload
      return true
    } catch (error) {
      Logger.error(DataSource.WEBSOCKET, 'auth', 'Connection verification failed', error)
      return false
    }
  }

  /**
   * Handle new WebSocket connection
   */
  private handleConnection(ws: WebSocket, req: IncomingMessage): void {
    const user = (req as any).user
    const connectionId = this.generateConnectionId()

    const connection: WebSocketConnection = {
      id: connectionId,
      ws,
      user,
      connectedAt: new Date(),
      lastPing: new Date(),
      subscriptions: new Set()
    }

    this.connections.set(connectionId, connection)

    Logger.info(DataSource.WEBSOCKET, 'connection', `New connection: ${connectionId} for user ${user.userId}`)

    // Set up message handlers
    ws.on('message', (data) => this.handleMessage(connectionId, data))
    ws.on('close', () => this.handleDisconnection(connectionId))
    ws.on('error', (error) => this.handleConnectionError(connectionId, error))
    ws.on('pong', () => this.handlePong(connectionId))

    // Send welcome message
    this.sendToConnection(connectionId, {
      type: 'CONNECTED',
      data: { connectionId, timestamp: new Date().toISOString() }
    })

    // Auto-subscribe to user-specific events
    this.subscribeToRoom(connectionId, `user:${user.userId}`)
    this.subscribeToRoom(connectionId, `role:${user.role}`)
  }

  /**
   * Handle incoming WebSocket message
   */
  private handleMessage(connectionId: string, data: Buffer): void {
    try {
      const connection = this.connections.get(connectionId)
      if (!connection) return

      const message: WebSocketMessage = JSON.parse(data.toString())
      
      Logger.info(DataSource.WEBSOCKET, 'message', `Received message from ${connectionId}: ${message.type}`)

      switch (message.type) {
        case 'PING':
          this.handlePing(connectionId)
          break
        case 'SUBSCRIBE':
          this.handleSubscribe(connectionId, message.data?.room)
          break
        case 'UNSUBSCRIBE':
          this.handleUnsubscribe(connectionId, message.data?.room)
          break
        case 'TYPING_START':
          this.handleTypingIndicator(connectionId, message.data, true)
          break
        case 'TYPING_STOP':
          this.handleTypingIndicator(connectionId, message.data, false)
          break
        default:
          Logger.warn(DataSource.WEBSOCKET, 'message', `Unknown message type: ${message.type}`)
      }
    } catch (error) {
      Logger.error(DataSource.WEBSOCKET, 'message', `Failed to handle message from ${connectionId}`, error)
    }
  }

  /**
   * Handle connection disconnection
   */
  private handleDisconnection(connectionId: string): void {
    const connection = this.connections.get(connectionId)
    if (!connection) return

    // Remove from all rooms
    connection.subscriptions.forEach(room => {
      this.unsubscribeFromRoom(connectionId, room)
    })

    this.connections.delete(connectionId)
    Logger.info(DataSource.WEBSOCKET, 'connection', `Connection closed: ${connectionId}`)
  }

  /**
   * Handle connection error
   */
  private handleConnectionError(connectionId: string, error: Error): void {
    Logger.error(DataSource.WEBSOCKET, 'connection', `Connection error for ${connectionId}`, error)
    this.handleDisconnection(connectionId)
  }

  /**
   * Handle ping message
   */
  private handlePing(connectionId: string): void {
    const connection = this.connections.get(connectionId)
    if (connection) {
      connection.lastPing = new Date()
      this.sendToConnection(connectionId, { type: 'PONG' })
    }
  }

  /**
   * Handle pong response
   */
  private handlePong(connectionId: string): void {
    const connection = this.connections.get(connectionId)
    if (connection) {
      connection.lastPing = new Date()
    }
  }

  /**
   * Handle room subscription
   */
  private handleSubscribe(connectionId: string, room: string): void {
    if (!room) return
    
    this.subscribeToRoom(connectionId, room)
    this.sendToConnection(connectionId, {
      type: 'SUBSCRIBED',
      data: { room }
    })
  }

  /**
   * Handle room unsubscription
   */
  private handleUnsubscribe(connectionId: string, room: string): void {
    if (!room) return
    
    this.unsubscribeFromRoom(connectionId, room)
    this.sendToConnection(connectionId, {
      type: 'UNSUBSCRIBED',
      data: { room }
    })
  }

  /**
   * Handle typing indicator
   */
  private handleTypingIndicator(connectionId: string, data: any, isTyping: boolean): void {
    const connection = this.connections.get(connectionId)
    if (!connection || !data?.contactId) return

    // Broadcast typing indicator to other users in the same conversation
    this.broadcastToRoom(`contact:${data.contactId}`, {
      type: isTyping ? 'TYPING_START' : 'TYPING_STOP',
      data: {
        contactId: data.contactId,
        userId: connection.user.userId,
        userName: connection.user.name
      }
    }, [connectionId]) // Exclude sender
  }

  /**
   * Subscribe connection to a room
   */
  private subscribeToRoom(connectionId: string, room: string): void {
    const connection = this.connections.get(connectionId)
    if (!connection) return

    if (!this.rooms.has(room)) {
      this.rooms.set(room, new Set())
    }

    this.rooms.get(room)!.add(connectionId)
    connection.subscriptions.add(room)

    Logger.info(DataSource.WEBSOCKET, 'subscription', `Connection ${connectionId} subscribed to room: ${room}`)
  }

  /**
   * Unsubscribe connection from a room
   */
  private unsubscribeFromRoom(connectionId: string, room: string): void {
    const connection = this.connections.get(connectionId)
    if (!connection) return

    const roomConnections = this.rooms.get(room)
    if (roomConnections) {
      roomConnections.delete(connectionId)
      if (roomConnections.size === 0) {
        this.rooms.delete(room)
      }
    }

    connection.subscriptions.delete(room)

    Logger.info(DataSource.WEBSOCKET, 'subscription', `Connection ${connectionId} unsubscribed from room: ${room}`)
  }

  /**
   * Send message to specific connection
   */
  sendToConnection(connectionId: string, message: WebSocketMessage): boolean {
    const connection = this.connections.get(connectionId)
    if (!connection || connection.ws.readyState !== WebSocket.OPEN) {
      return false
    }

    try {
      const messageWithTimestamp = {
        ...message,
        timestamp: message.timestamp || new Date().toISOString()
      }

      connection.ws.send(JSON.stringify(messageWithTimestamp))
      return true
    } catch (error) {
      Logger.error(DataSource.WEBSOCKET, 'send', `Failed to send message to ${connectionId}`, error)
      this.handleDisconnection(connectionId)
      return false
    }
  }

  /**
   * Broadcast message to all connections in a room
   */
  broadcastToRoom(room: string, message: WebSocketMessage, excludeConnections: string[] = []): number {
    const roomConnections = this.rooms.get(room)
    if (!roomConnections) return 0

    let sentCount = 0
    roomConnections.forEach(connectionId => {
      if (!excludeConnections.includes(connectionId)) {
        if (this.sendToConnection(connectionId, message)) {
          sentCount++
        }
      }
    })

    Logger.info(DataSource.WEBSOCKET, 'broadcast', `Broadcasted to room ${room}: ${sentCount} connections`)
    return sentCount
  }

  /**
   * Broadcast to users by ID
   */
  broadcastToUsers(userIds: string[], message: WebSocketMessage): number {
    let sentCount = 0
    userIds.forEach(userId => {
      sentCount += this.broadcastToRoom(`user:${userId}`, message)
    })
    return sentCount
  }

  /**
   * Broadcast to users by role
   */
  broadcastToRole(role: string, message: WebSocketMessage): number {
    return this.broadcastToRoom(`role:${role}`, message)
  }

  /**
   * Broadcast to all connections
   */
  broadcastToAll(message: WebSocketMessage, excludeConnections: string[] = []): number {
    let sentCount = 0
    this.connections.forEach((connection, connectionId) => {
      if (!excludeConnections.includes(connectionId)) {
        if (this.sendToConnection(connectionId, message)) {
          sentCount++
        }
      }
    })

    Logger.info(DataSource.WEBSOCKET, 'broadcast', `Broadcasted to all: ${sentCount} connections`)
    return sentCount
  }

  /**
   * Start ping interval to keep connections alive
   */
  private startPingInterval(): void {
    this.pingInterval = setInterval(() => {
      this.connections.forEach((connection, connectionId) => {
        if (connection.ws.readyState === WebSocket.OPEN) {
          try {
            connection.ws.ping()
          } catch (error) {
            Logger.error(DataSource.WEBSOCKET, 'ping', `Failed to ping ${connectionId}`, error)
            this.handleDisconnection(connectionId)
          }
        } else {
          this.handleDisconnection(connectionId)
        }
      })
    }, 30000) // Ping every 30 seconds
  }

  /**
   * Setup cleanup interval for stale connections
   */
  private setupCleanupInterval(): void {
    setInterval(() => {
      this.cleanupStaleConnections()
    }, 60000) // Cleanup every minute
  }

  /**
   * Clean up stale connections
   */
  private cleanupStaleConnections(): void {
    const now = new Date()
    const staleThreshold = 5 * 60 * 1000 // 5 minutes

    const staleConnections: string[] = []
    this.connections.forEach((connection, connectionId) => {
      if (now.getTime() - connection.lastPing.getTime() > staleThreshold) {
        staleConnections.push(connectionId)
      }
    })

    staleConnections.forEach(connectionId => {
      this.handleDisconnection(connectionId)
    })

    if (staleConnections.length > 0) {
      Logger.info(DataSource.WEBSOCKET, 'cleanup', `Cleaned up ${staleConnections.length} stale connections`)
    }
  }

  /**
   * Generate unique connection ID
   */
  private generateConnectionId(): string {
    return `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Handle server error
   */
  private handleError(error: Error): void {
    Logger.error(DataSource.WEBSOCKET, 'server', 'WebSocket server error', error)
  }

  /**
   * Get connection statistics
   */
  getStats(): {
    isRunning: boolean
    totalConnections: number
    totalRooms: number
    connectionsByRole: Record<string, number>
    roomStats: Array<{ room: string; connections: number }>
  } {
    const connectionsByRole: Record<string, number> = {}
    this.connections.forEach(connection => {
      const role = connection.user.role
      connectionsByRole[role] = (connectionsByRole[role] || 0) + 1
    })

    const roomStats = Array.from(this.rooms.entries()).map(([room, connections]) => ({
      room,
      connections: connections.size
    }))

    return {
      isRunning: this.isRunning,
      totalConnections: this.connections.size,
      totalRooms: this.rooms.size,
      connectionsByRole,
      roomStats
    }
  }

  /**
   * Shutdown WebSocket server
   */
  shutdown(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval)
      this.pingInterval = null
    }

    this.connections.forEach((connection, connectionId) => {
      connection.ws.close()
    })

    if (this.wss) {
      this.wss.close()
      this.wss = null
    }

    this.connections.clear()
    this.rooms.clear()
    this.isRunning = false

    Logger.info(DataSource.WEBSOCKET, 'server', 'WebSocket server shutdown complete')
  }
}

// Export singleton instance
export const webSocketManager = new WebSocketManager()
export default webSocketManager