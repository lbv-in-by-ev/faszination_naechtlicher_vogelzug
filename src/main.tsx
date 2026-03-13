import r2wc from "@r2wc/react-to-web-component";
import App from "./App.tsx";
import { apolloClient } from "./lib/apollo-client.ts";
import { ApolloProvider } from "@apollo/client/react";
import DatesProvider from "./components/DatesProvider.tsx";
import MapProvider from "./components/MapProvider.tsx";
import { ShadowStyleProvider } from "./components/ShadowStyleProvider.tsx";

// Import CSS as strings for shadow DOM injection (not injected into document.head)
import indexCSS from "./index.css?inline";
import maplibreCSS from "maplibre-gl/dist/maplibre-gl.css?inline";

// Static Ant Design CSS extracted for only the components we use.
// Regenerate with: node scripts/extract-antd-css.mjs
import antdCSS from "../tmp/antd.css?inline";

const cssTexts = [indexCSS, maplibreCSS, `@layer antd {\n${antdCSS}\n}`];

const ZugBirdNet = () => (
  <ShadowStyleProvider cssTexts={cssTexts}>
    <ApolloProvider client={apolloClient}>
      <DatesProvider>
        <MapProvider>
          <App />
        </MapProvider>
      </DatesProvider>
    </ApolloProvider>
  </ShadowStyleProvider>
);

customElements.define("zug-birdnet", r2wc(ZugBirdNet, { shadow: "open" }));
