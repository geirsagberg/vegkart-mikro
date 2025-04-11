import { DuckDBInstance } from '@duckdb/node-api'
import { sql } from './sql'

export async function initDB() {
  const instance = await DuckDBInstance.fromCache('spatial.db')
  const connection = await instance.connect()

  // Check if spatial extension is installed
  const result = await connection.run(sql`
    SELECT * FROM duckdb_extensions() WHERE extension_name = 'spatial'
  `)
  const rows = await result.getRowObjects()
  if (rows.length === 0) {
    await connection.run(sql`INSTALL spatial;`)
    await connection.run(sql`LOAD spatial;`)
  }

  // Create tables with spatial data
  await connection.run(sql`
    CREATE TABLE IF NOT EXISTS points (
      id INTEGER PRIMARY KEY,
      name TEXT,
      geom GEOMETRY
    );

    CREATE TABLE IF NOT EXISTS polygons (
      id INTEGER PRIMARY KEY,
      name TEXT,
      geom GEOMETRY
    );
  `)

  // Insert some sample data
  await connection.run(sql`
    INSERT OR IGNORE INTO points (id, name, geom) VALUES
      (1, 'Point A', ST_Point(1, 2)),
      (2, 'Point B', ST_Point(3, 4));

    INSERT OR IGNORE INTO polygons (id, name, geom) VALUES
      (1, 'Polygon A', ST_GeomFromText('POLYGON((0 0, 0 1, 1 1, 1 0, 0 0))')),
      (2, 'Polygon B', ST_GeomFromText('POLYGON((2 2, 2 3, 3 3, 3 2, 2 2))'));
  `)

  return { success: true }
}
