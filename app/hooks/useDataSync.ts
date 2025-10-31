/**
 * React hook for data synchronization with optimistic updates
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { dataSyncManager, SyncOperation, SyncConflict } from '../../lib/dataSyncManager'
import Logger, { DataSource } from '../../lib/logger'

export interface UseSyncOptions {
  entityType: string
  autoSync?: boolean
  syncInterval?: number
}

export interface SyncHookResult<T> {
  data: T[]
  loading: boolean
  error: string | null
  pendingOperations: number
  conflicts: SyncConflict[]
  
  // Operations
  create: (item: Omit<T, 'id'>) => Promise<T>
  update: (id: string, updates: Partial<T>) => Promise<T>
  delete: (id: string) => Promise<void>
  bulkUpdate: (ids: string[], updates: Partial<T>) => Promise<void>
  bulkDelete: (ids: string[]) => Promise<void>
  
  // Sync management
  refresh: () => Promise<void>
  resolveConflict: (conflictIndex: number, resolution: 'local' | 'remote') => Promise<void>
  clearConflicts: () => void
  
  // Status
  syncStatus: {
    isInitialized: boolean
    pendingOperations: number
    conflicts: number
    lastSync: string
    version: number
  }
}

export function useDataSync<T extends { id: string }>(
  options: UseSyncOptions,
  apiEndpoint: string,
  initialData?: T[]
): SyncHookResult<T> {
  const { entityType, autoSync = true, syncInterval = 30000 } = options
  
  const [data, setData] = useState<T[]>(initialData || [])
  const [loading, setLoading] = useState(!initialData)
  const [error, setError] = useState<string | null>(null)
  const [conflicts, setConflicts] = useState<SyncConflict[]>([])
  
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const isInitialized = useRef(false)

  // Initialize sync manager
  useEffect(() => {
    if (!isInitialized.current && data.length > 0) {
      dataSyncManager.initializeSyncState(entityType, data)
      isInitialized.current = true
      Logger.info(DataSource.SYNC, entityType, 'Initialized data sync')
    }
  }, [entityType, data])

  // Start periodic sync
  useEffect(() => {
    if (autoSync && isInitialized.current) {
      syncIntervalRef.current = setInterval(() => {
        refreshFromSync()
      }, syncInterval)

      return () => {
        if (syncIntervalRef.current) {
          clearInterval(syncIntervalRef.current)
        }
      }
    }
  }, [autoSync, syncInterval, entityType])

  // Update local state from sync manager
  const refreshFromSync = useCallback(() => {
    const syncedData = dataSyncManager.getData<T>(entityType)
    const syncConflicts = dataSyncManager.getConflicts(entityType)
    
    setData(syncedData)
    setConflicts(syncConflicts)
  }, [entityType])

  // Load initial data
  const loadInitialData = useCallback(async () => {
    if (initialData) return

    try {
      setLoading(true)
      setError(null)

      const response = await fetch(apiEndpoint)
      const result = await response.json()

      if (result.success) {
        const loadedData = result.data || result[entityType] || []
        setData(loadedData)
        dataSyncManager.initializeSyncState(entityType, loadedData)
        isInitialized.current = true
      } else {
        setError(result.message || 'Failed to load data')
      }
    } catch (err) {
      setError(`Failed to load ${entityType}`)
      Logger.error(DataSource.SYNC, entityType, 'Failed to load initial data', err)
    } finally {
      setLoading(false)
    }
  }, [apiEndpoint, entityType, initialData])

  // Load data on mount
  useEffect(() => {
    loadInitialData()
  }, [loadInitialData])

  // Create operation
  const create = useCallback(async (item: Omit<T, 'id'>): Promise<T> => {
    const tempId = `temp_${Date.now()}`
    const newItem = { ...item, id: tempId } as T

    const operation = await dataSyncManager.performOptimisticUpdate<T>(
      entityType,
      {
        type: 'CREATE',
        entity: entityType as any,
        entityId: tempId,
        data: newItem
      },
      async () => {
        const response = await fetch(apiEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(item)
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const result = await response.json()
        return result.success ? result.data || result[entityType.slice(0, -1)] : result
      }
    )

    try {
      const result = await operation.commit()
      refreshFromSync()
      return result
    } catch (error) {
      refreshFromSync()
      throw error
    }
  }, [entityType, apiEndpoint, refreshFromSync])

  // Update operation
  const update = useCallback(async (id: string, updates: Partial<T>): Promise<T> => {
    const operation = await dataSyncManager.performOptimisticUpdate<T>(
      entityType,
      {
        type: 'UPDATE',
        entity: entityType as any,
        entityId: id,
        data: updates
      },
      async () => {
        const response = await fetch(`${apiEndpoint}/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(updates)
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const result = await response.json()
        return result.success ? result.data || result[entityType.slice(0, -1)] : result
      }
    )

    try {
      const result = await operation.commit()
      refreshFromSync()
      return result
    } catch (error) {
      refreshFromSync()
      throw error
    }
  }, [entityType, apiEndpoint, refreshFromSync])

  // Delete operation
  const deleteItem = useCallback(async (id: string): Promise<void> => {
    const operation = await dataSyncManager.performOptimisticUpdate<void>(
      entityType,
      {
        type: 'DELETE',
        entity: entityType as any,
        entityId: id,
        data: null
      },
      async () => {
        const response = await fetch(`${apiEndpoint}/${id}`, {
          method: 'DELETE',
          credentials: 'include'
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        return undefined
      }
    )

    try {
      await operation.commit()
      refreshFromSync()
    } catch (error) {
      refreshFromSync()
      throw error
    }
  }, [entityType, apiEndpoint, refreshFromSync])

  // Bulk update operation
  const bulkUpdate = useCallback(async (ids: string[], updates: Partial<T>): Promise<void> => {
    const operation = await dataSyncManager.performOptimisticUpdate<void>(
      entityType,
      {
        type: 'BULK_UPDATE',
        entity: entityType as any,
        entityId: ids,
        data: updates
      },
      async () => {
        const response = await fetch(`${apiEndpoint}/bulk`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ ids, updates })
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        return undefined
      }
    )

    try {
      await operation.commit()
      refreshFromSync()
    } catch (error) {
      refreshFromSync()
      throw error
    }
  }, [entityType, apiEndpoint, refreshFromSync])

  // Bulk delete operation
  const bulkDelete = useCallback(async (ids: string[]): Promise<void> => {
    const operation = await dataSyncManager.performOptimisticUpdate<void>(
      entityType,
      {
        type: 'BULK_DELETE',
        entity: entityType as any,
        entityId: ids,
        data: null
      },
      async () => {
        const response = await fetch(`${apiEndpoint}/bulk`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ ids })
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        return undefined
      }
    )

    try {
      await operation.commit()
      refreshFromSync()
    } catch (error) {
      refreshFromSync()
      throw error
    }
  }, [entityType, apiEndpoint, refreshFromSync])

  // Refresh data
  const refresh = useCallback(async (): Promise<void> => {
    await loadInitialData()
    refreshFromSync()
  }, [loadInitialData, refreshFromSync])

  // Resolve conflict
  const resolveConflict = useCallback(async (
    conflictIndex: number, 
    resolution: 'local' | 'remote'
  ): Promise<void> => {
    await dataSyncManager.resolveConflict(entityType, conflictIndex, resolution)
    refreshFromSync()
  }, [entityType, refreshFromSync])

  // Clear resolved conflicts
  const clearConflicts = useCallback(() => {
    dataSyncManager.clearResolvedConflicts(entityType)
    refreshFromSync()
  }, [entityType, refreshFromSync])

  // Get sync status
  const syncStatus = dataSyncManager.getSyncStatus(entityType)

  return {
    data,
    loading,
    error,
    pendingOperations: syncStatus.pendingOperations,
    conflicts,
    
    create,
    update,
    delete: deleteItem,
    bulkUpdate,
    bulkDelete,
    
    refresh,
    resolveConflict,
    clearConflicts,
    
    syncStatus
  }
}

// Specialized hooks for different entity types
export function useContactSync(initialData?: any[]) {
  return useDataSync({
    entityType: 'contacts'
  }, '/api/contacts', initialData)
}

export function useCampaignSync(initialData?: any[]) {
  return useDataSync({
    entityType: 'campaigns'
  }, '/api/campaigns', initialData)
}

export function useLeadSync(initialData?: any[]) {
  return useDataSync({
    entityType: 'leads'
  }, '/api/leads', initialData)
}

export function useMessageSync(initialData?: any[]) {
  return useDataSync({
    entityType: 'messages'
  }, '/api/messages', initialData)
}

export function useAutomationSync(initialData?: any[]) {
  return useDataSync({
    entityType: 'automations'
  }, '/api/automations', initialData)
}