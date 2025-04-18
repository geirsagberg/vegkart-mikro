import { DuckDBInstance } from '@duckdb/node-api'
import { createServerFn } from '@tanstack/react-start'

const NVDB_STREAM_URL =
  'https://nvdbapiles.test.atlas.vegvesen.no/uberiket/api/v1/vegnett/veglenker/stream'

const BATCH_SIZE = 10000

interface DbSyncState {
  table_name: string
  last_veglenkesekvens_id: number
  last_veglenkenummer: number
  last_sync: string
}

interface SyncProgress {
  currentId: number
  lastVeglenkenummer: number
  batchCount: number
  isComplete: boolean
}

interface SyncStatus {
  isRunning: boolean
  currentId: number
  lastVeglenkenummer: number
  batchCount: number
  error: string | null
}

let syncStatus: SyncStatus = {
  isRunning: false,
  currentId: 0,
  lastVeglenkenummer: 0,
  batchCount: 0,
  error: null,
}

interface MaxIdResult {
  max_id: number
}

interface TableExists {
  exists: boolean
}

interface LastProcessed {
  currentId: number
  lastVeglenkenummer: number
}

async function ensureSyncState(connection: any) {
  await connection.run(`
    CREATE TABLE IF NOT EXISTS sync_state (
      table_name VARCHAR PRIMARY KEY,
      last_veglenkesekvens_id INTEGER NOT NULL DEFAULT 0,
      last_veglenkenummer INTEGER NOT NULL DEFAULT 0,
      last_sync TIMESTAMPTZ
    )
  `)
}

async function getLastIds(
  connection: any,
  tableName: string,
): Promise<{ veglenkesekvensId: number; veglenkenummer: number }> {
  const result = await connection.runAndReadAll(`
    SELECT last_veglenkesekvens_id, last_veglenkenummer
    FROM sync_state
    WHERE table_name = '${tableName}'
  `)
  const row = result.getRowsJS()[0]
  return {
    veglenkesekvensId: row?.last_veglenkesekvens_id || 0,
    veglenkenummer: row?.last_veglenkenummer || 0,
  }
}

async function updateSyncState(
  connection: any,
  tableName: string,
  veglenkesekvensId: number,
  veglenkenummer: number,
) {
  await connection.run(`
    INSERT INTO sync_state (table_name, last_veglenkesekvens_id, last_veglenkenummer, last_sync)
    VALUES ('${tableName}', ${veglenkesekvensId}, ${veglenkenummer}, now())
    ON CONFLICT (table_name)
    DO UPDATE SET
      last_veglenkesekvens_id = ${veglenkesekvensId},
      last_veglenkenummer = ${veglenkenummer},
      last_sync = now()
  `)
}

export const startSync = createServerFn({ method: 'POST' }).handler(
  async (): Promise<void> => {
    if (syncStatus.isRunning) {
      throw new Error('Sync already running')
    }

    syncStatus = {
      isRunning: true,
      currentId: 0,
      lastVeglenkenummer: 0,
      batchCount: 0,
      error: null,
    }

    const instance = await DuckDBInstance.fromCache('spatial.db')
    const connection = await instance.connect()

    try {
      await ensureSyncState(connection)
      const { veglenkesekvensId, veglenkenummer } = await getLastIds(
        connection,
        'veglenker',
      )

      syncStatus.currentId = veglenkesekvensId
      syncStatus.lastVeglenkenummer = veglenkenummer

      // Enable httpfs extension
      await connection.run(
        'INSTALL httpfs; LOAD httpfs; INSTALL spatial; LOAD spatial;',
      )

      while (syncStatus.isRunning) {
        const url = `${NVDB_STREAM_URL}?start=${syncStatus.currentId}-${syncStatus.lastVeglenkenummer}&antall=${BATCH_SIZE}`

        // Check if table exists
        const tableExists = await connection.runAndReadAll(`
          SELECT name FROM sqlite_master WHERE type='table' AND name='veglenker'
        `)
        const exists = tableExists.getRowsJS().length > 0

        if (!exists) {
          // Create table from first batch
          await connection.run(`
            CREATE TABLE veglenker AS
            SELECT
              veglenkesekvensId,
              veglenkenummer,
              startposisjon,
              sluttposisjon,
              gyldighetsperiode->'startdato' as startdato,
              gyldighetsperiode->'sluttdato' as sluttdato,
              ST_GeomFromText(geometri.wkt) as geometri,
              kommune,
              lengde
            FROM read_ndjson('${url}');

            ALTER TABLE veglenker
            ADD PRIMARY KEY (veglenkesekvensId, veglenkenummer);
          `)
        } else {
          // Insert into existing table
          await connection.run(`
            INSERT INTO veglenker
            SELECT
              veglenkesekvensId,
              veglenkenummer,
              startposisjon,
              sluttposisjon,
              gyldighetsperiode->'startdato' as startdato,
              gyldighetsperiode->'sluttdato' as sluttdato,
              ST_GeomFromText(geometri.wkt) as geometri,
              kommune,
              lengde
            FROM read_ndjson('${url}')
            ON CONFLICT (veglenkesekvensId, veglenkenummer)
            DO UPDATE SET
              startposisjon = EXCLUDED.startposisjon,
              sluttposisjon = EXCLUDED.sluttposisjon,
              startdato = EXCLUDED.startdato,
              sluttdato = EXCLUDED.sluttdato,
              geometri = ST_GeomFromText(EXCLUDED.geometri.wkt),
              kommune = EXCLUDED.kommune,
              lengde = EXCLUDED.lengde
          `)
        }

        // Get the last processed IDs from the table
        const lastProcessed = await connection.runAndReadAll(`
          SELECT
            veglenkesekvensId as currentId,
            veglenkenummer as lastVeglenkenummer
          FROM veglenker
          ORDER BY veglenkesekvensId DESC, veglenkenummer DESC
          LIMIT 1
        `)
        const rows = lastProcessed.getRowObjects()
        const lastRow =
          rows.length > 0 && rows[0]
            ? {
                currentId: Number(rows[0].currentId),
                lastVeglenkenummer: Number(rows[0].lastVeglenkenummer),
              }
            : null

        if (lastRow) {
          syncStatus.currentId = lastRow.currentId
          syncStatus.lastVeglenkenummer = lastRow.lastVeglenkenummer

          // Update sync state
          await updateSyncState(
            connection,
            'veglenker',
            syncStatus.currentId,
            syncStatus.lastVeglenkenummer,
          )

          syncStatus.batchCount++
        } else {
          syncStatus.isRunning = false
        }
      }
    } catch (error: unknown) {
      console.error('Sync failed:', error)
      syncStatus.error =
        error instanceof Error ? error.message : 'Unknown error'
      syncStatus.isRunning = false
      throw error
    }
  },
)

export const stopSync = createServerFn({ method: 'POST' }).handler(
  async (): Promise<void> => {
    syncStatus.isRunning = false
  },
)

export const getSyncProgress = createServerFn({ method: 'GET' }).handler(
  async (): Promise<SyncProgress> => {
    return {
      currentId: syncStatus.currentId,
      lastVeglenkenummer: syncStatus.lastVeglenkenummer,
      batchCount: syncStatus.batchCount,
      isComplete: !syncStatus.isRunning,
    }
  },
)

export const getSyncState = createServerFn({ method: 'GET' }).handler(
  async () => {
    const instance = await DuckDBInstance.fromCache('spatial.db')
    const connection = await instance.connect()

    try {
      const result = await connection.runAndReadAll(`
      SELECT * FROM sync_state
    `)
      return result.getRowsJS() as unknown as DbSyncState[]
    } finally {
      // No need to close - DuckDB handles cleanup
    }
  },
)
