/**
 * Page Object Model: AI Generation Dialog
 * Handles AI flashcard generation workflow
 */

import { type Page, type Locator, expect } from "@playwright/test";

export class AIGenerationDialog {
  readonly page: Page;

  // Dialog container
  readonly dialog: Locator;
  readonly dialogTitle: Locator;
  readonly errorMessage: Locator;

  // Input Step
  readonly inputStep: Locator;
  readonly sourceTextInput: Locator;
  readonly charCount: Locator;
  readonly generateButton: Locator;

  // Review Step
  readonly reviewStep: Locator;
  readonly suggestionsList: Locator;
  readonly suggestionItems: Locator;
  readonly selectAllCheckbox: Locator;
  readonly selectedCountText: Locator;
  readonly backToInputButton: Locator;
  readonly saveFlashcardsButton: Locator;

  // Constants
  static readonly MIN_CHARS = 1000;
  static readonly MAX_CHARS = 10000;

  constructor(page: Page) {
    this.page = page;

    // Dialog elements
    this.dialog = page.getByTestId("ai-generation-dialog");
    this.dialogTitle = this.dialog.getByRole("heading");
    this.errorMessage = this.dialog.locator('[role="alert"]');

    // Input Step elements
    this.inputStep = page.getByTestId("ai-input-step");
    this.sourceTextInput = page.getByTestId("source-text-input");
    this.charCount = page.getByTestId("char-count");
    this.generateButton = page.getByTestId("generate-flashcards-button");

    // Review Step elements
    this.reviewStep = page.getByTestId("ai-review-step");
    this.suggestionsList = page.getByTestId("suggestions-list");
    this.suggestionItems = page.getByTestId("suggestion-item");
    this.selectAllCheckbox = page.locator("#select-all");
    this.selectedCountText = this.reviewStep.locator("text=/\\d+ of \\d+ selected/");
    this.backToInputButton = page.getByTestId("back-to-input-button");
    this.saveFlashcardsButton = page.getByTestId("save-flashcards-button");
  }

  /**
   * Wait for dialog to be visible
   */
  async waitForDialog(): Promise<void> {
    await expect(this.dialog).toBeVisible();
  }

  /**
   * Wait for dialog to be closed
   */
  async waitForDialogClosed(): Promise<void> {
    await expect(this.dialog).not.toBeVisible();
  }

  /**
   * Check if dialog is on input step
   */
  async isOnInputStep(): Promise<boolean> {
    return await this.inputStep.isVisible();
  }

  /**
   * Check if dialog is on review step
   */
  async isOnReviewStep(): Promise<boolean> {
    return await this.reviewStep.isVisible();
  }

  /**
   * Enter source text for generation
   */
  async enterSourceText(text: string): Promise<void> {
    await this.sourceTextInput.fill(text);
  }

  /**
   * Get current character count from UI
   */
  async getCharCount(): Promise<number> {
    const text = await this.charCount.textContent();
    const match = text?.match(/^([\d,]+)/);
    return match ? parseInt(match[1].replace(/,/g, ""), 10) : 0;
  }

  /**
   * Check if generate button is enabled
   */
  async isGenerateButtonEnabled(): Promise<boolean> {
    return await this.generateButton.isEnabled();
  }

  /**
   * Click generate button and wait for review step
   */
  async generate(): Promise<void> {
    await this.generateButton.click();
    await expect(this.reviewStep).toBeVisible({ timeout: 60000 }); // AI generation can take time
  }

  /**
   * Get number of generated suggestions
   */
  async getSuggestionCount(): Promise<number> {
    return await this.suggestionItems.count();
  }

  /**
   * Get suggestion item by index
   */
  getSuggestionByIndex(index: number): SuggestionItem {
    return new SuggestionItem(this.suggestionItems.nth(index));
  }

  /**
   * Toggle select all checkbox
   */
  async toggleSelectAll(): Promise<void> {
    await this.selectAllCheckbox.click();
  }

  /**
   * Go back to input step
   */
  async goBackToInput(): Promise<void> {
    await this.backToInputButton.click();
    await expect(this.inputStep).toBeVisible();
  }

  /**
   * Save selected flashcards
   */
  async saveSelectedFlashcards(): Promise<void> {
    await this.saveFlashcardsButton.click();
    await this.waitForDialogClosed();
  }

  /**
   * Check if save button is enabled
   */
  async isSaveButtonEnabled(): Promise<boolean> {
    return await this.saveFlashcardsButton.isEnabled();
  }

  /**
   * Close dialog by pressing Escape or clicking outside
   */
  async close(): Promise<void> {
    await this.page.keyboard.press("Escape");
    await this.waitForDialogClosed();
  }

  /**
   * Verify error message is displayed
   */
  async expectErrorMessage(message?: string): Promise<void> {
    await expect(this.errorMessage).toBeVisible();
    if (message) {
      await expect(this.errorMessage).toContainText(message);
    }
  }

  /**
   * Complete full generation flow: enter text, generate, save
   */
  async completeGenerationFlow(sourceText: string): Promise<void> {
    await this.waitForDialog();
    await this.enterSourceText(sourceText);
    await this.generate();
    await this.saveSelectedFlashcards();
  }

  /**
   * Generate sample text of specified length
   */
  static generateSampleText(length: number = AIGenerationDialog.MIN_CHARS): string {
    const paragraph = `This is a sample text for testing AI flashcard generation. 
It contains various information that could be used to create educational flashcards. 
The AI will analyze this content and suggest question-answer pairs based on the key concepts. 
Testing is an important part of software development that ensures quality and reliability. `;

    let result = "";
    while (result.length < length) {
      result += paragraph;
    }
    return result.substring(0, length);
  }
}

/**
 * Helper class for individual suggestion items
 */
export class SuggestionItem {
  readonly locator: Locator;
  readonly checkbox: Locator;
  readonly frontInput: Locator;
  readonly backInput: Locator;
  readonly editedBadge: Locator;

  constructor(locator: Locator) {
    this.locator = locator;
    this.checkbox = locator.getByTestId("suggestion-checkbox");
    this.frontInput = locator.getByTestId("suggestion-front-input");
    this.backInput = locator.getByTestId("suggestion-back-input");
    this.editedBadge = locator.locator("text=(edited)");
  }

  /**
   * Toggle selection of this suggestion
   */
  async toggleSelection(): Promise<void> {
    await this.checkbox.click();
  }

  /**
   * Check if suggestion is selected
   */
  async isSelected(): Promise<boolean> {
    return await this.checkbox.isChecked();
  }

  /**
   * Edit front content
   */
  async editFront(text: string): Promise<void> {
    await this.frontInput.fill(text);
  }

  /**
   * Edit back content
   */
  async editBack(text: string): Promise<void> {
    await this.backInput.fill(text);
  }

  /**
   * Get front content
   */
  async getFront(): Promise<string> {
    return (await this.frontInput.inputValue()) ?? "";
  }

  /**
   * Get back content
   */
  async getBack(): Promise<string> {
    return (await this.backInput.inputValue()) ?? "";
  }

  /**
   * Check if suggestion has been edited
   */
  async isEdited(): Promise<boolean> {
    return await this.editedBadge.isVisible();
  }
}
