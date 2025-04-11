import { defineConfig } from '@tanstack/react-start/config'
import tsConfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  vite: {
    plugins: [
      tsConfigPaths({
        projects: ['./tsconfig.json'],
      }),
    ],
    optimizeDeps: {
      exclude: ['duckdb', '@mapbox/node-pre-gyp'],
    },
    ssr: {
      noExternal: ['duckdb', '@mapbox/node-pre-gyp'],
    },
  },
})
