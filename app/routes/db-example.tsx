import { createFileRoute } from '@tanstack/react-router'
// import { query } from '../utils/db'

export const Route = createFileRoute('/db-example')({
  component: DBExample,
  loader: async () => {
    // await query('CREATE TABLE test (id INTEGER, name VARCHAR)')
    // await query("INSERT INTO test VALUES (1, 'Hello'), (2, 'World')")
    // const result = await query('SELECT * FROM test')
    // return result
    return 'Hello, world!'
  },
})

function DBExample() {
  const data = Route.useLoaderData()

  return (
    <div>
      <h1>DuckDB Example</h1>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  )
}
