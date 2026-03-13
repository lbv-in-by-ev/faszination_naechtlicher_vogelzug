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
          entryFileNames: "assets/[name].js",
          chunkFileNames: "assets/[name].js",
          assetFileNames: "assets/[name][extname]",
          manualChunks: {
            maplibre: ["maplibre-gl"],
            antd: ["antd", "@ant-design/icons"],
            apollo: ["@apollo/client", "graphql"],
          },
        },
      },
    },
    test: {
      environment: "jsdom",
      setupFiles: "./src/setupTests.ts",
    },
  };
});
