/**
 * E2E Test: AI Flashcard Generation Flow
 * Testuje pełny scenariusz generowania fiszek z AI
 *
 * Scenariusz:
 * 1. Zaloguj się
 * 2. Otwórz talię z dashboardu
 * 3. Kliknij "Generate with AI"
 * 4. Wpisz tekst (min 1000 znaków)
 * 5. Kliknij "Generuj"
 * 6. Przejrzyj i zapisz fiszki
 */

import { test, expect } from "./fixtures";
import { DashboardPage, DeckDetailsPage, AIGenerationDialog } from "./page-objects";

test.describe("AI Flashcard Generation", () => {
  test("AI-GEN-01: should generate flashcards from source text", async ({ authenticatedPage }) => {
    // Arrange
    const dashboard = new DashboardPage(authenticatedPage);
    const deckDetails = new DeckDetailsPage(authenticatedPage);
    const aiDialog = new AIGenerationDialog(authenticatedPage);

    const sampleText = AIGenerationDialog.generateSampleText(1200);

    // Act - Navigate to dashboard and open first deck
    await dashboard.goto();
    await dashboard.openFirstDeck();

    // Act - Wait for deck to load
    await deckDetails.waitForDeckLoad();

    // Act - Open AI generation dialog
    await deckDetails.openAiGenerationDialog();
    await aiDialog.waitForDialog();

    // Assert - Should be on input step
    expect(await aiDialog.isOnInputStep()).toBe(true);

    // Act - Enter source text
    await aiDialog.enterSourceText(sampleText);

    // Assert - Character count should be valid
    const charCount = await aiDialog.getCharCount();
    expect(charCount).toBeGreaterThanOrEqual(AIGenerationDialog.MIN_CHARS);
    expect(await aiDialog.isGenerateButtonEnabled()).toBe(true);

    // Act - Generate flashcards
    await aiDialog.generate();

    // Assert - Should be on review step with suggestions
    expect(await aiDialog.isOnReviewStep()).toBe(true);
    const suggestionCount = await aiDialog.getSuggestionCount();
    expect(suggestionCount).toBeGreaterThan(0);

    // Act - Save flashcards
    await aiDialog.saveSelectedFlashcards();

    // Assert - Dialog should be closed
    await aiDialog.waitForDialogClosed();
  });

  test("AI-GEN-02: should validate minimum character count", async ({ authenticatedPage }) => {
    // Arrange
    const dashboard = new DashboardPage(authenticatedPage);
    const deckDetails = new DeckDetailsPage(authenticatedPage);
    const aiDialog = new AIGenerationDialog(authenticatedPage);

    const shortText = "This is too short.";

    // Act - Navigate to dashboard and open first deck
    await dashboard.goto();
    await dashboard.openFirstDeck();
    await deckDetails.waitForDeckLoad();

    // Act - Open AI generation dialog
    await deckDetails.openAiGenerationDialog();
    await aiDialog.waitForDialog();

    // Act - Enter short text
    await aiDialog.enterSourceText(shortText);

    // Assert - Generate button should be disabled
    expect(await aiDialog.isGenerateButtonEnabled()).toBe(false);
  });
});

test.describe("Deck Creation Flow", () => {
  test("DECK-CREATE-01: should create new deck from dashboard", async ({ authenticatedPage }) => {
    // Arrange
    const dashboard = new DashboardPage(authenticatedPage);
    const deckName = `Test Deck ${Date.now()}`;
    const deckDescription = "A test deck created by E2E test";

    // Act
    await dashboard.goto();
    await dashboard.createDeck(deckName, deckDescription);

    // Assert
    await dashboard.expectDeckToExist(deckName);
  });
});
