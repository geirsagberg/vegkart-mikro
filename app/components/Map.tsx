import Map from 'ol/Map'
import View from 'ol/View'
import TileLayer from 'ol/layer/Tile'
import VectorLayer from 'ol/layer/Vector'
import { get as getProjection, transform } from 'ol/proj'
import { register } from 'ol/proj/proj4'
import OSM from 'ol/source/OSM'
import VectorSource from 'ol/source/Vector'
import proj4 from 'proj4'
import { useEffect, useRef } from 'react'

// Register EPSG:25833 (ETRS89 / UTM zone 33N)
proj4.defs(
  'EPSG:25833',
  '+proj=utm +zone=33 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs',
)
register(proj4)

// Trondheim coordinates in WGS84 (EPSG:4326)
const TRONDHEIM_COORDS = [10.3951, 63.4305]

const vectorSource = new VectorSource()
const vectorLayer = new VectorLayer({
  source: vectorSource,
})

export function VegkartMap() {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<Map | null>(null)

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return

    const utm33 = getProjection('EPSG:25833')
    if (utm33) {
      utm33.setExtent([-120000, 6400000, 1200000, 8000000])
    }

    const trondheimUTM = transform(TRONDHEIM_COORDS, 'EPSG:4326', 'EPSG:25833')

    const map = new Map({
      target: mapRef.current,
      layers: [
        new TileLayer({
          source: new OSM(),
        }),
        vectorLayer,
      ],
      view: new View({
        center: trondheimUTM,
        zoom: 12,
        projection: 'EPSG:25833',
      }),
    })

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

  return <div ref={mapRef} className="w-full h-full" />
}
