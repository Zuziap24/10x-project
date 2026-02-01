/**
 * Przykładowy test E2E - Zarządzanie taliami
 * Używa fixtures dla autentykowanego użytkownika
 * Zgodnie z planem testów: DECK-01, DECK-02
 */

import { test, expect, testData } from "./fixtures";

test.describe("Deck Management", () => {
  test("DECK-02: should manually add flashcard to deck", async ({ authenticatedPage }) => {
    await authenticatedPage.goto("/dashboard");

    // Arrange - Najpierw utwórz talię jeśli nie istnieje
    const deckCard = authenticatedPage.locator('[data-testid="deck-card"]').first();
    const hasDeck = await deckCard.count();

    if (hasDeck === 0) {
      // Utwórz nową talię
      await authenticatedPage.click('button:has-text("New Deck"), button:has-text("Create Your First Deck")');
      await authenticatedPage.fill('input[name="name"]', "Test Deck");
      await authenticatedPage.fill('textarea[name="description"]', "Test deck for E2E");
      await authenticatedPage.click('button[type="submit"]');
      // Poczekaj aż talia się pojawi
      await expect(authenticatedPage.locator('[data-testid="deck-card"]').first()).toBeVisible();
    }

    // Act - Otwarcie pierwszej talii
    await authenticatedPage.locator('[data-testid="deck-card"]').first().click();

    // Otwarcie dialogu dodawania fiszki
    await authenticatedPage.click('button:has-text("Add Flashcard")');

    // Wypełnienie formularza
    await authenticatedPage.fill('[name="front"]', testData.flashcards.sample.front);
    await authenticatedPage.fill('[name="back"]', testData.flashcards.sample.back);

    // Zapisanie
    await authenticatedPage.click('button:has-text("Save")');

    // Assert - Weryfikacja - fiszka powinna być widoczna
    await expect(authenticatedPage.locator(`text=${testData.flashcards.sample.front}`)).toBeVisible();
  });
});
