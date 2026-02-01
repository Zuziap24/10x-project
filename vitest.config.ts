import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    // Środowisko DOM dla testów komponentów React
    environment: "jsdom",

    // Globalne zmienne testowe (describe, it, expect)
    globals: true,

    // Setup file z custom matchersami i global mocks
    setupFiles: ["./src/test-utils/setup.ts"],

    // Include patterns
    include: ["src/**/*.{test,spec}.{js,ts,jsx,tsx}"],

    // Exclude patterns
    exclude: ["node_modules", "dist", "e2e", ".astro"],

    // Coverage configuration
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      include: ["src/**/*.{js,ts,jsx,tsx}"],
      exclude: [
        "src/**/*.d.ts",
        "src/**/*.config.{js,ts}",
        "src/test-utils/**",
        "src/**/__tests__/**",
        "src/**/*.test.{js,ts,jsx,tsx}",
        "src/**/*.spec.{js,ts,jsx,tsx}",
        "src/env.d.ts",
      ],
      // Progi pokrycia (zgodnie z planem testów: min 80% dla src/lib i src/api)
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },

    // Mockowanie automatyczne
    mockReset: true,
    clearMocks: true,
    restoreMocks: true,
  },

  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
      "@components": resolve(__dirname, "./src/components"),
      "@lib": resolve(__dirname, "./src/lib"),
      "@db": resolve(__dirname, "./src/db"),
    },
  },
});
