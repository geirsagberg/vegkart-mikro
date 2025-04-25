# vegkart-mikro

Dette er et proof-of-concept av en full-stack TypeScript-app for å hente og visualisere uberiket data fra NVDB.

Teknologier:

- [DuckDB](https://duckdb.org) - Embedded analytical database
- [React](https://react.dev) - UI framework
- [OpenLayers](https://openlayers.org) - Map library
- [TanStack Start](https://tanstack.com/start) - React full-stack framework
- [Tailwind CSS](https://tailwindcss.com) - CSS framework
- [DaisyUI](https://daisyui.com) - Tailwind CSS component library
- [Bun](https://bun.sh) - JavaScript runtime and package manager

Data hentes fra [NVDB sitt akseptansetest-miljø](https://nvdbapiles.test.atlas.vegvesen.no).

# Kom i gang

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run dev
```

This project was created using `bun init` in bun v1.2.7. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.
