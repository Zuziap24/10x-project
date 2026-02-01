import { useState, useEffect, useCallback } from "react";
import { QueryClient, QueryClientProvider, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Toaster, toast } from "sonner";
import { Plus, BookOpen, Clock, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Label } from "../ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/card";
import type { DeckDto, CreateDeckCommand, PaginatedResponse, ApiError } from "../../types";

// ------------------------------------------------------------------
// API Functions
// ------------------------------------------------------------------

async function fetchDecks(): Promise<PaginatedResponse<DeckDto>> {
  const response = await fetch("/api/decks");
  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({
      error: { code: "UNKNOWN", message: "Failed to fetch decks" },
    }));
    throw new Error(error.error.message);
  }
  return response.json();
}

async function createDeck(data: CreateDeckCommand): Promise<DeckDto> {
  const response = await fetch("/api/decks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({
      error: { code: "UNKNOWN", message: "Failed to create deck" },
    }));
    throw new Error(error.error.message);
  }
  return response.json();
}

// ------------------------------------------------------------------
// Query Client
// ------------------------------------------------------------------

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

// ------------------------------------------------------------------
// Main Component
// ------------------------------------------------------------------

export function DashboardPage() {
  return (
    <QueryClientProvider client={queryClient}>
      <DashboardContent />
      <Toaster position="bottom-right" richColors />
    </QueryClientProvider>
  );
}

// ------------------------------------------------------------------
// Dashboard Content
// ------------------------------------------------------------------

function DashboardContent() {
  const queryClient = useQueryClient();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["decks"],
    queryFn: fetchDecks,
  });

  const createMutation = useMutation({
    mutationFn: createDeck,
    onSuccess: (newDeck) => {
      queryClient.invalidateQueries({ queryKey: ["decks"] });
      toast.success(`Deck "${newDeck.name}" created successfully`);
      setCreateDialogOpen(false);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleCreateDeck = useCallback(
    async (data: CreateDeckCommand) => {
      await createMutation.mutateAsync(data);
    },
    [createMutation]
  );

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-6xl px-4 py-8">
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto max-w-6xl px-4 py-8">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <h1 className="mb-2 text-2xl font-bold text-destructive">Error Loading Decks</h1>
          <p className="mb-4 text-muted-foreground">{error instanceof Error ? error.message : "An error occurred"}</p>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </div>
      </div>
    );
  }

  const decks = data?.data || [];

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Decks</h1>
          <p className="text-muted-foreground">Manage your flashcard decks</p>
        </div>
        <CreateDeckDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          onSubmit={handleCreateDeck}
          isLoading={createMutation.isPending}
        />
      </div>

      {/* Decks Grid */}
      {decks.length === 0 ? (
        <EmptyState onCreateClick={() => setCreateDialogOpen(true)} />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {decks.map((deck) => (
            <DeckCard key={deck.id} deck={deck} />
          ))}
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------
// Deck Card
// ------------------------------------------------------------------

interface DeckCardProps {
  deck: DeckDto;
}

function DeckCard({ deck }: DeckCardProps) {
  return (
    <Card className="group transition-shadow hover:shadow-md" data-testid="deck-card">
      <CardHeader>
        <CardTitle className="line-clamp-1">{deck.name}</CardTitle>
        {deck.description && <CardDescription className="line-clamp-2">{deck.description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <BookOpen className="h-4 w-4" />
            <span>{deck.flashcard_count} cards</span>
          </div>
          {deck.due_flashcard_count > 0 && (
            <div className="flex items-center gap-1 text-orange-600">
              <Clock className="h-4 w-4" />
              <span>{deck.due_flashcard_count} due</span>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter>
        <a href={`/decks/${deck.id}`} className="w-full">
          <Button
            variant="outline"
            className="w-full group-hover:bg-primary group-hover:text-primary-foreground"
            data-testid="open-deck-button"
          >
            <span>Open Deck</span>
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </a>
      </CardFooter>
    </Card>
  );
}

// ------------------------------------------------------------------
// Empty State
// ------------------------------------------------------------------

interface EmptyStateProps {
  onCreateClick: () => void;
}

function EmptyState({ onCreateClick }: EmptyStateProps) {
  return (
    <div
      className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center"
      data-testid="empty-state"
    >
      <BookOpen className="mb-4 h-12 w-12 text-muted-foreground" />
      <h2 className="mb-2 text-xl font-semibold">No decks yet</h2>
      <p className="mb-6 max-w-sm text-muted-foreground">
        Create your first deck to start generating flashcards with AI or manually.
      </p>
      <Button onClick={onCreateClick} data-testid="create-first-deck-button">
        <Plus className="mr-2 h-4 w-4" />
        Create Your First Deck
      </Button>
    </div>
  );
}

// ------------------------------------------------------------------
// Create Deck Dialog
// ------------------------------------------------------------------

interface CreateDeckDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateDeckCommand) => Promise<void>;
  isLoading: boolean;
}

function CreateDeckDialog({ open, onOpenChange, onSubmit, isLoading }: CreateDeckDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setName("");
      setDescription("");
      setError(null);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    if (name.length > 100) {
      setError("Name must be 100 characters or less");
      return;
    }

    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim() || null,
      });
    } catch {
      // Error is handled by mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button data-testid="new-deck-button">
          <Plus className="mr-2 h-4 w-4" />
          New Deck
        </Button>
      </DialogTrigger>
      <DialogContent data-testid="create-deck-dialog">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Deck</DialogTitle>
            <DialogDescription>Create a new flashcard deck to organize your learning materials.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="e.g., JavaScript Fundamentals"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoading}
                data-testid="deck-name-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                placeholder="A brief description of this deck..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isLoading}
                rows={3}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} data-testid="create-deck-submit">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Deck"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
