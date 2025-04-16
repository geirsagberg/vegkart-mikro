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
  geometry: GeoJSONLineString,
  properties: z.object({
    veglenkesekvensId: z.number(),
    veglenkenummer: z.number(),
    startposisjon: z.number(),
    sluttposisjon: z.number(),
    startdato: z.string().date(),
    sluttdato: z.string().date().nullish(),
    kommune: z.number(),
    lengde: z.number(),
  }),
})

const GeoJSONVeglenkeCollection = z.object({
  type: z.literal('FeatureCollection'),
  features: z.array(GeoJSONVeglenkeFeature),
})

type GeoJSONFeatureCollection = z.infer<typeof GeoJSONVeglenkeCollection>

interface BoundingBox {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

export const queryVeglenker = createServerFn({ method: 'POST' })
  .validator((data: BoundingBox) => data)
  .handler(async ({ data }): Promise<GeoJSONFeatureCollection> => {
    const { minX, minY, maxX, maxY } = data
    const instance = await DuckDBInstance.fromCache('spatial.db')
    const connection = await instance.connect()

    try {
      await connection.run('INSTALL spatial; LOAD spatial;')
      const result = await connection.runAndReadAll(
        `
        SELECT
          json_object(
            'type', 'Feature',
            'geometry', ST_AsGeoJSON(ST_Force2D(geometri))::json,
            'properties', json_object(
              'veglenkesekvensId', veglenkesekvensId,
              'veglenkenummer', veglenkenummer,
              'startposisjon', startposisjon,
              'sluttposisjon', sluttposisjon,
              'startdato', startdato,
              'sluttdato', sluttdato,
              'kommune', kommune,
              'lengde', lengde
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
      const featureCollection: GeoJSONFeatureCollection = {
        type: 'FeatureCollection',
        features,
      }

      return featureCollection
    } finally {
      // No need to close - DuckDB handles cleanup
    }
  })
