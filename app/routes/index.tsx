import { createFileRoute } from '@tanstack/react-router'
import { VegkartMap } from '../components/Map'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  return <VegkartMap />
}
