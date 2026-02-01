/**
 * Przykładowy test E2E - Zarządzanie taliami
 * Używa fixtures dla autentykowanego użytkownika
 * Zgodnie z planem testów: DECK-01, DECK-02
 */

import { test, expect, testData } from "./fixtures";

test.describe("Deck Management", () => {
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
});
