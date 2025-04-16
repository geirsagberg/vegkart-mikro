import Map from 'ol/Map'
import Overlay from 'ol/Overlay'
import View from 'ol/View'
import { pointerMove } from 'ol/events/condition'
import { createEmpty, extend } from 'ol/extent'
import { GeoJSON } from 'ol/format'
import Select from 'ol/interaction/Select'
import TileLayer from 'ol/layer/Tile'
import VectorLayer from 'ol/layer/Vector'
import { get as getProjection, transform } from 'ol/proj'
import { register } from 'ol/proj/proj4'
import Cluster from 'ol/source/Cluster'
import OSM from 'ol/source/OSM'
import VectorSource from 'ol/source/Vector'
import { Circle, Fill, Stroke, Style, Text } from 'ol/style'
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
const TRONDHEIM_COORDS = [10.3932, 63.4305]

const DEBOUNCE_TIME = 100

export interface MapRef {
  drawVeglenkerInView: () => Promise<void>
}

// Debounce function
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

export const VegkartMap = forwardRef<MapRef>((_, ref) => {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<Map | null>(null)
  const lineStringSource = useRef(new VectorSource())
  const pointSource = useRef(new VectorSource())
  const clusterSource = useRef(
    new Cluster({
      source: pointSource.current,
      distance: 40,
    }),
  )
  const popupRef = useRef<HTMLDivElement>(null)
  const popupOverlay = useRef<Overlay | null>(null)
  const clusterLayer = useRef(
    new VectorLayer({
      source: clusterSource.current,
      style: (feature) => {
        const size = feature.get('features')?.length
        return new Style({
          image: new Circle({
            radius: 10,
            fill: new Fill({ color: '#ff0000' }),
          }),
          text: new Text({
            text: size.toString(),
            fill: new Fill({ color: '#fff' }),
          }),
        })
      },
    }),
  )
  const featureLayer = useRef(
    new VectorLayer({
      source: lineStringSource.current,
      style: (feature) => {
        const isPoint = feature.get('isPoint')
        if (isPoint) {
          return new Style({
            image: new Circle({
              radius: 5,
              fill: new Fill({ color: '#ff0000' }),
            }),
          })
        }
        return new Style({
          stroke: new Stroke({
            color: '#ff0000',
            width: 2,
          }),
        })
      },
    }),
  )

  useImperativeHandle(ref, () => ({
    drawVeglenkerInView: async () => {
      if (!mapInstance.current) return

      const map = mapInstance.current
      const extent = map.getView().calculateExtent()
      if (!extent) return

      try {
        const result = await queryVeglenker({
          data: {
            minX: extent[0]!,
            minY: extent[1]!,
            maxX: extent[2]!,
            maxY: extent[3]!,
          },
        })
        lineStringSource.current.clear()
        pointSource.current.clear()
        const features = new GeoJSON().readFeatures(result)
        if (features.length > 0 && features[0]?.get('isPoint')) {
          pointSource.current.addFeatures(features)
        } else {
          lineStringSource.current.addFeatures(features)
        }
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
      TRONDHEIM_COORDS,
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
        clusterLayer.current,
        featureLayer.current,
      ],
      view: new View({
        center: kristiansandUTM,
        zoom: 8,
        projection: 'EPSG:25833',
      }),
      overlays: [popupOverlay.current],
    })

    // Redraw features after zooming with debounce
    const debouncedRedraw = debounce(() => {
      if (mapRef.current) {
        const mapRefObj = ref as React.RefObject<MapRef>
        mapRefObj.current?.drawVeglenkerInView()
      }
    }, DEBOUNCE_TIME)

    map.getView().on('change:resolution', debouncedRedraw)
    map.getView().on('change:center', debouncedRedraw)

    // Add click interaction for clusters
    map.on('click', (e) => {
      const feature = map.forEachFeatureAtPixel(e.pixel, (f) => f)
      if (feature) {
        const size = feature.get('features')?.length
        if (size > 1) {
          // Get all features in the cluster
          const features = feature.get('features')
          // Create an extent that contains all features
          const extent = features.reduce((extent: number[], f: any) => {
            return extend(extent, f.getGeometry().getExtent())
          }, createEmpty())

          // Add some padding to the extent
          const padding = 100 // meters
          extent[0] -= padding
          extent[1] -= padding
          extent[2] += padding
          extent[3] += padding

          // Zoom to the extent
          map.getView().fit(extent, {
            duration: 500,
            padding: [50, 50, 50, 50],
          })
          popupOverlay.current!.setPosition(undefined)
          return
        }
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
        popupOverlay.current!.setPosition(e.coordinate)
      } else {
        popupOverlay.current!.setPosition(undefined)
      }
    })

    // Add hover interaction
    const select = new Select({
      condition: pointerMove,
      layers: [featureLayer.current],
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
