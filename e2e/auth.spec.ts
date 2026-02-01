/**
 * Przykładowy test E2E - Autentykacja
 * Zgodnie z planem testów: AUTH-01, AUTH-03, AUTH-04
 */

import { test, expect } from "@playwright/test";

// Load credentials from environment
const validEmail = process.env.E2E_USERNAME || "test@example.com";
const validPassword = process.env.E2E_PASSWORD || "password123";

test.describe("Authentication Flow", () => {
  test("AUTH-04: should redirect to signin when accessing dashboard without login", async ({ page }) => {
    // Próba dostępu do chronionej strony
    await page.goto("/dashboard");

    // Middleware powinien przekierować do /signin
    await expect(page).toHaveURL(/.*signin/);
  });

  test("AUTH-03: should login and access dashboard", async ({ page }) => {
    // Listen to network requests for debugging
    const loginRequests: { status: number; body?: unknown }[] = [];
    page.on("response", (response) => {
      if (response.url().includes("/api/auth/signin")) {
        const status = response.status();
        loginRequests.push({ status });
        console.log("Login API response status:", status);
      }
    });

    // Przejście na stronę logowania
    await page.goto("/signin", { waitUntil: "networkidle" });

    // Wait for the form to be visible and interactive
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    const submitButton = page.locator('button[type="submit"]');

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(submitButton).toBeEnabled();

    console.log("E2E_USERNAME:", validEmail);
    console.log("E2E_PASSWORD:", validPassword);

    // Wypełnienie formularza
    await emailInput.fill(validEmail);
    await passwordInput.fill(validPassword);

    // Wait for React to hydrate (give it a bit more time)
    await page.waitForTimeout(1000);

    // Kliknięcie przycisku logowania
    await submitButton.click();

    // Wait for navigation or error message
    try {
      await page.waitForURL(/.*dashboard|.*\/$/, { timeout: 10000 });
      const currentURL = page.url();
      expect(currentURL).toMatch(/dashboard|\/$/);
    } catch (error) {
      // If navigation didn't happen, check what happened
      console.log("Navigation timeout. Current URL:", page.url());
      console.log("Login requests:", loginRequests);

      // Check if there's an error message on the page
      const alertElement = page.locator('[role="alert"]');
      if (await alertElement.isVisible()) {
        const errorText = await alertElement.textContent();
        console.log("Error message on page:", errorText);
      }

      throw error;
    }
  });
  test("should display error message for invalid credentials", async ({ page }) => {
    await page.goto("/signin");

    await page.fill('input[type="email"]', "wrong@example.com");
    await page.fill('input[type="password"]', "wrongpassword");

    await page.click('button[type="submit"]');

    // Oczekiwanie na komunikat o błędzie
    await expect(page.locator('[role="alert"]')).toBeVisible();
  });
});

test.describe("Registration Flow", () => {
  test("AUTH-01: should register new user with correct data", async ({ page }) => {
    await page.goto("/register");

    // Wypełnienie formularza rejestracji
    await page.fill('input[name="email"]', `test${Date.now()}@example.com`);
    await page.fill('input[name="password"]', "password123");
    await page.fill('input[name="confirmPassword"]', "password123");

    await page.click('button[type="submit"]');

    // Oczekiwanie na sukces (np. przekierowanie lub komunikat)
    await expect(page).toHaveURL(/.*signin|.*dashboard/);
  });

  test("AUTH-02: should show error when registering with existing email", async ({ page }) => {
    await page.goto("/register");

    // Używamy emaila, który już istnieje
    await page.fill('input[name="email"]', "existing@example.com");
    await page.fill('input[name="password"]', "password123");
    await page.fill('input[name="confirmPassword"]', "password123");

    await page.click('button[type="submit"]');

    // Oczekiwanie na komunikat o błędzie
    await expect(page.locator('[role="alert"]')).toBeVisible();
  });
});
