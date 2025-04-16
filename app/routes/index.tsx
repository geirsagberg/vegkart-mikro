import { createFileRoute } from '@tanstack/react-router'
import { VegkartMap } from '../components/Map'
import {
  fetchVeglenkesekvenser,
  loadVeglenkesekvenser,
} from '../db/loadVeglenkesekvenser'

export const Route = createFileRoute('/')({
  component: Home,
})

const handleLoad = async () => {
  try {
    const result = await loadVeglenkesekvenser()
    console.log(`Loaded ${result.count} veglenkesekvenser`)
  } catch (error) {
    console.error('Failed to load veglenkesekvenser:', error)
  }
}

const handleFetch = async () => {
  const result = await fetchVeglenkesekvenser()
  console.log(result)
}

function Home() {
  return (
    <div className="flex flex-col h-screen">
      <div className="bg-base-200 p-4 shadow-md">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Vegkart Mikro</h1>
          <button className="btn" onClick={handleFetch}>
            Tegn veglenkesekvenser
          </button>
          <button className="btn btn-primary" onClick={handleLoad}>
            Last inn veglenkesekvenser
          </button>
        </div>
      </div>
      <div className="flex-1">
        <VegkartMap />
      </div>
    </div>
  )
}
