import * as duckdb from 'duckdb'

let db: duckdb.Database | null = null

export function getDB() {
  if (!db) {
    db = new duckdb.Database(':memory:')
  }
  return db
}

export async function query(sql: string): Promise<duckdb.TableData> {
  const db = getDB()
  return new Promise((resolve, reject) => {
    db.all(sql, (err: Error | null, res: duckdb.TableData) => {
      if (err) reject(err)
      else resolve(res)
    })
  })
}
