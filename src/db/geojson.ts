import { z } from 'zod'

// Basic GeoJSON geometry types
export const GeoJSONPoint = z.object({
  type: z.literal('Point'),
  coordinates: z.tuple([z.number(), z.number()]),
})

export type GeoJSONPoint = z.infer<typeof GeoJSONPoint>

export const GeoJSONLineString = z.object({
  type: z.literal('LineString'),
  coordinates: z.array(z.tuple([z.number(), z.number()])),
})

export type GeoJSONLineString = z.infer<typeof GeoJSONLineString>

export const GeoJSONMultiPoint = z.object({
  type: z.literal('MultiPoint'),
  coordinates: z.array(z.tuple([z.number(), z.number()])),
})

export type GeoJSONMultiPoint = z.infer<typeof GeoJSONMultiPoint>

export const GeoJSONMultiLineString = z.object({
  type: z.literal('MultiLineString'),
  coordinates: z.array(z.array(z.tuple([z.number(), z.number()]))),
})

export type GeoJSONMultiLineString = z.infer<typeof GeoJSONMultiLineString>

export const GeoJSONMultiPolygon = z.object({
  type: z.literal('MultiPolygon'),
  coordinates: z.array(z.array(z.array(z.tuple([z.number(), z.number()])))),
})

export type GeoJSONMultiPolygon = z.infer<typeof GeoJSONMultiPolygon>

export const GeoJSONPolygon = z.object({
  type: z.literal('Polygon'),
  coordinates: z.array(z.array(z.tuple([z.number(), z.number()]))),
})

export type GeoJSONPolygon = z.infer<typeof GeoJSONPolygon>

export const GeoJSONGeometry = z.union([
  GeoJSONPoint,
  GeoJSONLineString,
  GeoJSONMultiPoint,
  GeoJSONMultiLineString,
  GeoJSONMultiPolygon,
  GeoJSONPolygon,
])

export type GeoJSONGeometry = z.infer<typeof GeoJSONGeometry>

export const GeoJSONFeature = z.object({
  type: z.literal('Feature'),
  geometry: GeoJSONGeometry,
  properties: z.record(z.string(), z.any()).optional(),
})

export type GeoJSONFeature = z.infer<typeof GeoJSONFeature>

export const GeoJSONFeatureCollection = z.object({
  type: z.literal('FeatureCollection'),
  features: z.array(GeoJSONFeature),
})

export type GeoJSONFeatureCollection = z.infer<typeof GeoJSONFeatureCollection>

// Application-specific GeoJSON types
export const GeoJSONVeglenkeFeature = z.object({
  type: z.literal('Feature'),
  geometry: z.union([GeoJSONPoint, GeoJSONLineString]),
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

export type GeoJSONVeglenkeFeature = z.infer<typeof GeoJSONVeglenkeFeature>

export const GeoJSONVeglenkeCollection = z.object({
  type: z.literal('FeatureCollection'),
  features: z.array(GeoJSONVeglenkeFeature),
})

export type GeoJSONVeglenkeCollection = z.infer<
  typeof GeoJSONVeglenkeCollection
>

// Additional types

export interface BoundingBox {
  minX: number
  minY: number
  maxX: number
  maxY: number
}
