import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Relative base so the built site works from any static host or sub-path.
export default defineConfig({
  base: "./",
  plugins: [react()],
  // sigma + graphology + 28 UI languages make one ~740 KB bundle (≈215 KB gzipped); the map view is split out.
  build: { chunkSizeWarningLimit: 800 },
});
