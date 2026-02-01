/**
 * Page Object Model: Dashboard Page
 * Handles deck listing and navigation
 */

import { type Page, type Locator, expect } from "@playwright/test";

export class DashboardPage {
  readonly page: Page;

  // Locators
  readonly newDeckButton: Locator;
  readonly deckCards: Locator;
  readonly emptyState: Locator;
  readonly createFirstDeckButton: Locator;
  readonly pageTitle: Locator;

  // Create Deck Dialog
  readonly createDeckDialog: Locator;
  readonly deckNameInput: Locator;
  readonly deckDescriptionInput: Locator;
  readonly createDeckSubmitButton: Locator;
  readonly cancelButton: Locator;

  constructor(page: Page) {
    this.page = page;

    // Dashboard elements
    this.newDeckButton = page.getByTestId("new-deck-button");
    this.deckCards = page.getByTestId("deck-card");
    this.emptyState = page.getByTestId("empty-state");
    this.createFirstDeckButton = page.getByTestId("create-first-deck-button");
    this.pageTitle = page.getByRole("heading", { name: "My Decks" });

    // Create Deck Dialog elements
    this.createDeckDialog = page.getByTestId("create-deck-dialog");
    this.deckNameInput = page.getByTestId("deck-name-input");
    this.deckDescriptionInput = page.locator("#description");
    this.createDeckSubmitButton = page.getByTestId("create-deck-submit");
    this.cancelButton = page.getByRole("button", { name: "Cancel" });
  }

  /**
   * Navigate to dashboard page
   */
  async goto(): Promise<void> {
    await this.page.goto("/dashboard");
    await this.page.waitForLoadState("networkidle");
  }

  /**
   * Open the create deck dialog
   */
  async openCreateDeckDialog(): Promise<void> {
    await this.newDeckButton.click();
    await expect(this.createDeckDialog).toBeVisible();
  }

  /**
   * Open create deck dialog from empty state
   */
  async openCreateDeckDialogFromEmptyState(): Promise<void> {
    await this.createFirstDeckButton.click();
    await expect(this.createDeckDialog).toBeVisible();
  }

  /**
   * Create a new deck with given name and optional description
   */
  async createDeck(name: string, description?: string): Promise<void> {
    await this.openCreateDeckDialog();
    await this.deckNameInput.fill(name);

    if (description) {
      await this.deckDescriptionInput.fill(description);
    }

    await this.createDeckSubmitButton.click();
    await expect(this.createDeckDialog).not.toBeVisible();
  }

  /**
   * Get deck card by name
   */
  getDeckCardByName(name: string): Locator {
    return this.deckCards.filter({ hasText: name });
  }

  /**
   * Open a deck by clicking on it
   */
  async openDeck(name: string): Promise<void> {
    const deckCard = this.getDeckCardByName(name);
    await deckCard.getByTestId("open-deck-button").click();
    await this.page.waitForURL(/.*\/decks\/.*/);
  }

  /**
   * Open first available deck
   * If no decks exist, creates one first
   */
  async openFirstDeck(): Promise<void> {
    const deckCount = await this.getDeckCount();

    if (deckCount === 0) {
      // Create a deck first if none exist
      await this.createDeck("Test Deck", "Test deck for E2E tests");
    }

    await this.deckCards.first().getByTestId("open-deck-button").click();
    await this.page.waitForURL(/.*\/decks\/.*/);
  }

  /**
   * Get count of deck cards
   */
  async getDeckCount(): Promise<number> {
    return await this.deckCards.count();
  }

  /**
   * Check if empty state is visible
   */
  async isEmptyStateVisible(): Promise<boolean> {
    return await this.emptyState.isVisible();
  }

  /**
   * Verify deck exists in list
   */
  async expectDeckToExist(name: string): Promise<void> {
    await expect(this.getDeckCardByName(name)).toBeVisible();
  }

  /**
   * Verify deck has specific flashcard count
   */
  async expectDeckToHaveFlashcardCount(name: string, count: number): Promise<void> {
    const deckCard = this.getDeckCardByName(name);
    const cardText = count === 1 ? "1 card" : `${count} cards`;
    await expect(deckCard).toContainText(cardText);
  }
}
