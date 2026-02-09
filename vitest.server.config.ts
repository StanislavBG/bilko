import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@shared": path.resolve(import.meta.dirname, "shared"),
    },
  },
  test: {
    environment: "node",
    include: ["server/**/*.test.ts"],
    testTimeout: 30_000, // Gemini API calls can be slow
  },
});
