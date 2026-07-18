import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
    // PGlite (in-process Postgres WASM) can take >10s to boot in beforeAll
    // when many workers cold-start it behind an invalidated Vite cache.
    hookTimeout: 30_000,
  },
});
