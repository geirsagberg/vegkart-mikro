import { DuckDBInstance } from '@duckdb/node-api'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

const GeoJSONPoint = z.object({
  type: z.literal('Point'),
  coordinates: z.tuple([z.number(), z.number()]),
})

const GeoJSONLineString = z.object({
  type: z.literal('LineString'),
  coordinates: z.array(z.tuple([z.number(), z.number()])),
})

const GeoJSONVeglenkeFeature = z.object({
  type: z.literal('Feature'),
  geometry: z.union([
    z.object({
      type: z.literal('Point'),
      coordinates: z.tuple([z.number(), z.number()]),
    }),
    z.object({
      type: z.literal('LineString'),
      coordinates: z.array(z.tuple([z.number(), z.number()])),
    }),
  ]),
  properties: z.object({
    veglenkesekvensId: z.number(),
    veglenkenummer: z.number(),
    startposisjon: z.number(),
    sluttposisjon: z.number(),
    startdato: z.string().date(),
    sluttdato: z.string().date().nullish(),
    kommune: z.number(),
    lengde: z.number(),
    isPoint: z.boolean(),
  }),
})

const GeoJSONVeglenkeCollection = z.object({
  type: z.literal('FeatureCollection'),
  features: z.array(GeoJSONVeglenkeFeature),
})

type GeoJSONVeglenkeCollection = z.infer<typeof GeoJSONVeglenkeCollection>

interface BoundingBox {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

const FEATURE_THRESHOLD = 10000

export const queryVeglenker = createServerFn({ method: 'POST' })
  .validator((data: BoundingBox) => data)
  .handler(async ({ data }): Promise<GeoJSONVeglenkeCollection> => {
    const { minX, minY, maxX, maxY } = data
    const instance = await DuckDBInstance.fromCache('spatial.db')
    const connection = await instance.connect()

    try {
      await connection.run('INSTALL spatial; LOAD spatial;')

      // First get count to decide if we should transform to points
      const countResult = await connection.runAndReadAll(
        `
        SELECT COUNT(*)::INTEGER as count
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
      const count = rows[0]?.count as number | undefined
      const shouldUsePoints = (count ?? 0) > FEATURE_THRESHOLD

      const result = await connection.runAndReadAll(
        `
        SELECT
          json_object(
            'type', 'Feature',
            'geometry', ${
              shouldUsePoints
                ? 'ST_AsGeoJSON(ST_Centroid(geometri))::json'
                : 'ST_AsGeoJSON(ST_Force2D(geometri))::json'
            },
            'properties', json_object(
              'veglenkesekvensId', veglenkesekvensId,
              'veglenkenummer', veglenkenummer,
              'startposisjon', startposisjon,
              'sluttposisjon', sluttposisjon,
              'startdato', startdato,
              'sluttdato', sluttdato,
              'kommune', kommune,
              'lengde', lengde,
              'isPoint', ${shouldUsePoints ? 'true' : 'false'}
            )
          ) as feature
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
        .map((row) =>
          GeoJSONVeglenkeFeature.parse(JSON.parse(row.feature as string)),
        )
      const featureCollection: GeoJSONVeglenkeCollection = {
        type: 'FeatureCollection',
        features,
      }

      return featureCollection
    } finally {
      // No need to close - DuckDB handles cleanup
    }
  })
