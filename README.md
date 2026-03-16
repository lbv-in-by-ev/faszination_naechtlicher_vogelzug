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
    ShadowStyleProvider.tsx         CSS isolation for shadow DOM (adoptedStyleSheets, Ant Design scoping, portal container)
    SpeciesDropdown.tsx             Species selection with search autocomplete
    SpeciesItem.tsx                 Species list item component
    Timeline.tsx                    Date picker, animation slider, playback controls
    LayersDropdown.tsx              Toggle info layers (light pollution, noise)
    MapLoadingIndicator.tsx         Loading spinner overlay for map tile fetching
    InfoPopup.tsx                   Map info marker popups
    useAvailableSpecies.ts          Hook for fetching species available in current viewport
    map/
      Map.tsx                       MapLibre GL initialization and rendering
      clusterUtils.ts               Per-species Supercluster index creation
      colorUtils.ts                 MapLibre paint expression builder
      mapStyles.ts                  Map layer definitions
      infopoints.ts                 Static info marker data
  lib/
    apollo-client.ts                Apollo Client with cache type policies
    buildAvailableSpeciesQuery.ts   Dynamic aliased query generation
    getDayPolygon.ts                Day/night terminator polygon calculation
    getTranslatedSpeciesName.ts     i18n species name lookup
    isNotNull.ts, hasNonNullProp.ts Type guard utilities
    throttle.ts                     Throttle utility
    usePersistentColors.ts          Stable color assignment per species
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

Run `npm run build` to produce the `dist/` folder. Make sure GraphQL types are available before building. Set `VITE_BASE_URL` in your `.env` file to configure the base path for all built asset references (see [Configuration](#configuration)). The build outputs a single self-contained JS bundle (`zug-birdnet.js`) with a stable filename (no hash). All CSS (Tailwind, Ant Design, MapLibre) is inlined into the JS bundle and injected into the shadow DOM at runtime.

```
dist/
  index.html
  zug-birdnet.js          Complete application bundle (all dependencies included)
  map-overlays/
    lp.png                Light pollution overlay image
```

To embed the web component, include the JS bundle and use the custom element:

```html
<script
  type="module"
  src="https://static.lbv.de/naechtlicher-vogelzug/zug-birdnet.js"
></script>
<zug-birdnet style="height: 600px;"></zug-birdnet>
```

The component uses shadow DOM for full CSS isolation — host page styles won't interfere with the component, and component styles won't leak to the host page. No separate CSS file is needed. The component is self-contained and can be placed anywhere on the page. Third-party CMS integration (e.g., Contao) only needs to include the JS bundle and the custom element tag.

## Configuration

### Environment Variables

A `.env.development` file is included with defaults suitable for local development (`VITE_BASE_URL=/`). To override for production builds, create a `.env` file in the project root (excluded from git):

| Variable        | Default | Description                                                                                                         |
| --------------- | ------- | ------------------------------------------------------------------------------------------------------------------- |
| `VITE_BASE_URL` | `/`     | Base URL for all asset paths. Set to the full deployment URL (e.g., `https://static.lbv.de/naechtlicher-vogelzug/`) |

Example `.env`:

```sh
VITE_BASE_URL=https://static.lbv.de/naechtlicher-vogelzug/
```

When unset, defaults to `/` which works for local development. The base URL is used both by Vite to prefix built asset paths and at runtime via `import.meta.env.BASE_URL` for dynamic asset references (e.g., `lp.png`).

### App Settings

App-level settings are in `src/config.ts`:

| Option                 | Default | Description                                                 |
| ---------------------- | ------- | ----------------------------------------------------------- |
| `SHOW_DEMO_INFOPOINTS` | `true` | Show static info markers on the map (demo/development only) |
