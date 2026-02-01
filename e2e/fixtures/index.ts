/**
 * Playwright Fixtures
 * Reusable test data and authenticated contexts
 */

import { test as base, type Page } from "@playwright/test";

interface AuthenticatedPageFixture {
  authenticatedPage: Page;
}

// Extend basic test by adding authenticated user fixture
export const test = base.extend<AuthenticatedPageFixture>({
  // Fixture dla zalogowanego użytkownika
  authenticatedPage: async ({ page }, use) => {
    // Setup: Login before test using credentials from .env.test
    const email = process.env.E2E_USERNAME || "test@example.com";
    const password = process.env.E2E_PASSWORD || "password123";

    await page.goto("/signin", { waitUntil: "networkidle" });
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');

    // Wait for authentication to complete - login redirects to / then we navigate to dashboard
    await page.waitForURL(/.*\/$|.*dashboard/, { timeout: 15000 });

    // If we're on home page, navigate to dashboard
    if (page.url().endsWith("/") || page.url().match(/localhost:\d+\/$/)) {
      await page.goto("/dashboard");
      await page.waitForURL(/.*dashboard/, { timeout: 10000 });
    }

    // Use the authenticated page in test
    // eslint-disable-next-line react-hooks/rules-of-hooks
    await use(page);

    // Cleanup: Logout after test (optional)
    // await page.click('[data-testid="logout-button"]');
  },
});

export { expect } from "@playwright/test";

// Test data fixtures
export const testData = {
  users: {
    valid: {
      email: process.env.E2E_USERNAME || "test@example.com",
      password: process.env.E2E_PASSWORD || "password123",
    },
    invalid: {
      email: "wrong@example.com",
      password: "wrongpassword",
    },
  },
  decks: {
    sample: {
      name: "Sample Deck",
      description: "This is a test deck",
    },
  },
  flashcards: {
    sample: {
      front: "What is React?",
      back: "A JavaScript library for building user interfaces",
    },
  },
};
