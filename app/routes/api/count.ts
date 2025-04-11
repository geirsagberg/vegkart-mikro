import { createFileRoute } from '@tanstack/react-router'
import * as fs from 'node:fs'

const filePath = 'count.txt'

async function readCount() {
  return parseInt(
    await fs.promises.readFile(filePath, 'utf-8').catch(() => '0'),
  )
}

export const Route = createFileRoute('/api/count')({
  component: () => null,
  loader: async () => {
    const count = await readCount()
    return new Response(`${count}`)
  },
  action: async ({ request }) => {
    const { increment } = await request.json()
    const count = await readCount()
    await fs.promises.writeFile(filePath, `${count + increment}`)
    return new Response('OK')
  },
})
