import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1400,
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL("./index.html", import.meta.url)),
        en: fileURLToPath(new URL("./en/index.html", import.meta.url)),
      },
    },
  },
  server: {
    port: 5173,
  },
  test: {
    exclude: ["e2e/**", "node_modules/**", "dist/**"],
  },
});
