import { defineConfig } from 'vite'
import tsConfigPaths from 'vite-tsconfig-paths'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import tailwindcss from '@tailwindcss/vite'
import viteReact from '@vitejs/plugin-react'

export default defineConfig({
  server: {
    port: 3000,
  },
  plugins: [
    tsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
    tanstackStart({ 
      customViteReactPlugin: true,
    }),
    viteReact(),
    tailwindcss(),
  ],
  optimizeDeps: {
    exclude: ['@duckdb/node-api', '@duckdb/node-bindings'],
  },
  ssr: {
    noExternal: ['@duckdb/node-api'],
  },
})