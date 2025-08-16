# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `bun run dev` - Start development server on port 3000
- `bun run build` - Build for production
- `bun run start` - Preview production build
- `bun run generate:nvdb` - Generate NVDB API client from OpenAPI spec
- `bun run debug` - Start dev server with debugging enabled

## Architecture Overview

This is a full-stack TypeScript application for visualizing Norwegian road network data (NVDB) with these key components:

### Core Stack
- **TanStack Start** - React full-stack framework with Vite build system
- **DuckDB** - Embedded analytical database with spatial extensions
- **OpenLayers** - Map visualization library
- **React 19** with TypeScript
- **Tailwind CSS + DaisyUI** for styling

### Data Flow Architecture
1. **Data Ingestion**: NVDB API streaming data → DuckDB with spatial storage
2. **Server Functions**: TanStack Start server functions query DuckDB
3. **Client Rendering**: OpenLayers map displays GeoJSON features from queries

### Project Structure
- `src/db/` - DuckDB connection, schema, and data sync logic
- `src/components/Map.tsx` - OpenLayers map component with UTM33 projection
- `src/routes/` - TanStack Start file-based routing
- `scripts/generate-nvdb-client.ts` - OpenAPI client generation for NVDB API

### Critical Configuration
- **Coordinate System**: All geometry stored and processed in UTM33 (EPSG:25833)
- **DuckDB Extensions**: Spatial and httpfs extensions required
- **Vite Config**: Special DuckDB native binding optimization for dev server
- **Data Source**: NVDB test environment API streaming endpoint

### Key Implementation Details

#### Database Schema
- `veglenker` table stores road network segments with spatial geometry
- `sync_state` table tracks incremental data synchronization progress
- Uses composite primary keys (veglenkesekvensId, veglenkenummer)

#### Spatial Data Handling
- Geometry stored as DuckDB GEOMETRY type in UTM33
- GeoJSON format used for client-server communication
- OpenLayers configured with UTM33 projection via proj4
- Feature clustering for performance with large datasets

#### Data Synchronization
- Incremental sync from NVDB streaming API using batch processing
- State management tracks last processed IDs for resumable sync
- Error handling for completion detection via specific error patterns

#### Performance Considerations
- Dynamic feature simplification (points vs linestrings) based on zoom level
- Spatial extent-based querying to limit data transfer
- Feature count thresholds trigger simplified rendering

## Code Style Rules
- No semicolons in TypeScript/JavaScript
- Use Zod schemas for type validation
- Prefer server functions over direct database access from client
- Handle null/undefined values in JSON data gracefully