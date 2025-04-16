import { DuckDBInstance } from '@duckdb/node-api'
import { createServerFn } from '@tanstack/react-start'
import axios from 'axios'
import SuperJSON from 'superjson'
import { VegnettApiFp } from '../lib/nvdb/api'

const vegnettApi = VegnettApiFp({
  basePath: 'https://nvdbapiles.atlas.vegvesen.no/uberiket',
  isJsonMime: (mime: string) => mime === 'application/json',
})

// function isoToDuckDBDate(isoDate?: string | null): DuckDBDateValue {
//   if (!isoDate) return DuckDBDateValue.Epoch

//   const date = new Date(isoDate)
//   const parts: DateParts = {
//     year: date.getFullYear(),
//     month: date.getMonth() + 1, // JS months are 0-based
//     day: date.getDate(),
//   }
//   return dateValue(parts)
// }

export const loadVeglenkesekvenser = createServerFn({ method: 'POST' }).handler(
  async () => {
    const instance = await DuckDBInstance.fromCache('spatial.db')
    const connection = await instance.connect()

    try {
      const apiCall = await vegnettApi.hentVeglenkesekvenser()
      const response = await apiCall(axios)
      const veglenkesekvenser = response.data.veglenkesekvenser

      // Create appender for batch inserts
      const appender = await connection.createAppender('veglenker')

      for (const sekvens of veglenkesekvenser) {
        for (const lenke of sekvens.veglenker) {
          // Map porter by id
          const porter = new Map(
            sekvens.porter.map((port) => [port.nodeId, port]),
          )

          // Append row using appender
          appender.appendInteger(sekvens.id)
          appender.appendInteger(lenke.nummer)
          appender.appendDouble(porter.get(lenke.startport)?.posisjon || 0)
          appender.appendDouble(porter.get(lenke.sluttport)?.posisjon || 1)
          appender.appendVarchar(lenke.gyldighetsperiode.startdato)
          if (lenke.gyldighetsperiode.sluttdato) {
            appender.appendVarchar(lenke.gyldighetsperiode.sluttdato)
          } else {
            appender.appendNull()
          }
          appender.appendVarchar(lenke.geometri.wkt)
          appender.appendInteger(lenke.kommune)
          appender.appendDouble(lenke.lengde)
          appender.endRow()
        }
      }

      // Flush and close the appender
      appender.flushSync()
      appender.closeSync()

      await connection.run(
        'CREATE INDEX idx_veglenker_wkt ON veglenker USING GIST (geometri)',
      )

      return { success: true, count: veglenkesekvenser.length }
    } finally {
      // No need to disconnect - DuckDB will handle cleanup
    }
  },
)

export const fetchVeglenkesekvenser = createServerFn({ method: 'GET' }).handler(
  async () => {
    const instance = await DuckDBInstance.fromCache('spatial.db')
    const connection = await instance.connect()

    const result = await connection.runAndReadAll(`from veglenker select *`)

    return SuperJSON.stringify(result.getRowsJS())
  },
)
