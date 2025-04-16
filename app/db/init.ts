import { DuckDBInstance } from '@duckdb/node-api'
import { sql } from './sql'

export async function initDB() {
  const instance = await DuckDBInstance.fromCache('spatial.db')
  const connection = await instance.connect()

  await connection.run(sql`INSTALL spatial;`)
  await connection.run(sql`LOAD spatial;`)

  // Create table for veglenker
  await connection.run(sql`
    CREATE TABLE IF NOT EXISTS veglenker (
      veglenkesekvenes_id BIGINT NOT NULL,
      veglenkenummer INTEGER NOT NULL,
      startposisjon FLOAT NOT NULL,
      sluttposisjon FLOAT NOT NULL,
      startdato DATE NOT NULL,
      sluttdato DATE,
      geometri GEOMETRY NOT NULL,
      kommune INTEGER NOT NULL,
      lengde FLOAT NOT NULL,
      PRIMARY KEY (veglenkesekvenes_id, veglenkenummer)
    );
  `)

  // Create table for vegobjekter
  await connection.run(sql`
    CREATE TABLE IF NOT EXISTS vegobjekter (
      vegobjekt_id BIGINT NOT NULL,
      vegobjekt_versjon INTEGER NOT NULL,
      vegobjekt_type INTEGER NOT NULL,
      startdato DATE NOT NULL,
      sluttdato DATE,
      egenskaper JSON,
      PRIMARY KEY (vegobjekt_id, vegobjekt_versjon)
    );
  `)

  // Create table for stedfestinger
  await connection.run(sql`
    CREATE TABLE IF NOT EXISTS stedfestinger (
      veglenkesekvens_id BIGINT NOT NULL,
      startposisjon FLOAT NOT NULL,
      sluttposisjon FLOAT NOT NULL,
      vegobjekt_id BIGINT NOT NULL,
      vegobjekt_versjon INTEGER NOT NULL
    );
  `)

  return { success: true }
}
