import { Feature } from 'ol'
import Map from 'ol/Map'
import Overlay from 'ol/Overlay'
import View from 'ol/View'
import { pointerMove } from 'ol/events/condition'
import { LineString } from 'ol/geom'
import Select from 'ol/interaction/Select'
import TileLayer from 'ol/layer/Tile'
import VectorLayer from 'ol/layer/Vector'
import { get as getProjection, transform } from 'ol/proj'
import { register } from 'ol/proj/proj4'
import OSM from 'ol/source/OSM'
import VectorSource from 'ol/source/Vector'
import { Stroke, Style } from 'ol/style'
import proj4 from 'proj4'
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import { queryVeglenker } from '../db/queries'

// Register EPSG:25833 (ETRS89 / UTM zone 33N)
proj4.defs(
  'EPSG:25833',
  '+proj=utm +zone=33 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs',
)
register(proj4)

// Kristiansand coordinates in WGS84 (EPSG:4326)
const KRISTIANSAND_COORDS = [8.0187, 58.1464]

export interface MapRef {
  drawVeglenkerInView: () => Promise<void>
}

export const VegkartMap = forwardRef<MapRef>((_, ref) => {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<Map | null>(null)
  const vectorSource = useRef(new VectorSource())
  const popupRef = useRef<HTMLDivElement>(null)
  const popupOverlay = useRef<Overlay | null>(null)
  const vectorLayer = useRef(
    new VectorLayer({
      source: vectorSource.current,
      style: new Style({
        stroke: new Stroke({
          color: '#ff0000',
          width: 2,
        }),
      }),
    }),
  )

  useImperativeHandle(ref, () => ({
    drawVeglenkerInView: async () => {
      if (!mapInstance.current) return

      const map = mapInstance.current
      const extent = map.getView().calculateExtent()
      if (!extent) return

      console.log('extent', extent)

      try {
        const result = await queryVeglenker({
          data: {
            minX: extent[0]!,
            minY: extent[1]!,
            maxX: extent[2]!,
            maxY: extent[3]!,
          },
        })
        vectorSource.current.clear()

        console.log('result', result)

        result.features.forEach((feature) => {
          if (feature.geometry) {
            const olFeature = new Feature({
              geometry: new LineString(feature.geometry.coordinates),
              ...feature.properties,
            })
            vectorSource.current.addFeature(olFeature)
          }
        })
      } catch (error) {
        console.error('Error loading veglenker:', error)
        throw error
      }
    },
  }))

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return

    const utm33 = getProjection('EPSG:25833')
    if (utm33) {
      utm33.setExtent([-120000, 6400000, 1200000, 8000000])
    }

    const kristiansandUTM = transform(
      KRISTIANSAND_COORDS,
      'EPSG:4326',
      'EPSG:25833',
    )

    // Create popup overlay
    popupOverlay.current = new Overlay({
      element: popupRef.current!,
      positioning: 'top-right',
      offset: [32, -32],
      autoPan: true,
    })

    const map = new Map({
      target: mapRef.current,
      layers: [
        new TileLayer({
          source: new OSM(),
        }),
        vectorLayer.current,
      ],
      view: new View({
        center: kristiansandUTM,
        zoom: 8,
        projection: 'EPSG:25833',
      }),
      overlays: [popupOverlay.current],
    })

    // Add hover interaction
    const select = new Select({
      condition: pointerMove,
      layers: [vectorLayer.current],
    })

    select.on('select', (e) => {
      const feature = e.selected[0]
      if (feature) {
        const properties = feature.getProperties()
        const popupContent = `
          <div class="p-2 bg-white rounded shadow">
            <div class="font-bold mb-2">Veglenke ${properties.veglenkesekvensId}-${properties.veglenkenummer}</div>
            <table class="text-sm">
              <tr>
                <td class="pr-2 font-medium">Lengde:</td>
                <td>${properties.lengde.toFixed(1)}m</td>
              </tr>
              <tr>
                <td class="pr-2 font-medium">Kommune:</td>
                <td>${properties.kommune}</td>
              </tr>
              <tr>
                <td class="pr-2 font-medium">Startposisjon:</td>
                <td>${properties.startposisjon}</td>
              </tr>
              <tr>
                <td class="pr-2 font-medium">Sluttposisjon:</td>
                <td>${properties.sluttposisjon}</td>
              </tr>
              <tr>
                <td class="pr-2 font-medium">Startdato:</td>
                <td>${properties.startdato}</td>
              </tr>
              ${
                properties.sluttdato
                  ? `
                <tr>
                  <td class="pr-2 font-medium">Sluttdato:</td>
                  <td>${properties.sluttdato}</td>
                </tr>
              `
                  : ''
              }
            </table>
          </div>
        `
        popupRef.current!.innerHTML = popupContent
        popupOverlay.current!.setPosition(e.mapBrowserEvent.coordinate)
      } else {
        popupOverlay.current!.setPosition(undefined)
      }
    })

    map.addInteraction(select)

    mapInstance.current = map

    // Handle resize
    const observer = new ResizeObserver(() => {
      map.updateSize()
    })
    observer.observe(mapRef.current)

    return () => {
      observer.disconnect()
      map.setTarget(undefined)
      mapInstance.current = null
    }
  }, [])

  // Update map size when container changes
  useEffect(() => {
    const map = mapInstance.current
    if (map) {
      requestAnimationFrame(() => {
        map.updateSize()
      })
    }
  })

  return (
    <>
      <div ref={mapRef} className="w-full h-full" />
      <div ref={popupRef} className="absolute z-10 pointer-events-none" />
    </>
  )
})
