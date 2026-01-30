import { useState, useCallback, useMemo } from "react";
import { Loader2, Sparkles, Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import type { GeneratedSuggestionDto, AcceptFlashcardItem } from "../../types";

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------

interface SuggestionViewModel extends GeneratedSuggestionDto {
  tempId: string;
  isSelected: boolean;
  isEdited: boolean;
  originalFront: string;
  originalBack: string;
}

type WizardStep = "input" | "review";

interface AIGenerationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerate: (sourceText: string) => Promise<{ generationId: string; suggestions: GeneratedSuggestionDto[] }>;
  onAccept: (generationId: string, flashcards: AcceptFlashcardItem[]) => Promise<void>;
  isGenerating: boolean;
  isAccepting: boolean;
}

// ------------------------------------------------------------------
// Constants
// ------------------------------------------------------------------

const MIN_CHARS = 1000;
const MAX_CHARS = 10000;

// ------------------------------------------------------------------
// Main Component
// ------------------------------------------------------------------

export function AIGenerationDialog({
  open,
  onOpenChange,
  onGenerate,
  onAccept,
  isGenerating,
  isAccepting,
}: AIGenerationDialogProps) {
  const [step, setStep] = useState<WizardStep>("input");
  const [sourceText, setSourceText] = useState("");
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<SuggestionViewModel[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Character count validation
  const charCount = sourceText.length;
  const isValidLength = charCount >= MIN_CHARS && charCount <= MAX_CHARS;

  // Selected count for review step
  const selectedCount = useMemo(() => suggestions.filter((s) => s.isSelected).length, [suggestions]);

  // Reset state when dialog closes
  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!newOpen) {
        // Reset state after close animation
        setTimeout(() => {
          setStep("input");
          setSourceText("");
          setGenerationId(null);
          setSuggestions([]);
          setError(null);
        }, 200);
      }
      onOpenChange(newOpen);
    },
    [onOpenChange]
  );

  // Handle generate button click
  const handleGenerate = useCallback(async () => {
    if (!isValidLength) return;

    setError(null);

    try {
      const result = await onGenerate(sourceText);

      // Transform suggestions to view models
      const viewModels: SuggestionViewModel[] = result.suggestions.map((s, index) => ({
        ...s,
        tempId: `suggestion-${index}-${Date.now()}`,
        isSelected: true,
        isEdited: false,
        originalFront: s.front,
        originalBack: s.back,
      }));

      setGenerationId(result.generationId);
      setSuggestions(viewModels);
      setStep("review");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to generate flashcards";
      setError(message);
    }
  }, [sourceText, isValidLength, onGenerate]);

  // Handle save selected cards
  const handleSaveSelected = useCallback(async () => {
    if (!generationId || selectedCount === 0) return;

    setError(null);

    try {
      const flashcardsToSave: AcceptFlashcardItem[] = suggestions
        .filter((s) => s.isSelected)
        .map((s) => ({
          front: s.front,
          back: s.back,
          was_edited: s.isEdited,
        }));

      await onAccept(generationId, flashcardsToSave);
      handleOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save flashcards";
      setError(message);
    }
  }, [generationId, selectedCount, suggestions, onAccept, handleOpenChange]);

  // Handle suggestion selection toggle
  const handleToggleSelection = useCallback((tempId: string) => {
    setSuggestions((prev) => prev.map((s) => (s.tempId === tempId ? { ...s, isSelected: !s.isSelected } : s)));
  }, []);

  // Handle suggestion content edit
  const handleEditSuggestion = useCallback((tempId: string, field: "front" | "back", value: string) => {
    setSuggestions((prev) =>
      prev.map((s) => {
        if (s.tempId !== tempId) return s;

        const updated = { ...s, [field]: value };
        // Check if content has been edited from original
        updated.isEdited = updated.front !== s.originalFront || updated.back !== s.originalBack;
        return updated;
      })
    );
  }, []);

  // Handle select all / deselect all
  const handleToggleAll = useCallback(() => {
    const allSelected = suggestions.every((s) => s.isSelected);
    setSuggestions((prev) => prev.map((s) => ({ ...s, isSelected: !allSelected })));
  }, [suggestions]);

  // Handle back to input step
  const handleBackToInput = useCallback(() => {
    setStep("input");
    setError(null);
  }, []);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            {step === "input" ? "Generate Flashcards with AI" : "Review Generated Flashcards"}
          </DialogTitle>
          <DialogDescription>
            {step === "input"
              ? "Paste your source text and we'll generate flashcards for you."
              : "Review, edit, and select the flashcards you want to save."}
          </DialogDescription>
        </DialogHeader>

        {/* Error Message */}
        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive" role="alert">
            {error}
          </div>
        )}

        {step === "input" ? (
          <InputStep
            sourceText={sourceText}
            onSourceTextChange={setSourceText}
            charCount={charCount}
            isValidLength={isValidLength}
            isGenerating={isGenerating}
            onGenerate={handleGenerate}
          />
        ) : (
          <ReviewStep
            suggestions={suggestions}
            selectedCount={selectedCount}
            isAccepting={isAccepting}
            onToggleSelection={handleToggleSelection}
            onEditSuggestion={handleEditSuggestion}
            onToggleAll={handleToggleAll}
            onBack={handleBackToInput}
            onSave={handleSaveSelected}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

// ------------------------------------------------------------------
// Input Step Component
// ------------------------------------------------------------------

interface InputStepProps {
  sourceText: string;
  onSourceTextChange: (text: string) => void;
  charCount: number;
  isValidLength: boolean;
  isGenerating: boolean;
  onGenerate: () => void;
}

function InputStep({
  sourceText,
  onSourceTextChange,
  charCount,
  isValidLength,
  isGenerating,
  onGenerate,
}: InputStepProps) {
  const getCharCountColor = () => {
    if (charCount === 0) return "text-muted-foreground";
    if (charCount < MIN_CHARS) return "text-amber-500";
    if (charCount > MAX_CHARS) return "text-destructive";
    return "text-green-500";
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="source-text">Source Text</Label>
        <Textarea
          id="source-text"
          placeholder="Paste your text here (e.g., notes, article, textbook excerpt)..."
          value={sourceText}
          onChange={(e) => onSourceTextChange(e.target.value)}
          className="min-h-[200px] resize-none"
          disabled={isGenerating}
        />
        <div className="flex justify-between text-xs">
          <span className={getCharCountColor()}>
            {charCount.toLocaleString()} / {MIN_CHARS.toLocaleString()} - {MAX_CHARS.toLocaleString()} characters
          </span>
          {charCount > 0 && charCount < MIN_CHARS && (
            <span className="text-amber-500">{(MIN_CHARS - charCount).toLocaleString()} more needed</span>
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={onGenerate} disabled={!isValidLength || isGenerating}>
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Generate Flashcards
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// Review Step Component
// ------------------------------------------------------------------

interface ReviewStepProps {
  suggestions: SuggestionViewModel[];
  selectedCount: number;
  isAccepting: boolean;
  onToggleSelection: (tempId: string) => void;
  onEditSuggestion: (tempId: string, field: "front" | "back", value: string) => void;
  onToggleAll: () => void;
  onBack: () => void;
  onSave: () => void;
}

function ReviewStep({
  suggestions,
  selectedCount,
  isAccepting,
  onToggleSelection,
  onEditSuggestion,
  onToggleAll,
  onBack,
  onSave,
}: ReviewStepProps) {
  const allSelected = suggestions.every((s) => s.isSelected);

  return (
    <div className="space-y-4">
      {/* Header with select all */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Checkbox
            id="select-all"
            checked={allSelected}
            onCheckedChange={onToggleAll}
            aria-label={allSelected ? "Deselect all" : "Select all"}
          />
          <Label htmlFor="select-all" className="text-sm font-medium">
            {allSelected ? "Deselect all" : "Select all"}
          </Label>
        </div>
        <span className="text-sm text-muted-foreground">
          {selectedCount} of {suggestions.length} selected
        </span>
      </div>

      {/* Suggestions list */}
      <ScrollArea className="h-[300px] rounded-md border p-4">
        <div className="space-y-4">
          {suggestions.map((suggestion) => (
            <ReviewItem
              key={suggestion.tempId}
              suggestion={suggestion}
              onToggleSelection={onToggleSelection}
              onEditSuggestion={onEditSuggestion}
            />
          ))}
        </div>
      </ScrollArea>

      {/* Actions */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} disabled={isAccepting}>
          Back
        </Button>
        <Button onClick={onSave} disabled={selectedCount === 0 || isAccepting}>
          {isAccepting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Check className="mr-2 h-4 w-4" />
              Save {selectedCount} {selectedCount === 1 ? "Card" : "Cards"}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// Review Item Component
// ------------------------------------------------------------------

interface ReviewItemProps {
  suggestion: SuggestionViewModel;
  onToggleSelection: (tempId: string) => void;
  onEditSuggestion: (tempId: string, field: "front" | "back", value: string) => void;
}

function ReviewItem({ suggestion, onToggleSelection, onEditSuggestion }: ReviewItemProps) {
  return (
    <div className={`rounded-md border p-3 transition-opacity ${!suggestion.isSelected ? "opacity-50" : ""}`}>
      <div className="mb-2 flex items-center gap-2">
        <Checkbox
          checked={suggestion.isSelected}
          onCheckedChange={() => onToggleSelection(suggestion.tempId)}
          aria-label={suggestion.isSelected ? "Deselect this card" : "Select this card"}
        />
        {suggestion.isEdited && <span className="text-xs text-amber-500">(edited)</span>}
      </div>

      <div className="space-y-2">
        <div>
          <Label className="text-xs text-muted-foreground">Front</Label>
          <Textarea
            value={suggestion.front}
            onChange={(e) => onEditSuggestion(suggestion.tempId, "front", e.target.value)}
            className="mt-1 min-h-[60px] resize-none text-sm"
            disabled={!suggestion.isSelected}
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Back</Label>
          <Textarea
            value={suggestion.back}
            onChange={(e) => onEditSuggestion(suggestion.tempId, "back", e.target.value)}
            className="mt-1 min-h-[60px] resize-none text-sm"
            disabled={!suggestion.isSelected}
          />
        </div>
      </div>
    </div>
  );
}
