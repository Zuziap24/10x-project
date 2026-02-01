/**
 * Testy jednostkowe dla AIGenerationDialog.tsx
 * Testują komponenty: AIGenerationDialog, InputStep, ReviewStep, ReviewItem
 */

import { describe, it, expect, vi, type Mock } from "vitest";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithQueryClient } from "@/test-utils/test-helpers";
import { AIGenerationDialog } from "../AIGenerationDialog";
import type { GeneratedSuggestionDto, AcceptFlashcardItem } from "../../../types";

// ------------------------------------------------------------------
// Test Fixtures & Helpers
// ------------------------------------------------------------------

const MIN_CHARS = 1000;
const MAX_CHARS = 10000;

function createValidSourceText(length = MIN_CHARS): string {
  return "a".repeat(length);
}

function createMockSuggestions(count = 3): GeneratedSuggestionDto[] {
  return Array.from({ length: count }, (_, i) => ({
    front: `Question ${i + 1}`,
    back: `Answer ${i + 1}`,
  }));
}

interface RenderDialogOptions {
  open?: boolean;
  isGenerating?: boolean;
  isAccepting?: boolean;
  onOpenChange?: Mock;
  onGenerate?: Mock;
  onAccept?: Mock;
}

function renderDialog(options: RenderDialogOptions = {}) {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    onGenerate: vi.fn().mockResolvedValue({
      generationId: "gen-123",
      suggestions: createMockSuggestions(),
    }),
    onAccept: vi.fn().mockResolvedValue(undefined),
    isGenerating: false,
    isAccepting: false,
  };

  const props = { ...defaultProps, ...options };

  const result = renderWithQueryClient(<AIGenerationDialog {...props} />);

  return { ...result, props };
}

/**
 * Helper to set textarea value quickly (for long texts - userEvent.type is too slow)
 */
function setTextareaValue(textarea: HTMLElement, value: string) {
  fireEvent.change(textarea, { target: { value } });
}

// ------------------------------------------------------------------
// AIGenerationDialog - Main Component Tests
// ------------------------------------------------------------------

describe("AIGenerationDialog", () => {
  const user = userEvent.setup();

  describe("Rendering", () => {
    it("should render dialog when open is true", () => {
      renderDialog({ open: true });

      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText("Generate Flashcards with AI")).toBeInTheDocument();
    });

    it("should not render dialog content when open is false", () => {
      renderDialog({ open: false });

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("should show input step by default", () => {
      renderDialog();

      expect(screen.getByLabelText("Source Text")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /generate flashcards/i })).toBeInTheDocument();
    });
  });

  describe("Dialog Close & State Reset", () => {
    it("should call onOpenChange when dialog is closed", async () => {
      const onOpenChange = vi.fn();
      renderDialog({ onOpenChange });

      const closeButton = screen.getByRole("button", { name: /close/i });
      await user.click(closeButton);

      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe("Error Handling", () => {
    it("should display error message when generation fails", async () => {
      const onGenerate = vi.fn().mockRejectedValue(new Error("API Error"));
      renderDialog({ onGenerate });

      const textarea = screen.getByLabelText("Source Text");
      setTextareaValue(textarea, createValidSourceText());

      await user.click(screen.getByRole("button", { name: /generate flashcards/i }));

      await waitFor(() => {
        expect(screen.getByRole("alert")).toHaveTextContent("API Error");
      });
    });

    it("should display generic error when error is not an Error instance", async () => {
      const onGenerate = vi.fn().mockRejectedValue("Unknown error");
      renderDialog({ onGenerate });

      const textarea = screen.getByLabelText("Source Text");
      setTextareaValue(textarea, createValidSourceText());

      await user.click(screen.getByRole("button", { name: /generate flashcards/i }));

      await waitFor(() => {
        expect(screen.getByRole("alert")).toHaveTextContent("Failed to generate flashcards");
      });
    });

    it("should display error message when accepting fails", async () => {
      const onGenerate = vi.fn().mockResolvedValue({
        generationId: "gen-123",
        suggestions: createMockSuggestions(1),
      });
      const onAccept = vi.fn().mockRejectedValue(new Error("Save failed"));

      renderDialog({ onGenerate, onAccept });

      const textarea = screen.getByLabelText("Source Text");
      setTextareaValue(textarea, createValidSourceText());
      await user.click(screen.getByRole("button", { name: /generate flashcards/i }));

      await waitFor(() => {
        expect(screen.getByText("Review Generated Flashcards")).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /save/i }));

      await waitFor(() => {
        expect(screen.getByRole("alert")).toHaveTextContent("Save failed");
      });
    });
  });

  describe("Step Navigation", () => {
    it("should navigate to review step after successful generation", async () => {
      renderDialog();

      const textarea = screen.getByLabelText("Source Text");
      setTextareaValue(textarea, createValidSourceText());

      await user.click(screen.getByRole("button", { name: /generate flashcards/i }));

      await waitFor(() => {
        expect(screen.getByText("Review Generated Flashcards")).toBeInTheDocument();
      });
    });

    it("should navigate back to input step when Back button is clicked", async () => {
      renderDialog();

      const textarea = screen.getByLabelText("Source Text");
      setTextareaValue(textarea, createValidSourceText());
      await user.click(screen.getByRole("button", { name: /generate flashcards/i }));

      await waitFor(() => {
        expect(screen.getByText("Review Generated Flashcards")).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /back/i }));

      expect(screen.getByText("Generate Flashcards with AI")).toBeInTheDocument();
      expect(screen.getByLabelText("Source Text")).toBeInTheDocument();
    });
  });
});

// ------------------------------------------------------------------
// InputStep - Tests
// ------------------------------------------------------------------

describe("InputStep", () => {
  const user = userEvent.setup();

  describe("Text Input", () => {
    it("should update character count as user types", async () => {
      renderDialog();

      const textarea = screen.getByLabelText("Source Text");
      await user.type(textarea, "Hello");

      expect(screen.getByText(/5 \//)).toBeInTheDocument();
    });

    it("should show character count range", () => {
      renderDialog();

      expect(screen.getByText(/1,000 - 10,000 characters/)).toBeInTheDocument();
    });
  });

  describe("Validation", () => {
    it("should disable Generate button when text is too short", () => {
      renderDialog();

      const button = screen.getByRole("button", { name: /generate flashcards/i });
      expect(button).toBeDisabled();
    });

    it("should enable Generate button when text length is valid", () => {
      renderDialog();

      const textarea = screen.getByLabelText("Source Text");
      setTextareaValue(textarea, createValidSourceText(MIN_CHARS));

      const button = screen.getByRole("button", { name: /generate flashcards/i });
      expect(button).toBeEnabled();
    });

    it("should disable Generate button when text exceeds maximum length", () => {
      renderDialog();

      const textarea = screen.getByLabelText("Source Text");
      setTextareaValue(textarea, createValidSourceText(MAX_CHARS + 1));

      const button = screen.getByRole("button", { name: /generate flashcards/i });
      expect(button).toBeDisabled();
    });

    it("should show 'more needed' hint when text is below minimum", () => {
      renderDialog();

      const textarea = screen.getByLabelText("Source Text");
      setTextareaValue(textarea, "a".repeat(500));

      expect(screen.getByText(/500 more needed/)).toBeInTheDocument();
    });
  });

  describe("Generation Flow", () => {
    it("should call onGenerate with source text when button is clicked", async () => {
      const onGenerate = vi.fn().mockResolvedValue({
        generationId: "gen-123",
        suggestions: createMockSuggestions(),
      });
      renderDialog({ onGenerate });

      const sourceText = createValidSourceText();
      const textarea = screen.getByLabelText("Source Text");
      setTextareaValue(textarea, sourceText);

      await user.click(screen.getByRole("button", { name: /generate flashcards/i }));

      expect(onGenerate).toHaveBeenCalledWith(sourceText);
    });

    it("should show loading state when isGenerating is true", () => {
      renderDialog({ isGenerating: true });

      expect(screen.getByText("Generating...")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /generating/i })).toBeDisabled();
    });

    it("should disable textarea when isGenerating is true", () => {
      renderDialog({ isGenerating: true });

      const textarea = screen.getByLabelText("Source Text");
      expect(textarea).toBeDisabled();
    });
  });

  describe("Character Count Colors (Visual Feedback)", () => {
    it("should apply appropriate color class for empty text", () => {
      renderDialog();

      const charCount = screen.getByText(/0 \//);
      expect(charCount).toHaveClass("text-muted-foreground");
    });

    it("should apply amber color for text below minimum", () => {
      renderDialog();

      const textarea = screen.getByLabelText("Source Text");
      setTextareaValue(textarea, "a".repeat(500));

      const charCount = screen.getByText(/500 \//);
      expect(charCount).toHaveClass("text-amber-500");
    });

    it("should apply green color for valid text length", () => {
      renderDialog();

      const textarea = screen.getByLabelText("Source Text");
      setTextareaValue(textarea, createValidSourceText(MIN_CHARS));

      const charCount = screen.getByText(/1,000 \//);
      expect(charCount).toHaveClass("text-green-500");
    });

    it("should apply destructive color when text exceeds maximum", () => {
      renderDialog();

      const textarea = screen.getByLabelText("Source Text");
      setTextareaValue(textarea, createValidSourceText(MAX_CHARS + 1));

      const charCount = screen.getByText(/10,001 \//);
      expect(charCount).toHaveClass("text-destructive");
    });
  });
});

// ------------------------------------------------------------------
// ReviewStep - Tests
// ------------------------------------------------------------------

describe("ReviewStep", () => {
  const user = userEvent.setup();

  async function navigateToReviewStep(suggestions: GeneratedSuggestionDto[] = createMockSuggestions()) {
    const onGenerate = vi.fn().mockResolvedValue({
      generationId: "gen-123",
      suggestions,
    });
    const onAccept = vi.fn().mockResolvedValue(undefined);
    const onOpenChange = vi.fn();

    const result = renderDialog({ onGenerate, onAccept, onOpenChange });

    const textarea = screen.getByLabelText("Source Text");
    setTextareaValue(textarea, createValidSourceText());
    await user.click(screen.getByRole("button", { name: /generate flashcards/i }));

    await waitFor(() => {
      expect(screen.getByText("Review Generated Flashcards")).toBeInTheDocument();
    });

    return { onGenerate, onAccept, onOpenChange, ...result };
  }

  describe("Rendering", () => {
    it("should display all generated suggestions", async () => {
      await navigateToReviewStep();

      expect(screen.getByDisplayValue("Question 1")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Answer 1")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Question 2")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Answer 2")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Question 3")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Answer 3")).toBeInTheDocument();
    });

    it("should show correct selection count", async () => {
      await navigateToReviewStep();

      expect(screen.getByText("3 of 3 selected")).toBeInTheDocument();
    });

    it("should show Select all checkbox", async () => {
      await navigateToReviewStep();

      expect(screen.getByLabelText(/deselect all/i)).toBeInTheDocument();
    });
  });

  describe("Selection", () => {
    it("should deselect a suggestion when its checkbox is clicked", async () => {
      await navigateToReviewStep();

      const deselectButtons = screen.getAllByLabelText(/deselect this card/i);
      await user.click(deselectButtons[0]);

      expect(screen.getByText("2 of 3 selected")).toBeInTheDocument();
    });

    it("should reselect a deselected suggestion when checkbox is clicked again", async () => {
      await navigateToReviewStep();

      const checkboxes = screen.getAllByLabelText(/deselect this card/i);
      await user.click(checkboxes[0]);

      // After deselecting, there should be one "Select this card" checkbox
      expect(screen.getByText("2 of 3 selected")).toBeInTheDocument();

      // Find the unchecked checkbox (data-state="unchecked") and click it
      const allCardCheckboxes = screen.getAllByRole("checkbox", { name: /this card/i });
      const uncheckedCheckbox = allCardCheckboxes.find(
        (checkbox) => checkbox.getAttribute("data-state") === "unchecked"
      );

      if (!uncheckedCheckbox) {
        throw new Error("Expected to find an unchecked checkbox");
      }

      await user.click(uncheckedCheckbox);

      expect(screen.getByText("3 of 3 selected")).toBeInTheDocument();
    });

    it("should toggle all selections when Select/Deselect all is clicked", async () => {
      await navigateToReviewStep();

      const toggleAll = screen.getByLabelText(/deselect all/i);
      await user.click(toggleAll);

      expect(screen.getByText("0 of 3 selected")).toBeInTheDocument();

      const selectAll = screen.getByLabelText(/select all/i);
      await user.click(selectAll);

      expect(screen.getByText("3 of 3 selected")).toBeInTheDocument();
    });
  });

  describe("Editing", () => {
    it("should allow editing the front of a suggestion", async () => {
      await navigateToReviewStep();

      const frontTextarea = screen.getByDisplayValue("Question 1");
      setTextareaValue(frontTextarea, "Modified Question");

      expect(screen.getByDisplayValue("Modified Question")).toBeInTheDocument();
    });

    it("should allow editing the back of a suggestion", async () => {
      await navigateToReviewStep();

      const backTextarea = screen.getByDisplayValue("Answer 1");
      setTextareaValue(backTextarea, "Modified Answer");

      expect(screen.getByDisplayValue("Modified Answer")).toBeInTheDocument();
    });

    it("should mark suggestion as edited when content is changed", async () => {
      await navigateToReviewStep();

      const frontTextarea = screen.getByDisplayValue("Question 1");
      setTextareaValue(frontTextarea, "Modified Question");

      expect(screen.getByText("(edited)")).toBeInTheDocument();
    });

    it("should remove edited marker if content is restored to original", async () => {
      await navigateToReviewStep();

      const frontTextarea = screen.getByDisplayValue("Question 1");
      setTextareaValue(frontTextarea, "Modified");

      expect(screen.getByText("(edited)")).toBeInTheDocument();

      const modifiedTextarea = screen.getByDisplayValue("Modified");
      setTextareaValue(modifiedTextarea, "Question 1");

      await waitFor(() => {
        expect(screen.queryByText("(edited)")).not.toBeInTheDocument();
      });
    });

    it("should disable textareas for deselected suggestions", async () => {
      await navigateToReviewStep();

      const deselectButtons = screen.getAllByLabelText(/deselect this card/i);
      await user.click(deselectButtons[0]);

      const frontTextarea = screen.getByDisplayValue("Question 1");
      const backTextarea = screen.getByDisplayValue("Answer 1");

      expect(frontTextarea).toBeDisabled();
      expect(backTextarea).toBeDisabled();
    });
  });

  describe("Save Flow", () => {
    it("should disable Save button when no suggestions are selected", async () => {
      await navigateToReviewStep();

      const toggleAll = screen.getByLabelText(/deselect all/i);
      await user.click(toggleAll);

      const saveButton = screen.getByRole("button", { name: /save/i });
      expect(saveButton).toBeDisabled();
    });

    it("should call onAccept with selected flashcards when Save is clicked", async () => {
      const { onAccept } = await navigateToReviewStep();

      const saveButton = screen.getByRole("button", { name: /save 3 cards/i });
      await user.click(saveButton);

      expect(onAccept).toHaveBeenCalledWith("gen-123", [
        { front: "Question 1", back: "Answer 1", was_edited: false },
        { front: "Question 2", back: "Answer 2", was_edited: false },
        { front: "Question 3", back: "Answer 3", was_edited: false },
      ]);
    });

    it("should call onAccept only with selected flashcards", async () => {
      const { onAccept } = await navigateToReviewStep();

      const deselectButtons = screen.getAllByLabelText(/deselect this card/i);
      await user.click(deselectButtons[1]);

      const saveButton = screen.getByRole("button", { name: /save 2 cards/i });
      await user.click(saveButton);

      expect(onAccept).toHaveBeenCalledWith("gen-123", [
        { front: "Question 1", back: "Answer 1", was_edited: false },
        { front: "Question 3", back: "Answer 3", was_edited: false },
      ]);
    });

    it("should set was_edited to true for edited flashcards", async () => {
      const { onAccept } = await navigateToReviewStep();

      const frontTextarea = screen.getByDisplayValue("Question 1");
      setTextareaValue(frontTextarea, "Modified Question");

      const saveButton = screen.getByRole("button", { name: /save 3 cards/i });
      await user.click(saveButton);

      expect(onAccept).toHaveBeenCalledWith("gen-123", [
        { front: "Modified Question", back: "Answer 1", was_edited: true },
        { front: "Question 2", back: "Answer 2", was_edited: false },
        { front: "Question 3", back: "Answer 3", was_edited: false },
      ]);
    });

    it("should close dialog after successful save", async () => {
      const { onOpenChange } = await navigateToReviewStep();

      const saveButton = screen.getByRole("button", { name: /save 3 cards/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(onOpenChange).toHaveBeenCalledWith(false);
      });
    });

    it("should show correct button text for single card", async () => {
      const suggestions = [{ front: "Q1", back: "A1" }];
      await navigateToReviewStep(suggestions);

      expect(screen.getByRole("button", { name: /save 1 card$/i })).toBeInTheDocument();
    });

    it("should show correct button text for multiple cards", async () => {
      await navigateToReviewStep();

      expect(screen.getByRole("button", { name: /save 3 cards/i })).toBeInTheDocument();
    });
  });

  describe("Visual States", () => {
    it("should show loading state when isAccepting is true", async () => {
      const onGenerate = vi.fn().mockResolvedValue({
        generationId: "gen-123",
        suggestions: createMockSuggestions(),
      });

      renderDialog({ onGenerate, isAccepting: true });

      const textarea = screen.getByLabelText("Source Text");
      setTextareaValue(textarea, createValidSourceText());
      await user.click(screen.getByRole("button", { name: /generate flashcards/i }));

      await waitFor(() => {
        expect(screen.getByText("Review Generated Flashcards")).toBeInTheDocument();
      });

      expect(screen.getByText("Saving...")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /saving/i })).toBeDisabled();
    });

    it("should disable Back button when isAccepting is true", async () => {
      const onGenerate = vi.fn().mockResolvedValue({
        generationId: "gen-123",
        suggestions: createMockSuggestions(),
      });

      renderDialog({ onGenerate, isAccepting: true });

      const textarea = screen.getByLabelText("Source Text");
      setTextareaValue(textarea, createValidSourceText());
      await user.click(screen.getByRole("button", { name: /generate flashcards/i }));

      await waitFor(() => {
        expect(screen.getByText("Review Generated Flashcards")).toBeInTheDocument();
      });

      const backButton = screen.getByRole("button", { name: /back/i });
      expect(backButton).toBeDisabled();
    });
  });
});

// ------------------------------------------------------------------
// Business Rules & Edge Cases
// ------------------------------------------------------------------

describe("Business Rules & Edge Cases", () => {
  const user = userEvent.setup();

  describe("Character Limits", () => {
    it("should accept exactly MIN_CHARS characters", () => {
      renderDialog();

      const textarea = screen.getByLabelText("Source Text");
      setTextareaValue(textarea, createValidSourceText(MIN_CHARS));

      const button = screen.getByRole("button", { name: /generate flashcards/i });
      expect(button).toBeEnabled();
    });

    it("should accept exactly MAX_CHARS characters", () => {
      renderDialog();

      const textarea = screen.getByLabelText("Source Text");
      setTextareaValue(textarea, createValidSourceText(MAX_CHARS));

      const button = screen.getByRole("button", { name: /generate flashcards/i });
      expect(button).toBeEnabled();
    });

    it("should reject MIN_CHARS - 1 characters", () => {
      renderDialog();

      const textarea = screen.getByLabelText("Source Text");
      setTextareaValue(textarea, createValidSourceText(MIN_CHARS - 1));

      const button = screen.getByRole("button", { name: /generate flashcards/i });
      expect(button).toBeDisabled();
    });

    it("should reject MAX_CHARS + 1 characters", () => {
      renderDialog();

      const textarea = screen.getByLabelText("Source Text");
      setTextareaValue(textarea, createValidSourceText(MAX_CHARS + 1));

      const button = screen.getByRole("button", { name: /generate flashcards/i });
      expect(button).toBeDisabled();
    });
  });

  describe("Empty States", () => {
    it("should handle empty suggestions array gracefully", async () => {
      const onGenerate = vi.fn().mockResolvedValue({
        generationId: "gen-123",
        suggestions: [],
      });
      renderDialog({ onGenerate });

      const textarea = screen.getByLabelText("Source Text");
      setTextareaValue(textarea, createValidSourceText());
      await user.click(screen.getByRole("button", { name: /generate flashcards/i }));

      await waitFor(() => {
        expect(screen.getByText("Review Generated Flashcards")).toBeInTheDocument();
      });

      expect(screen.getByText("0 of 0 selected")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /save 0 cards/i })).toBeDisabled();
    });
  });

  describe("Data Integrity", () => {
    it("should preserve original values for was_edited comparison", async () => {
      const onGenerate = vi.fn().mockResolvedValue({
        generationId: "gen-123",
        suggestions: [{ front: "Original Q", back: "Original A" }],
      });
      const onAccept = vi.fn().mockResolvedValue(undefined);
      renderDialog({ onGenerate, onAccept });

      const textarea = screen.getByLabelText("Source Text");
      setTextareaValue(textarea, createValidSourceText());
      await user.click(screen.getByRole("button", { name: /generate flashcards/i }));

      await waitFor(() => {
        expect(screen.getByText("Review Generated Flashcards")).toBeInTheDocument();
      });

      // Edit and restore
      const frontTextarea = screen.getByDisplayValue("Original Q");
      setTextareaValue(frontTextarea, "Changed");

      expect(screen.getByText("(edited)")).toBeInTheDocument();

      const changedTextarea = screen.getByDisplayValue("Changed");
      setTextareaValue(changedTextarea, "Original Q");

      await waitFor(() => {
        expect(screen.queryByText("(edited)")).not.toBeInTheDocument();
      });

      // Save
      const saveButton = screen.getByRole("button", { name: /save 1 card/i });
      await user.click(saveButton);

      const [[generationId, flashcards]] = onAccept.mock.calls as [[string, AcceptFlashcardItem[]]];
      expect(generationId).toBe("gen-123");
      expect(flashcards[0].was_edited).toBe(false);
    });

    it("should generate unique tempIds for each suggestion", async () => {
      const onGenerate = vi.fn().mockResolvedValue({
        generationId: "gen-123",
        suggestions: createMockSuggestions(5),
      });
      renderDialog({ onGenerate });

      const textarea = screen.getByLabelText("Source Text");
      setTextareaValue(textarea, createValidSourceText());
      await user.click(screen.getByRole("button", { name: /generate flashcards/i }));

      await waitFor(() => {
        expect(screen.getByText("5 of 5 selected")).toBeInTheDocument();
      });

      // All checkboxes should be independently controllable
      const checkboxes = screen.getAllByLabelText(/deselect this card/i);
      expect(checkboxes).toHaveLength(5);

      // Toggle each one independently
      await user.click(checkboxes[0]);
      await user.click(checkboxes[2]);
      await user.click(checkboxes[4]);

      expect(screen.getByText("2 of 5 selected")).toBeInTheDocument();
    });
  });

  describe("Concurrent Operations Prevention", () => {
    it("should not allow interactions when already generating", () => {
      renderDialog({ isGenerating: true });

      const textarea = screen.getByLabelText("Source Text");
      expect(textarea).toBeDisabled();

      const button = screen.getByRole("button", { name: /generating/i });
      expect(button).toBeDisabled();
    });

    it("should not allow save when already accepting", async () => {
      const onGenerate = vi.fn().mockResolvedValue({
        generationId: "gen-123",
        suggestions: createMockSuggestions(),
      });

      renderDialog({ onGenerate, isAccepting: true });

      const textarea = screen.getByLabelText("Source Text");
      setTextareaValue(textarea, createValidSourceText());
      await user.click(screen.getByRole("button", { name: /generate flashcards/i }));

      await waitFor(() => {
        expect(screen.getByText("Review Generated Flashcards")).toBeInTheDocument();
      });

      const saveButton = screen.getByRole("button", { name: /saving/i });
      expect(saveButton).toBeDisabled();
    });
  });

  describe("State Management", () => {
    it("should clear error when navigating back to input step", async () => {
      const onGenerate = vi.fn().mockResolvedValue({
        generationId: "gen-123",
        suggestions: createMockSuggestions(),
      });
      const onAccept = vi.fn().mockRejectedValue(new Error("Save failed"));
      renderDialog({ onGenerate, onAccept });

      const textarea = screen.getByLabelText("Source Text");
      setTextareaValue(textarea, createValidSourceText());
      await user.click(screen.getByRole("button", { name: /generate flashcards/i }));

      await waitFor(() => {
        expect(screen.getByText("Review Generated Flashcards")).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /save 3 cards/i }));

      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /back/i }));

      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("should maintain source text when navigating back from review step", async () => {
      const sourceText = createValidSourceText();
      renderDialog();

      const textarea = screen.getByLabelText("Source Text");
      setTextareaValue(textarea, sourceText);
      await user.click(screen.getByRole("button", { name: /generate flashcards/i }));

      await waitFor(() => {
        expect(screen.getByText("Review Generated Flashcards")).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /back/i }));

      const newTextarea = screen.getByLabelText("Source Text");
      expect(newTextarea).toHaveValue(sourceText);
    });
  });
});

// ------------------------------------------------------------------
// Accessibility Tests
// ------------------------------------------------------------------

describe("Accessibility", () => {
  const user = userEvent.setup();

  it("should have accessible labels for all form controls", () => {
    renderDialog();

    expect(screen.getByLabelText("Source Text")).toBeInTheDocument();
  });

  it("should have aria-label on selection checkboxes", async () => {
    const onGenerate = vi.fn().mockResolvedValue({
      generationId: "gen-123",
      suggestions: createMockSuggestions(),
    });
    renderDialog({ onGenerate });

    const textarea = screen.getByLabelText("Source Text");
    setTextareaValue(textarea, createValidSourceText());
    await user.click(screen.getByRole("button", { name: /generate flashcards/i }));

    await waitFor(() => {
      expect(screen.getByText("Review Generated Flashcards")).toBeInTheDocument();
    });

    expect(screen.getByLabelText(/deselect all/i)).toBeInTheDocument();
    expect(screen.getAllByLabelText(/deselect this card/i)).toHaveLength(3);
  });

  it("should display error in an element with role=alert", async () => {
    const onGenerate = vi.fn().mockRejectedValue(new Error("Test error"));
    renderDialog({ onGenerate });

    const textarea = screen.getByLabelText("Source Text");
    setTextareaValue(textarea, createValidSourceText());
    await user.click(screen.getByRole("button", { name: /generate flashcards/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
  });

  it("should have dialog role and proper title", () => {
    renderDialog();

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();

    expect(screen.getByText("Generate Flashcards with AI")).toBeInTheDocument();
  });

  it("should have descriptive dialog description", () => {
    renderDialog();

    expect(screen.getByText(/paste your source text/i)).toBeInTheDocument();
  });
});
