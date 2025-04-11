import { DuckDBInstance } from '@duckdb/node-api'
import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { initDB } from '../db/init'

const getAnswer = createServerFn({
  method: 'GET',
}).handler(async () => {
  const instance = await DuckDBInstance.fromCache('spatial.db')
  const connection = await instance.connect()
  const result = await connection.run(`
    SELECT p.name as point_name,
           ST_AsText(p.geom) as point_geom,
           poly.name as polygon_name
    FROM points p
    LEFT JOIN polygons poly ON ST_Contains(poly.geom, p.geom)
  `)
  const rows = await result.getRowObjects()
  return rows.map((row) =>
    Object.fromEntries(
      Object.entries(row).map(([key, value]) => [
        key,
        value === null ? null : String(value),
      ]),
    ),
  )
})

export const Route = createFileRoute('/db-example')({
  component: DBExample,
  loader: async () => {
    await initDB()
    return getAnswer()
  },
})

function DBExample() {
  const data = Route.useLoaderData()
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">DuckDB Example</h1>
      <div className="mt-4">
        <pre>{JSON.stringify(data, null, 2)}</pre>
      </div>
    </div>
  )
}
