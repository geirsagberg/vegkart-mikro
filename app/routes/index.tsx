import { createFileRoute } from '@tanstack/react-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { MapRef } from '../components/Map'
import { VegkartMap } from '../components/Map'
import { getSyncProgress, getSyncState, startSync, stopSync } from '../db/sync'

export const Route = createFileRoute('/')({
  component: Home,
})

interface DbSyncState {
  table_name: string
  last_veglenkesekvens_id: number
  last_veglenkenummer: number
  last_sync: string
}

interface SyncProgress {
  currentId: number
  lastVeglenkenummer: number
  batchCount: number
  isComplete: boolean
}

function Home() {
  const [syncState, setSyncState] = useState<DbSyncState[]>([])
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const mapRef = useRef<MapRef>(null)
  const pollInterval = useRef<NodeJS.Timeout>(null)

  const fetchSyncState = useCallback(async () => {
    try {
      const state = await getSyncState()
      setSyncState(state)
    } catch (error) {
      console.error('Failed to fetch sync state:', error)
    }
  }, [])

  const pollProgress = useCallback(async () => {
    try {
      const progress = await getSyncProgress()
      setSyncProgress(progress)
      if (progress.isComplete) {
        setIsSyncing(false)
        if (pollInterval.current) {
          clearInterval(pollInterval.current)
        }
      }
    } catch (error) {
      console.error('Failed to fetch sync progress:', error)
    }
  }, [])

  useEffect(() => {
    fetchSyncState()
  }, [fetchSyncState])

  useEffect(() => {
    if (isSyncing) {
      pollProgress()
      pollInterval.current = setInterval(pollProgress, 1000)
    }
    return () => {
      if (pollInterval.current) {
        clearInterval(pollInterval.current)
      }
    }
  }, [isSyncing, pollProgress])

  const startSyncHandler = useCallback(async () => {
    setIsSyncing(true)
    setError(null)
    setSyncProgress(null)

    try {
      await startSync()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unknown error')
      setIsSyncing(false)
    }
  }, [])

  const stopSyncHandler = useCallback(async () => {
    try {
      await stopSync()
      setIsSyncing(false)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unknown error')
    }
  }, [])

  const handleDrawVeglenker = useCallback(async () => {
    if (!mapRef.current) return
    setIsLoading(true)
    try {
      await mapRef.current.drawVeglenkerInView()
    } catch (error) {
      console.error('Failed to draw veglenker:', error)
      setError(error instanceof Error ? error.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }, [])

  return (
    <div className="flex flex-col h-screen">
      <div className="navbar bg-base-100 shadow-lg">
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Vegkart</h1>
        </div>
        <div className="flex items-center gap-4">
          {syncProgress && (
            <div className="text-sm">
              {isSyncing ? (
                <>
                  Loading ID: {syncProgress.currentId}-
                  {syncProgress.lastVeglenkenummer}
                  <span className="ml-2 badge badge-sm">
                    Batch {syncProgress.batchCount}
                  </span>
                </>
              ) : (
                <>
                  Synced to ID: {syncProgress.currentId}-
                  {syncProgress.lastVeglenkenummer}
                  <span className="ml-2 badge badge-sm badge-success">
                    {syncProgress.batchCount} batches
                  </span>
                </>
              )}
            </div>
          )}
          {error && <div className="text-sm text-error">Error: {error}</div>}
          <div className="flex gap-2">
            {!isSyncing ? (
              <button onClick={startSyncHandler} className="btn btn-primary">
                Start Sync
              </button>
            ) : (
              <button onClick={stopSyncHandler} className="btn btn-error">
                Stop Sync
              </button>
            )}
            <button
              onClick={handleDrawVeglenker}
              disabled={isLoading}
              className="btn btn-accent"
            >
              {isLoading ? 'Loading...' : 'Draw Veglenker'}
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1">
        <VegkartMap ref={mapRef} />
      </div>
    </div>
  )
}
