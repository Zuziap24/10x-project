import { useCallback } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FlashcardItem } from "./FlashcardItem";
import type { FlashcardDto } from "../../types";

interface FlashcardListProps {
  flashcards: FlashcardDto[];
  isLoading: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  onLoadMore: () => void;
  onEdit: (flashcard: FlashcardDto) => void;
  onDelete: (flashcard: FlashcardDto) => void;
}

/**
 * Displays a grid of flashcards with "Load More" pagination.
 * Handles loading, empty, and error states.
 */
export function FlashcardList({
  flashcards,
  isLoading,
  isFetchingNextPage,
  hasNextPage,
  onLoadMore,
  onEdit,
  onDelete,
}: FlashcardListProps) {
  const handleLoadMore = useCallback(() => {
    onLoadMore();
  }, [onLoadMore]);

  // Loading skeleton for initial load
  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <FlashcardSkeleton key={i} />
        ))}
      </div>
    );
  }

  // Empty state
  if (flashcards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
        <p className="mb-2 text-lg font-medium text-muted-foreground">No flashcards yet</p>
        <p className="text-sm text-muted-foreground">Add cards manually or generate them with AI</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {flashcards.map((flashcard) => (
          <FlashcardItem key={flashcard.id} flashcard={flashcard} onEdit={onEdit} onDelete={onDelete} />
        ))}
      </div>

      {/* Load More Button */}
      {hasNextPage && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={handleLoadMore} disabled={isFetchingNextPage}>
            {isFetchingNextPage ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              "Load More"
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * Skeleton placeholder for a flashcard during loading state
 */
function FlashcardSkeleton() {
  return (
    <div className="rounded-lg border p-4">
      <div className="mb-3 flex items-start justify-between">
        <Skeleton className="h-5 w-16" />
      </div>
      <div className="space-y-3">
        <div>
          <Skeleton className="mb-1 h-3 w-10" />
          <Skeleton className="h-4 w-full" />
        </div>
        <div className="border-t pt-3">
          <Skeleton className="mb-1 h-3 w-10" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    </div>
  );
}
