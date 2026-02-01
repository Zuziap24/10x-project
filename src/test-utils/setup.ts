/**
 * Vitest Setup File
 * Konfiguracja globalnych mocks, custom matchers i środowiska testowego
 */

import "@testing-library/jest-dom";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeAll, afterAll } from "vitest";
import { server } from "./mocks/server";

// Setup MSW (Mock Service Worker)
beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

afterEach(() => {
  server.resetHandlers();
  cleanup(); // Automatyczne czyszczenie React Testing Library
});

afterAll(() => {
  server.close();
});

// Mock global fetch if needed
global.fetch = global.fetch || (fetch as typeof global.fetch);

// Mock environment variables
process.env.PUBLIC_SUPABASE_URL = "http://localhost:54321";
process.env.PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
process.env.OPENROUTER_API_KEY = "test-openrouter-key";

// Mock window.matchMedia (często używane w komponentach UI)
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {
      // deprecated
    },
    removeListener: () => {
      // deprecated
    },
    addEventListener: () => {
      // no-op
    },
    removeEventListener: () => {
      // no-op
    },
    dispatchEvent: () => true,
  }),
});

// Mock ResizeObserver (używane przez Radix UI ScrollArea i inne komponenty)
class ResizeObserverMock {
  observe() {
    // no-op
  }
  unobserve() {
    // no-op
  }
  disconnect() {
    // no-op
  }
}

global.ResizeObserver = ResizeObserverMock;
