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
    // Przejście na stronę logowania
    await page.goto("/signin", { waitUntil: "networkidle" });

    // Wait for the form to be visible and interactive
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    const submitButton = page.locator('button[type="submit"]');

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(submitButton).toBeEnabled();

    // Wypełnienie formularza
    await emailInput.fill(validEmail);
    await passwordInput.fill(validPassword);

    // Wait for React to hydrate
    await page.waitForTimeout(500);

    // Kliknięcie przycisku logowania
    await submitButton.click();

    // Wait for navigation - after successful login redirects to / (home)
    await page.waitForURL(/.*\/$|.*dashboard/, { timeout: 15000 });
    const currentURL = page.url();
    expect(currentURL).toMatch(/\/$|dashboard/);
  });

  test("should display error message for invalid credentials", async ({ page }) => {
    await page.goto("/signin", { waitUntil: "networkidle" });

    await page.fill('input[type="email"]', "wrong@example.com");
    await page.fill('input[type="password"]', "wrongpassword");

    await page.click('button[type="submit"]');

    // Oczekiwanie na komunikat o błędzie - wait for API response first
    await expect(page.locator('[role="alert"]')).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Registration Flow", () => {
  test("AUTH-01: should register new user with correct data", async ({ page }) => {
    await page.goto("/register", { waitUntil: "networkidle" });

    // Wypełnienie formularza rejestracji
    await page.fill('input[name="email"]', `test${Date.now()}@example.com`);
    await page.fill('input[name="password"]', "Password123!");
    await page.fill('input[name="confirmPassword"]', "Password123!");

    await page.click('button[type="submit"]');

    // After successful registration, app redirects to / (home page) with auto-login
    await expect(page).toHaveURL(/.*\/$|.*signin|.*dashboard/, { timeout: 10000 });
  });

  test("AUTH-02: should show error when registering with existing email", async ({ page }) => {
    await page.goto("/register", { waitUntil: "networkidle" });

    // Używamy emaila użytkownika testowego który istnieje
    await page.fill('input[name="email"]', validEmail);
    await page.fill('input[name="password"]', "Password123!");
    await page.fill('input[name="confirmPassword"]', "Password123!");

    await page.click('button[type="submit"]');

    // Oczekiwanie na komunikat o błędzie
    await expect(page.locator('[role="alert"]')).toBeVisible({ timeout: 10000 });
  });
});
