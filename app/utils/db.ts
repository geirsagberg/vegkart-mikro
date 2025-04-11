import * as duckdb from 'duckdb'

const db = new duckdb.Database(':memory:')

export async function query(sql: string) {
  return new Promise((resolve, reject) => {
    db.all(sql, (err, res) => {
      if (err) reject(err)
      else resolve(res)
    })
  })
}
