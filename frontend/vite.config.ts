import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1400,
  },
  server: {
    port: 5173,
  },
  test: {
    exclude: ["e2e/**", "node_modules/**", "dist/**"],
  },
});
