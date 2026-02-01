/**
 * Page Object Model: Deck Details Page
 * Handles deck viewing and flashcard management
 */

import { type Page, type Locator, expect } from "@playwright/test";

export class DeckDetailsPage {
  readonly page: Page;

  // Header Locators
  readonly deckHeader: Locator;
  readonly deckTitle: Locator;
  readonly backToDashboardLink: Locator;
  readonly generateAiButton: Locator;
  readonly addCardButton: Locator;
  readonly studyButton: Locator;

  // Flashcard List
  readonly flashcardList: Locator;
  readonly flashcardItems: Locator;
  readonly loadMoreButton: Locator;

  constructor(page: Page) {
    this.page = page;

    // Header elements
    this.deckHeader = page.getByTestId("deck-header");
    this.deckTitle = page.getByTestId("deck-title");
    this.backToDashboardLink = page.getByTestId("back-to-dashboard-link");
    this.generateAiButton = page.getByTestId("generate-ai-button");
    this.addCardButton = page.getByRole("button", { name: "Add Card" });
    this.studyButton = page.getByRole("link", { name: /Study/ });

    // Flashcard list elements
    this.flashcardList = page.getByTestId("flashcard-list");
    this.flashcardItems = page.getByTestId("flashcard-item");
    this.loadMoreButton = page.getByRole("button", { name: "Load More" });
  }

  /**
   * Navigate to deck details page by ID
   */
  async goto(deckId: string): Promise<void> {
    await this.page.goto(`/decks/${deckId}`);
    await this.page.waitForLoadState("networkidle");
  }

  /**
   * Wait for deck to load
   */
  async waitForDeckLoad(): Promise<void> {
    await expect(this.deckHeader).toBeVisible();
    await expect(this.deckTitle).toBeVisible();
  }

  /**
   * Get deck title text
   */
  async getDeckTitle(): Promise<string> {
    return (await this.deckTitle.textContent()) ?? "";
  }

  /**
   * Open AI Generation dialog
   */
  async openAiGenerationDialog(): Promise<void> {
    await this.generateAiButton.click();
  }

  /**
   * Open manual flashcard creation dialog
   */
  async openAddCardDialog(): Promise<void> {
    await this.addCardButton.click();
  }

  /**
   * Navigate back to dashboard
   */
  async goBackToDashboard(): Promise<void> {
    await this.backToDashboardLink.click();
    await this.page.waitForURL(/.*dashboard/);
  }

  /**
   * Start study session
   */
  async startStudy(): Promise<void> {
    await this.studyButton.click();
    await this.page.waitForURL(/.*\/study/);
  }

  /**
   * Get flashcard count
   */
  async getFlashcardCount(): Promise<number> {
    return await this.flashcardItems.count();
  }

  /**
   * Load more flashcards if available
   */
  async loadMoreFlashcards(): Promise<void> {
    if (await this.loadMoreButton.isVisible()) {
      await this.loadMoreButton.click();
    }
  }

  /**
   * Verify deck title matches expected value
   */
  async expectDeckTitleToBe(expectedTitle: string): Promise<void> {
    await expect(this.deckTitle).toHaveText(expectedTitle);
  }

  /**
   * Verify AI generation button is visible
   */
  async expectAiGenerationButtonToBeVisible(): Promise<void> {
    await expect(this.generateAiButton).toBeVisible();
  }
}
