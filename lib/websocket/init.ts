import { webSocketManager } from './server'
import { liveDataSyncService } from '../liveDataSync'
import Logger, { DataSource } from '../logger'

/**
 * Initialize WebSocket server and live data sync
 * This should be called when the application starts
 */
export function initializeRealTimeSystem(server?: any): void {
  try {
    Logger.info(DataSource.WEBSOCKET, 'init', 'Initializing real-time system')

    // Initialize WebSocket server if server instance is provided
    if (server) {
      webSocketManager.initialize(server)
      Logger.info(DataSource.WEBSOCKET, 'init', 'WebSocket server initialized')
    } else {
      Logger.warn(DataSource.WEBSOCKET, 'init', 'No server instance provided, WebSocket server not initialized')
    }

    // Start live data synchronization
    liveDataSyncService.start()
    Logger.info(DataSource.WEBSOCKET, 'init', 'Live data sync service started')

    Logger.success(DataSource.WEBSOCKET, 'init', 'Real-time system initialized successfully')
  } catch (error) {
    Logger.error(DataSource.WEBSOCKET, 'init', 'Failed to initialize real-time system', error)
    throw error
  }
}

/**
 * Shutdown real-time system
 */
export function shutdownRealTimeSystem(): void {
  try {
    Logger.info(DataSource.WEBSOCKET, 'init', 'Shutting down real-time system')

    // Stop live data sync
    liveDataSyncService.stop()

    // Shutdown WebSocket server
    webSocketManager.shutdown()

    Logger.info(DataSource.WEBSOCKET, 'init', 'Real-time system shutdown complete')
  } catch (error) {
    Logger.error(DataSource.WEBSOCKET, 'init', 'Error during real-time system shutdown', error)
  }
}

/**
 * Get real-time system status
 */
export function getRealTimeSystemStatus(): {
  webSocket: any
  liveSync: any
  timestamp: string
} {
  return {
    webSocket: webSocketManager.getStats(),
    liveSync: liveDataSyncService.getStatus(),
    timestamp: new Date().toISOString()
  }
}