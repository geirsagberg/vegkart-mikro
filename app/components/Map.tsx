import Map from 'ol/Map'
import View from 'ol/View'
import TileLayer from 'ol/layer/Tile'
import { fromLonLat } from 'ol/proj'
import { register } from 'ol/proj/proj4'
import OSM from 'ol/source/OSM'
import proj4 from 'proj4'
import { useEffect, useRef } from 'react'

// Register EPSG:25833 (ETRS89 / UTM zone 33N)
proj4.defs(
  'EPSG:25833',
  '+proj=utm +zone=33 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs',
)
register(proj4)

export function VegkartMap() {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<Map | null>(null)

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return

    const map = new Map({
      target: mapRef.current,
      layers: [
        new TileLayer({
          source: new OSM(),
        }),
      ],
      view: new View({
        center: fromLonLat([10.75, 59.91]), // Oslo coordinates
        zoom: 10,
        projection: 'EPSG:3857', // Web Mercator
      }),
    })

    mapInstance.current = map

    return () => {
      map.setTarget(undefined)
    }
  }, [])

  return <div ref={mapRef} className="w-screen h-screen" />
}
