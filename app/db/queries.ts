import { DuckDBInstance } from '@duckdb/node-api'
import { createServerFn } from '@tanstack/react-start'
import type { FeatureCollection, Geometry } from 'geojson'
import { type BoundingBox } from './geojson'
import { sql } from './sql'

const FEATURE_THRESHOLD = 10000

export const queryVeglenker = createServerFn({ method: 'POST' })
  .validator((data: BoundingBox) => data)
  .handler(async ({ data }): Promise<Geometry | FeatureCollection> => {
    const { minX, minY, maxX, maxY } = data
    const instance = await DuckDBInstance.fromCache('spatial.db')
    const connection = await instance.connect()

    try {
      await connection.run('INSTALL spatial; LOAD spatial;')

      // First get count to decide if we should transform to points
      const countResult = await connection.runAndReadAll(
        sql`
        SELECT COUNT(*) as count
        FROM veglenker
        WHERE ST_Intersects(
          geometri,
          ST_MakeEnvelope($1, $2, $3, $4)
        )
          AND sluttdato IS NULL
      `,
        [minX, minY, maxX, maxY],
      )

      const rows = countResult.getRowObjects()
      const count = (rows[0]?.count as number | undefined) ?? 0

      if (count > 100_000) {
        return {
          type: 'FeatureCollection' as const,
          features: [],
        }
      }

      const tooMany = count > FEATURE_THRESHOLD

      const result = await connection.runAndReadAll(
        sql`
        SELECT
          to_json({
            type: 'Feature',
            geometry: ${
              tooMany
                ? `ST_AsGeoJSON(ST_Centroid(geometri))`
                : `ST_AsGeoJSON(ST_Force2D(geometri))`
            },
            properties: {
              ${
                tooMany
                  ? `isPoint: true`
                  : `
                veglenkesekvensId: veglenkesekvensId,
                veglenkenummer: veglenkenummer,
                startposisjon: startposisjon,
                sluttposisjon: sluttposisjon,
                startdato: startdato,
                sluttdato: sluttdato,
                kommune: kommune,
                lengde: lengde,
                `
              }
            }
          }) as feature
        FROM veglenker
        WHERE ST_Intersects(
          geometri,
          ST_MakeEnvelope($1, $2, $3, $4)
        )
          AND sluttdato IS NULL
      `,
        [minX, minY, maxX, maxY],
      )
      const features = result
        .getRowObjectsJson()
        .map((row) => JSON.parse(row.feature as string))
      return {
        type: 'FeatureCollection' as const,
        features,
      }
    } finally {
      // No need to close - DuckDB handles cleanup
    }
  })
