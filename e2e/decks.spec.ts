/**
 * Przykładowy test E2E - Zarządzanie taliami
 * Używa fixtures dla autentykowanego użytkownika
 * Zgodnie z planem testów: DECK-01, DECK-02
 */

import { test, expect, testData } from "./fixtures";

test.describe("Deck Management", () => {
  test("DECK-01: should create new deck", async ({ authenticatedPage }) => {
    // Użytkownik jest już zalogowany dzięki fixture
    await authenticatedPage.goto("/dashboard");

    // Kliknięcie przycisku tworzenia nowej talii
    await authenticatedPage.click('button:has-text("New Deck")');

    // Wypełnienie formularza
    await authenticatedPage.fill('input[name="name"]', testData.decks.sample.name);
    await authenticatedPage.fill('textarea[name="description"]', testData.decks.sample.description);

    // Zapisanie
    await authenticatedPage.click('button[type="submit"]');

    // Weryfikacja - talia powinna być widoczna na liście
    await expect(authenticatedPage.locator(`text=${testData.decks.sample.name}`)).toBeVisible();

    // Weryfikacja licznika fiszek (powinien być 0)
    const deckCard = authenticatedPage.locator(`[data-testid="deck-${testData.decks.sample.name}"]`);
    await expect(deckCard).toContainText("0 flashcards");
  });

  test("DECK-02: should manually add flashcard to deck", async ({ authenticatedPage }) => {
    await authenticatedPage.goto("/dashboard");

    // Otwarcie pierwszej talii
    await authenticatedPage.locator('[data-testid="deck-card"]').first().click();

    // Otwarcie dialogu dodawania fiszki
    await authenticatedPage.click('button:has-text("Add Flashcard")');

    // Wypełnienie formularza
    await authenticatedPage.fill('[name="front"]', testData.flashcards.sample.front);
    await authenticatedPage.fill('[name="back"]', testData.flashcards.sample.back);

    // Zapisanie
    await authenticatedPage.click('button:has-text("Save")');

    // Weryfikacja - fiszka powinna być widoczna
    await expect(authenticatedPage.locator(`text=${testData.flashcards.sample.front}`)).toBeVisible();

    // Licznik fiszek powinien się zaktualizować
    await authenticatedPage.goto("/dashboard");
    const deckCard = authenticatedPage.locator('[data-testid="deck-card"]').first();
    await expect(deckCard).toContainText("1 flashcard");
  });

  test("should display empty state when no decks exist", async ({ authenticatedPage }) => {
    await authenticatedPage.goto("/dashboard");

    // Jeśli użytkownik nie ma talii, powinien zobaczyć empty state
    const emptyState = authenticatedPage.locator('[data-testid="empty-state"]');
    const hasDeck = await authenticatedPage.locator('[data-testid="deck-card"]').count();

    if (hasDeck === 0) {
      await expect(emptyState).toBeVisible();
      await expect(emptyState).toContainText("No decks yet");
    }
  });
});
