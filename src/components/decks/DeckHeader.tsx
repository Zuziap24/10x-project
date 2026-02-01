import { memo } from "react";
import { BookOpen, Plus, Sparkles, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { DeckDto } from "../../types";

interface DeckHeaderProps {
  deck: DeckDto | undefined;
  isLoading: boolean;
  onAddManual: () => void;
  onGenerateAI: () => void;
}

/**
 * Displays deck title, description, stats, and action buttons.
 */
export const DeckHeader = memo(function DeckHeader({ deck, isLoading, onAddManual, onGenerateAI }: DeckHeaderProps) {
  if (isLoading || !deck) {
    return <DeckHeaderSkeleton />;
  }

  return (
    <header className="mb-8 space-y-4" data-testid="deck-header">
      {/* Back link */}
      <a
        href="/dashboard"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        data-testid="back-to-dashboard-link"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </a>

      {/* Title and Stats */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight" data-testid="deck-title">
            {deck.name}
          </h1>
          {deck.description && <p className="text-muted-foreground">{deck.description}</p>}

          {/* Stats Badges */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="gap-1">
              <BookOpen className="h-3 w-3" />
              {deck.flashcard_count} {deck.flashcard_count === 1 ? "card" : "cards"}
            </Badge>
            {deck.due_flashcard_count > 0 && (
              <Badge variant="default" className="gap-1">
                {deck.due_flashcard_count} due
              </Badge>
            )}
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-wrap gap-2">
          {deck.due_flashcard_count > 0 && (
            <Button asChild>
              <a href={`/decks/${deck.id}/study`}>
                <BookOpen className="mr-2 h-4 w-4" />
                Study ({deck.due_flashcard_count})
              </a>
            </Button>
          )}

          <Button variant="outline" onClick={onAddManual} data-testid="add-flashcard-button">
            <Plus className="mr-2 h-4 w-4" />
            Add Flashcard
          </Button>

          <Button variant="secondary" onClick={onGenerateAI} data-testid="generate-ai-button">
            <Sparkles className="mr-2 h-4 w-4" />
            Generate with AI
          </Button>
        </div>
      </div>
    </header>
  );
});

/**
 * Skeleton placeholder for the header during loading state
 */
function DeckHeaderSkeleton() {
  return (
    <header className="mb-8 space-y-4">
      <Skeleton className="h-4 w-32" />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-5 w-96" />
          <div className="flex gap-2">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-16" />
          </div>
        </div>

        <div className="flex gap-2">
          <Skeleton className="h-10 w-28" />
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-36" />
        </div>
      </div>
    </header>
  );
}
