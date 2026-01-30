import { useState, useCallback, useMemo } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster, toast } from "sonner";
import { DeckHeader } from "./DeckHeader";
import { FlashcardList } from "./FlashcardList";
import { AIGenerationDialog } from "./AIGenerationDialog";
import { ManualFlashcardDialog } from "./ManualFlashcardDialog";
import { DeleteFlashcardAlert } from "./DeleteFlashcardAlert";
import {
  useDeck,
  useFlashcards,
  useCreateFlashcard,
  useUpdateFlashcard,
  useDeleteFlashcard,
  useGenerateFlashcards,
  useAcceptFlashcards,
} from "../hooks/useDeck";
import type { FlashcardDto, CreateFlashcardCommand, AcceptFlashcardItem } from "../../types";
import { ApiRequestError } from "../../lib/api/decks";

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------

interface DeckDetailsPageProps {
  deckId: string;
}

interface ManualDialogState {
  isOpen: boolean;
  mode: "create" | "edit";
  flashcard: FlashcardDto | null;
}

interface DeleteDialogState {
  isOpen: boolean;
  flashcard: FlashcardDto | null;
}

// ------------------------------------------------------------------
// Query Client
// ------------------------------------------------------------------

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
});

// ------------------------------------------------------------------
// Main Component (with Provider)
// ------------------------------------------------------------------

export function DeckDetailsPage({ deckId }: DeckDetailsPageProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <DeckDetailsContent deckId={deckId} />
      <Toaster position="bottom-right" richColors />
    </QueryClientProvider>
  );
}

// ------------------------------------------------------------------
// Content Component (uses hooks)
// ------------------------------------------------------------------

function DeckDetailsContent({ deckId }: DeckDetailsPageProps) {
  // ------------------------------------------------------------------
  // Data Fetching
  // ------------------------------------------------------------------
  const { data: deck, isLoading: isDeckLoading, error: deckError } = useDeck(deckId);

  const {
    data: flashcardsData,
    isLoading: isFlashcardsLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useFlashcards(deckId);

  // Flatten paginated data
  const flashcards = useMemo(() => {
    if (!flashcardsData?.pages) return [];
    return flashcardsData.pages.flatMap((page) => page.data);
  }, [flashcardsData]);

  // ------------------------------------------------------------------
  // Mutations
  // ------------------------------------------------------------------
  const createFlashcard = useCreateFlashcard(deckId);
  const updateFlashcard = useUpdateFlashcard(deckId);
  const deleteFlashcard = useDeleteFlashcard(deckId);
  const generateFlashcards = useGenerateFlashcards(deckId);
  const acceptFlashcards = useAcceptFlashcards(deckId);

  // ------------------------------------------------------------------
  // UI State
  // ------------------------------------------------------------------
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [manualDialog, setManualDialog] = useState<ManualDialogState>({
    isOpen: false,
    mode: "create",
    flashcard: null,
  });
  const [deleteDialog, setDeleteDialog] = useState<DeleteDialogState>({
    isOpen: false,
    flashcard: null,
  });

  // ------------------------------------------------------------------
  // Handlers
  // ------------------------------------------------------------------

  // Open AI Generation dialog
  const handleOpenAiDialog = useCallback(() => {
    setAiDialogOpen(true);
  }, []);

  // Open Manual dialog for creating new card
  const handleOpenCreateDialog = useCallback(() => {
    setManualDialog({ isOpen: true, mode: "create", flashcard: null });
  }, []);

  // Open Manual dialog for editing existing card
  const handleEditFlashcard = useCallback((flashcard: FlashcardDto) => {
    setManualDialog({ isOpen: true, mode: "edit", flashcard });
  }, []);

  // Open Delete confirmation dialog
  const handleDeleteFlashcard = useCallback((flashcard: FlashcardDto) => {
    setDeleteDialog({ isOpen: true, flashcard });
  }, []);

  // Close Manual dialog
  const handleCloseManualDialog = useCallback((open: boolean) => {
    if (!open) {
      setManualDialog((prev) => ({ ...prev, isOpen: false }));
    }
  }, []);

  // Close Delete dialog
  const handleCloseDeleteDialog = useCallback((open: boolean) => {
    if (!open) {
      setDeleteDialog((prev) => ({ ...prev, isOpen: false }));
    }
  }, []);

  // Handle AI generation
  const handleGenerate = useCallback(
    async (sourceText: string) => {
      const result = await generateFlashcards.mutateAsync({
        source_text: sourceText,
        count: 10,
      });

      return {
        generationId: result.generation_id,
        suggestions: result.suggestions,
      };
    },
    [generateFlashcards]
  );

  // Handle accepting AI-generated cards
  const handleAcceptFlashcards = useCallback(
    async (generationId: string, flashcardsToAccept: AcceptFlashcardItem[]) => {
      await acceptFlashcards.mutateAsync({
        generationId,
        data: { flashcards: flashcardsToAccept },
      });

      toast.success(`Created ${flashcardsToAccept.length} flashcard${flashcardsToAccept.length === 1 ? "" : "s"}`);
    },
    [acceptFlashcards]
  );

  // Handle manual card submission (create or update)
  const handleManualSubmit = useCallback(
    async (data: CreateFlashcardCommand) => {
      try {
        if (manualDialog.mode === "create") {
          await createFlashcard.mutateAsync(data);
          toast.success("Flashcard created successfully");
        } else if (manualDialog.flashcard) {
          await updateFlashcard.mutateAsync({
            flashcardId: manualDialog.flashcard.id,
            data,
          });
          toast.success("Flashcard updated successfully");
        }
        setManualDialog((prev) => ({ ...prev, isOpen: false }));
      } catch (error) {
        const message = error instanceof ApiRequestError ? error.message : "An error occurred";
        toast.error(message);
        throw error;
      }
    },
    [manualDialog, createFlashcard, updateFlashcard]
  );

  // Handle delete confirmation
  const handleConfirmDelete = useCallback(async () => {
    if (!deleteDialog.flashcard) return;

    try {
      await deleteFlashcard.mutateAsync(deleteDialog.flashcard.id);
      toast.success("Flashcard deleted successfully");
      setDeleteDialog({ isOpen: false, flashcard: null });
    } catch (error) {
      const message = error instanceof ApiRequestError ? error.message : "Failed to delete flashcard";
      toast.error(message);
    }
  }, [deleteDialog.flashcard, deleteFlashcard]);

  // Handle load more
  const handleLoadMore = useCallback(() => {
    fetchNextPage();
  }, [fetchNextPage]);

  // ------------------------------------------------------------------
  // Error State
  // ------------------------------------------------------------------
  if (deckError) {
    const is404 = deckError instanceof ApiRequestError && deckError.status === 404;

    if (is404) {
      return (
        <div className="container mx-auto max-w-5xl px-4 py-8">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <h1 className="mb-2 text-2xl font-bold">Deck Not Found</h1>
            <p className="mb-4 text-muted-foreground">The deck you&apos;re looking for doesn&apos;t exist.</p>
            <a href="/dashboard" className="text-primary underline hover:no-underline">
              Return to Dashboard
            </a>
          </div>
        </div>
      );
    }

    return (
      <div className="container mx-auto max-w-5xl px-4 py-8">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <h1 className="mb-2 text-2xl font-bold text-destructive">Error Loading Deck</h1>
          <p className="mb-4 text-muted-foreground">
            {deckError instanceof Error ? deckError.message : "An error occurred"}
          </p>
          <button onClick={() => window.location.reload()} className="text-primary underline hover:no-underline">
            Try again
          </button>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      {/* Header */}
      <DeckHeader
        deck={deck}
        isLoading={isDeckLoading}
        onAddManual={handleOpenCreateDialog}
        onGenerateAI={handleOpenAiDialog}
      />

      {/* Flashcard List */}
      <FlashcardList
        flashcards={flashcards}
        isLoading={isFlashcardsLoading}
        isFetchingNextPage={isFetchingNextPage}
        hasNextPage={!!hasNextPage}
        onLoadMore={handleLoadMore}
        onEdit={handleEditFlashcard}
        onDelete={handleDeleteFlashcard}
      />

      {/* AI Generation Dialog */}
      <AIGenerationDialog
        open={aiDialogOpen}
        onOpenChange={setAiDialogOpen}
        onGenerate={handleGenerate}
        onAccept={handleAcceptFlashcards}
        isGenerating={generateFlashcards.isPending}
        isAccepting={acceptFlashcards.isPending}
      />

      {/* Manual Create/Edit Dialog */}
      <ManualFlashcardDialog
        open={manualDialog.isOpen}
        onOpenChange={handleCloseManualDialog}
        mode={manualDialog.mode}
        initialData={manualDialog.flashcard}
        onSubmit={handleManualSubmit}
        isSubmitting={createFlashcard.isPending || updateFlashcard.isPending}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteFlashcardAlert
        open={deleteDialog.isOpen}
        onOpenChange={handleCloseDeleteDialog}
        onConfirm={handleConfirmDelete}
        isDeleting={deleteFlashcard.isPending}
      />
    </div>
  );
}
