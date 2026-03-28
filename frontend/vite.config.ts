import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  cacheDir: ".vite-cache",
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "router-vendor": ["react-router-dom"],
          "i18n-vendor": ["i18next", "react-i18next"],
          "sentry-vendor": ["@sentry/react"],
        },
      },
    },
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
  },
  preview: {
    host: "0.0.0.0",
    port: 5173,
    allowedHosts: ["norskkurs.xyz", "www.norskkurs.xyz"],
  },
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    globals: true,
  },
});
