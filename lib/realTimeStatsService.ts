import { EventEmitter } from 'events'
import dashboardStatsService, { DashboardStats } from './dashboardStatsService'
import Logger, { DataSource } from './logger'

export interface StatsUpdateEvent {
  type: 'stats_update'
  data: DashboardStats
  timestamp: string
}

export interface ConnectionInfo {
  id: string
  userId: string
  connectedAt: string
  lastPing: string
}

class RealTimeStatsService extends EventEmitter {
  private connections: Map<string, ConnectionInfo> = new Map()
  private updateInterval: NodeJS.Timeout | null = null
  private readonly UPDATE_INTERVAL = 30000 // 30 seconds
  private isRunning = false

  constructor() {
    super()
    this.setMaxListeners(100) // Allow more listeners for multiple connections
  }

  /**
   * Start the real-time stats service
   */
  start(): void {
    if (this.isRunning) {
      Logger.warn(DataSource.WEBSOCKET, 'realtime_stats', 'Service already running')
      return
    }

    this.isRunning = true
    Logger.info(DataSource.WEBSOCKET, 'realtime_stats', 'Starting real-time stats service')

    // Set up periodic stats updates
    this.updateInterval = setInterval(async () => {
      await this.broadcastStatsUpdate()
    }, this.UPDATE_INTERVAL)

    // Initial stats broadcast
    setTimeout(() => this.broadcastStatsUpdate(), 1000)
  }

  /**
   * Stop the real-time stats service
   */
  stop(): void {
    if (!this.isRunning) return

    this.isRunning = false
    Logger.info(DataSource.WEBSOCKET, 'realtime_stats', 'Stopping real-time stats service')

    if (this.updateInterval) {
      clearInterval(this.updateInterval)
      this.updateInterval = null
    }

    this.connections.clear()
    this.removeAllListeners()
  }

  /**
   * Register a new connection
   */
  addConnection(connectionId: string, userId: string): void {
    const connectionInfo: ConnectionInfo = {
      id: connectionId,
      userId,
      connectedAt: new Date().toISOString(),
      lastPing: new Date().toISOString()
    }

    this.connections.set(connectionId, connectionInfo)
    Logger.info(DataSource.WEBSOCKET, 'realtime_stats', `Connection added: ${connectionId} for user ${userId}`)

    // Send initial stats to the new connection
    this.sendStatsToConnection(connectionId)
  }

  /**
   * Remove a connection
   */
  removeConnection(connectionId: string): void {
    const connection = this.connections.get(connectionId)
    if (connection) {
      this.connections.delete(connectionId)
      Logger.info(DataSource.WEBSOCKET, 'realtime_stats', `Connection removed: ${connectionId}`)
    }
  }

  /**
   * Update connection ping time
   */
  updateConnectionPing(connectionId: string): void {
    const connection = this.connections.get(connectionId)
    if (connection) {
      connection.lastPing = new Date().toISOString()
    }
  }

  /**
   * Get all active connections
   */
  getConnections(): ConnectionInfo[] {
    return Array.from(this.connections.values())
  }

  /**
   * Get connection count
   */
  getConnectionCount(): number {
    return this.connections.size
  }

  /**
   * Broadcast stats update to all connections
   */
  private async broadcastStatsUpdate(): Promise<void> {
    if (this.connections.size === 0) {
      return // No connections to update
    }

    try {
      Logger.info(DataSource.WEBSOCKET, 'realtime_stats', `Broadcasting stats update to ${this.connections.size} connections`)
      
      const stats = await dashboardStatsService.getStats(true) // Use cache for real-time updates
      const updateEvent: StatsUpdateEvent = {
        type: 'stats_update',
        data: stats,
        timestamp: new Date().toISOString()
      }

      // Emit to all listeners
      this.emit('stats_update', updateEvent)

      Logger.success(DataSource.WEBSOCKET, 'realtime_stats', 'Stats update broadcasted successfully')

    } catch (error) {
      Logger.error(DataSource.WEBSOCKET, 'realtime_stats', 'Failed to broadcast stats update', error)
    }
  }

  /**
   * Send stats to a specific connection
   */
  private async sendStatsToConnection(connectionId: string): Promise<void> {
    try {
      const stats = await dashboardStatsService.getStats(true)
      const updateEvent: StatsUpdateEvent = {
        type: 'stats_update',
        data: stats,
        timestamp: new Date().toISOString()
      }

      this.emit('stats_update_single', { connectionId, event: updateEvent })

    } catch (error) {
      Logger.error(DataSource.WEBSOCKET, 'realtime_stats', `Failed to send stats to connection ${connectionId}`, error)
    }
  }

  /**
   * Trigger immediate stats update
   */
  async triggerStatsUpdate(): Promise<void> {
    Logger.info(DataSource.WEBSOCKET, 'realtime_stats', 'Triggering immediate stats update')
    
    // Clear cache to force fresh data
    dashboardStatsService.clearCache()
    
    // Broadcast update
    await this.broadcastStatsUpdate()
  }

  /**
   * Clean up stale connections
   */
  cleanupStaleConnections(maxAge: number = 5 * 60 * 1000): void {
    const now = Date.now()
    const staleConnections: string[] = []

    for (const [connectionId, connection] of this.connections) {
      const lastPingTime = new Date(connection.lastPing).getTime()
      if (now - lastPingTime > maxAge) {
        staleConnections.push(connectionId)
      }
    }

    staleConnections.forEach(connectionId => {
      this.removeConnection(connectionId)
    })

    if (staleConnections.length > 0) {
      Logger.info(DataSource.WEBSOCKET, 'realtime_stats', `Cleaned up ${staleConnections.length} stale connections`)
    }
  }

  /**
   * Get service status
   */
  getStatus(): {
    isRunning: boolean
    connectionCount: number
    uptime: string
    lastUpdate: string
  } {
    return {
      isRunning: this.isRunning,
      connectionCount: this.connections.size,
      uptime: this.isRunning ? 'Running' : 'Stopped',
      lastUpdate: new Date().toISOString()
    }
  }
}

// Export singleton instance
export const realTimeStatsService = new RealTimeStatsService()
export default realTimeStatsService