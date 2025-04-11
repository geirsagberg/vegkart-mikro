import { createServerFn } from '@tanstack/react-start'
import * as fs from 'node:fs'

const filePath = 'count.txt'

async function readCount() {
  return parseInt(
    await fs.promises.readFile(filePath, 'utf-8').catch(() => '0'),
  )
}

export const getCount = createServerFn({
  method: 'GET',
}).handler(async () => {
  return readCount()
})

export const updateCount = createServerFn({
  method: 'POST',
})
  .validator((data: unknown) => {
    if (typeof data !== 'object' || data === null) {
      throw new Error('Data must be an object')
    }
    if (!('increment' in data) || typeof (data as any).increment !== 'number') {
      throw new Error('increment must be a number')
    }
    return data as { increment: number }
  })
  .handler(async ({ data }) => {
    const count = await readCount()
    await fs.promises.writeFile(filePath, `${count + data.increment}`)
    return 'OK'
  })
