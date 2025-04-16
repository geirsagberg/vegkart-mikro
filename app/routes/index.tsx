import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import type { MapRef } from '../components/Map'
import { VegkartMap } from '../components/Map'
import { getSyncState, syncVeglenker } from '../db/sync'

export const Route = createFileRoute('/')({
  component: Home,
})

interface SyncStatus {
  startId: number
  currentMaxId: number
  lastVeglenkenummer: number
}

function Home() {
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null)
  const [currentId, setCurrentId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const mapRef = useRef<MapRef>(null)

  useEffect(() => {
    loadSyncStatus()
  }, [])

  const loadSyncStatus = async () => {
    try {
      const state = await getSyncState()
      const veglenkerState = state.find((s) => s.table_name === 'veglenker')
      if (veglenkerState) {
        setSyncStatus({
          startId: veglenkerState.last_veglenkesekvens_id,
          currentMaxId: veglenkerState.last_veglenkesekvens_id,
          lastVeglenkenummer: veglenkerState.last_veglenkenummer,
        })
      }
    } catch (error) {
      console.error('Failed to load sync status:', error)
    }
  }

  const handleLoad = async () => {
    setIsSyncing(true)
    setError(null)
    setCurrentId(null)
    try {
      const result = await syncVeglenker()
      if (result.success) {
        setSyncStatus({
          startId: result.startId,
          currentMaxId: result.currentMaxId,
          lastVeglenkenummer: result.lastVeglenkenummer,
        })
        setCurrentId(result.currentId)
        console.log(
          `Synced veglenkesekvenser from ID ${result.startId} to ${result.currentMaxId}`,
        )
      } else {
        setError(result.error)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      setError(message)
      console.error('Failed to sync veglenkesekvenser:', error)
    } finally {
      setIsSyncing(false)
      setCurrentId(null)
    }
  }

  const handleDrawVeglenker = async () => {
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
  }

  return (
    <div className="flex flex-col h-screen">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Vegkart Mikro</h1>
          <div className="flex items-center gap-4">
            {syncStatus && (
              <div className="text-sm">
                {isSyncing ? (
                  <>
                    Loading ID: {currentId} / {syncStatus.currentMaxId}{' '}
                    (veglenkenummer: {syncStatus.lastVeglenkenummer})
                  </>
                ) : (
                  <>
                    Synced to ID: {syncStatus.currentMaxId} (veglenkenummer:{' '}
                    {syncStatus.lastVeglenkenummer})
                  </>
                )}
              </div>
            )}
            {error && <div className="text-sm text-error">Error: {error}</div>}
            <button
              className="btn btn-primary"
              onClick={handleLoad}
              disabled={isSyncing}
            >
              {isSyncing ? 'Syncing...' : 'Synkroniser veglenkesekvenser'}
            </button>
            <button
              onClick={handleDrawVeglenker}
              disabled={isLoading}
              className="btn btn-primary"
            >
              {isLoading ? 'Loading...' : 'Draw Veglenker'}
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1">
        <VegkartMap ref={mapRef} />
      </main>
    </div>
  )
}
