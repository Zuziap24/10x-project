import { memo, useCallback } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { FlashcardDto } from "../../types";

interface FlashcardItemProps {
  flashcard: FlashcardDto;
  onEdit: (flashcard: FlashcardDto) => void;
  onDelete: (flashcard: FlashcardDto) => void;
}

/**
 * Displays a single flashcard with front/back content and action buttons.
 * Uses memo to prevent unnecessary re-renders.
 */
export const FlashcardItem = memo(function FlashcardItem({ flashcard, onEdit, onDelete }: FlashcardItemProps) {
  const handleEdit = useCallback(() => {
    onEdit(flashcard);
  }, [flashcard, onEdit]);

  const handleDelete = useCallback(() => {
    onDelete(flashcard);
  }, [flashcard, onDelete]);

  // Map source to display label and variant
  const sourceConfig: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
    "ai-full": { label: "AI", variant: "default" },
    "ai-edited": { label: "AI (edited)", variant: "secondary" },
    manual: { label: "Manual", variant: "outline" },
  };

  const { label, variant } = sourceConfig[flashcard.source] ?? { label: "Unknown", variant: "outline" as const };

  return (
    <Card className="group relative transition-shadow hover:shadow-md">
      <CardContent className="p-4">
        <div className="mb-3 flex items-start justify-between gap-2">
          <Badge variant={variant} className="shrink-0">
            {label}
          </Badge>
          <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleEdit} aria-label="Edit flashcard">
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={handleDelete}
              aria-label="Delete flashcard"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Front</p>
            <p className="text-sm">{flashcard.front}</p>
          </div>

          <div className="border-t pt-3">
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Back</p>
            <p className="text-sm text-muted-foreground">{flashcard.back}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
