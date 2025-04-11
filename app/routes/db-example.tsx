import type { DuckDBValue } from '@duckdb/node-api'
import { DuckDBInstance } from '@duckdb/node-api'
import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'

let instance: DuckDBInstance | null = null

const queryDB = createServerFn({
  method: 'POST',
})
  .validator((data: unknown) => {
    if (typeof data !== 'string') {
      throw new Error('Query must be a string')
    }
    return data
  })
  .handler(async ({ data: query }) => {
    'use server'
    if (!instance) {
      instance = await DuckDBInstance.create()
    }
    const connection = await instance.connect()
    const result = await connection.run(query)
    const rows = await result.getRowObjects()
    return {
      rowCount: result.rowCount,
      columns: result.columnNames(),
      rows: rows.map((row: Record<string, DuckDBValue>) => {
        const plainRow: Record<string, string | number | boolean | null> = {}
        for (const [key, value] of Object.entries(row)) {
          plainRow[key] = value === null ? null : String(value)
        }
        return plainRow
      }),
    }
  })

export const Route = createFileRoute('/db-example')({
  component: DBExample,
})

function DBExample() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">DuckDB Example</h1>
      <button
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        onClick={async () => {
          try {
            const result = await queryDB({ data: 'SELECT 42 as answer' })
            console.log('Query result:', result)
          } catch (error) {
            console.error('Query failed:', error)
          }
        }}
      >
        Run Query
      </button>
    </div>
  )
}
