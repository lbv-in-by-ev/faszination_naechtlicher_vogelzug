import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import basicSsl from "@vitejs/plugin-basic-ssl";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, import.meta.dirname, "");
  return {
    base: env.VITE_BASE_URL || "/",
    plugins: [react(), tailwindcss(), basicSsl()],
    build: {
      rollupOptions: {
        output: {
          entryFileNames: "zug-birdnet.js",
          assetFileNames: "assets/[name][extname]",
          // Single-file output: no code splitting, everything in one bundle
          inlineDynamicImports: true,
        },
      },
    },
    test: {
      environment: "jsdom",
      setupFiles: "./src/setupTests.ts",
    },
  };
});
