import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],

  // dev-сервер (на всякий случай)
  server: {
    host: "0.0.0.0",
    port: 5173,
  },

  // то, что просил Vite в сообщении:
  // "add 'norskkurs.xyz' to preview.allowedHosts"
  preview: {
    host: "0.0.0.0",
    port: 5173,
    allowedHosts: ["norskkurs.xyz", "www.norskkurs.xyz"],
  },
});
