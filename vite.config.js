import { fileURLToPath } from "node:url";
import path from "node:path";
import { defineConfig } from "vite";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: ".",
  base: "./",
  publicDir: false,
  resolve: {
    alias: {
      "@gameblocks": path.resolve(projectRoot, "src/gameblocks"),
    },
  },
  server: {
    host: "127.0.0.1",
    port: 5173,
    fs: {
      allow: [projectRoot],
    },
  },
  build: {
    outDir: path.resolve(projectRoot, "dist"),
    emptyOutDir: true,
    chunkSizeWarningLimit: 2600,
    rollupOptions: {
      input: {
        index: path.resolve(projectRoot, "index.html"),
        blockRelay: path.resolve(projectRoot, "experiments/block-relay/index.html"),
        contraptionLab: path.resolve(projectRoot, "experiments/contraption-lab/index.html"),
        skyCourier: path.resolve(projectRoot, "experiments/sky-courier/index.html"),
        fantasyAdvance: path.resolve(projectRoot, "experiments/fantasy-advance/index.html"),
      },
    },
  },
});
