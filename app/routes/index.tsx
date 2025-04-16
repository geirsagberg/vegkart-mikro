import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
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

  return (
    <div className="flex flex-col h-screen">
      <div className="bg-base-200 p-4 shadow-md">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Vegkart Mikro</h1>
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
          </div>
        </div>
      </div>
      <div className="flex-1">
        <VegkartMap />
      </div>
    </div>
  )
}
