# Faszination Nächtlicher Vogelzug

A web component for visualizing migratory bird detections on an interactive map. Built with React, MapLibre GL, and the BirdWeather GraphQL API. Designed for embedding into CMS platforms like Contao.

## Tech Stack

- **React 19** + **TypeScript** (Vite)
- **MapLibre GL** -- WebGL map rendering (Stadia Maps dark theme)
- **Supercluster** -- per-species spatial clustering
- **Apollo Client 4** -- GraphQL data fetching with caching
- **GraphQL Code Generation** -- type-safe queries from BirdWeather schema
- **SunCalc** -- astronomical day/night calculations
- **Tailwind CSS 4** + **Ant Design 6** -- UI
- **Vitest** -- testing

## Features

- **Interactive map** with color-coded detection clusters per species
- **Timeline animation** with autoplay, step controls, and throttled slider
- **Night-only mode** that compresses inactive daytime hours using SunCalc sunrise/sunset calculations
- **Day/night overlay** showing the terminator (day/night boundary) as a real-time GeoJSON polygon
- **Species search** with autocomplete and availability checking per map viewport
- **Supplementary layers** (light pollution, noise mapping via WMS)
- **Web component** (`<zug-birdnet>`) for CMS embedding without routing

## Project Structure

```
src/
  main.tsx                         Web component registration
  App.tsx                          Root component, species selection state
  api/
    fragments.ts                   GraphQL fragments (DetectionItem, SpeciesItem)
    queries.ts                     GraphQL queries (detections, species, search)
    useDetections.ts               Detection fetch hook with prefetching
  components/
    DatesProvider.tsx               Time state context (date range, animation, night mode)
    MapProvider.tsx                  MapLibre GL instance context
    SpeciesDropdown.tsx             Species selection with search autocomplete
    Timeline.tsx                    Date picker, animation slider, playback controls
    LayersDropdown.tsx              Toggle info layers (light pollution, noise)
    InfoPopup.tsx                   Map info marker popups
    map/
      Map.tsx                       MapLibre GL initialization and rendering
      clusterUtils.ts               Per-species Supercluster index creation
      colorUtils.ts                 MapLibre paint expression builder
      mapStyles.ts                  Map layer definitions
      usePersistentColors.ts        Stable color assignment per species
      infopoints.ts                 Static info marker data
  lib/
    apollo-client.ts                Apollo Client with cache type policies
    buildAvailableSpeciesQuery.ts   Dynamic aliased query generation
    getDayPolygon.ts                Day/night terminator polygon calculation
    getTranslatedSpeciesName.ts     i18n species name lookup
    isNotNull.ts, hasNonNullProp.ts Type guard utilities
    throttle.ts                     Throttle utility
  gql/                              Auto-generated GraphQL types (do not edit)
```

## Architecture

Three React context providers compose the application:

```
ApolloProvider        GraphQL caching and data fetching
  DatesProvider       Date range, animation state, night-only time segments
    MapProvider       MapLibre GL map instance
      App             Species selection, filtered detections, color mapping
```

**Data flow:** Apollo fetches detections for the current bounding box and date range. Detections are filtered client-side by the visualisation time window (controlled by the timeline slider). Each species gets its own Supercluster index for independent color-coded clustering. Cluster features are rendered via MapLibre GL layers with dynamic `match` paint expressions.

**GraphQL:** Queries and fragments are defined in `src/api/` and typed via `@graphql-codegen/client-preset`. Run `npm run codegen` after schema changes to regenerate `src/gql/`.

## Development

```sh
npm install
npm run dev
```

The dev server uses a self-signed SSL certificate via `@vitejs/plugin-basic-ssl`. Accept the browser warning on first visit.

Other commands:

```sh
npm run build       # Production build
npm run test        # Run tests
npm run lint        # ESLint
npm run codegen     # Regenerate GraphQL types
```

## Build & Integration

Run `npm run build` to produce the `dist/` folder. Make sure GraphQL types are available before building. The build outputs stable filenames (no hashes) and splits vendor dependencies into separate chunks for caching:

```
dist/
  index.html
  assets/
    index.css       App styles (Tailwind + Ant Design)
    index.js        Application code, React, Supercluster, dayjs, SunCalc
    maplibre.js     MapLibre GL
    antd.js         Ant Design + icons
    apollo.js       Apollo Client + graphql
```

Only `index.js` changes on application updates. Vendor chunks are cache-stable between deploys.

To embed the web component, include the built CSS and JS, then use the custom element:

```html
<link rel="stylesheet" href="/assets/index.css" />
<script type="module" src="/assets/index.js"></script>
<zug-birdnet></zug-birdnet>
```

No routing. The component is self-contained and can be placed anywhere on the page. Third-party CMS integration (e.g., Contao) only needs to include the built assets and the custom element tag.

## Configuration

App-level settings are in `src/config.ts`:

| Option                 | Default | Description                                                 |
| ---------------------- | ------- | ----------------------------------------------------------- |
| `SHOW_DEMO_INFOPOINTS` | `false` | Show static info markers on the map (demo/development only) |
