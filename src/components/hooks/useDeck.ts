import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import {
  fetchDeck,
  fetchFlashcards,
  createFlashcard,
  updateFlashcard,
  deleteFlashcard,
  generateFlashcards,
  acceptFlashcards,
  type FetchFlashcardsParams,
} from "../../lib/api/decks";
import type {
  CreateFlashcardCommand,
  UpdateFlashcardCommand,
  GenerateFlashcardsCommand,
  AcceptFlashcardsCommand,
} from "../../types";

// Query keys factory for consistent key management
export const deckKeys = {
  all: ["decks"] as const,
  detail: (id: string) => [...deckKeys.all, id] as const,
  flashcards: (deckId: string) => [...deckKeys.detail(deckId), "flashcards"] as const,
  flashcardsList: (deckId: string, params?: Partial<FetchFlashcardsParams>) =>
    [...deckKeys.flashcards(deckId), params] as const,
};

/**
 * Hook to fetch a single deck by ID
 */
export function useDeck(deckId: string) {
  return useQuery({
    queryKey: deckKeys.detail(deckId),
    queryFn: () => fetchDeck(deckId),
    enabled: !!deckId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch flashcards with infinite scroll support
 */
export function useFlashcards(deckId: string, params?: Omit<FetchFlashcardsParams, "deckId" | "offset">) {
  const limit = params?.limit ?? 20;

  return useInfiniteQuery({
    queryKey: deckKeys.flashcardsList(deckId, params),
    queryFn: ({ pageParam = 0 }) =>
      fetchFlashcards({
        deckId,
        ...params,
        limit,
        offset: pageParam,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const totalFetched = allPages.reduce((acc, page) => acc + page.data.length, 0);
      if (totalFetched >= lastPage.pagination.total) {
        return undefined;
      }
      return totalFetched;
    },
    enabled: !!deckId,
  });
}

/**
 * Hook to create a new flashcard manually
 */
export function useCreateFlashcard(deckId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateFlashcardCommand) => createFlashcard(deckId, data),
    onSuccess: () => {
      // Invalidate flashcards list and deck (for count update)
      queryClient.invalidateQueries({ queryKey: deckKeys.flashcards(deckId) });
      queryClient.invalidateQueries({ queryKey: deckKeys.detail(deckId) });
    },
  });
}

/**
 * Hook to update an existing flashcard
 */
export function useUpdateFlashcard(deckId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ flashcardId, data }: { flashcardId: string; data: UpdateFlashcardCommand }) =>
      updateFlashcard(flashcardId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: deckKeys.flashcards(deckId) });
    },
  });
}

/**
 * Hook to delete a flashcard
 */
export function useDeleteFlashcard(deckId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (flashcardId: string) => deleteFlashcard(flashcardId),
    onSuccess: () => {
      // Invalidate flashcards list and deck (for count update)
      queryClient.invalidateQueries({ queryKey: deckKeys.flashcards(deckId) });
      queryClient.invalidateQueries({ queryKey: deckKeys.detail(deckId) });
    },
  });
}

/**
 * Hook to generate AI flashcard suggestions
 */
export function useGenerateFlashcards(deckId: string) {
  return useMutation({
    mutationFn: (data: GenerateFlashcardsCommand) => generateFlashcards(deckId, data),
  });
}

/**
 * Hook to accept and save AI-generated flashcards
 */
export function useAcceptFlashcards(deckId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ generationId, data }: { generationId: string; data: AcceptFlashcardsCommand }) =>
      acceptFlashcards(generationId, data),
    onSuccess: () => {
      // Invalidate flashcards list and deck (for count update)
      queryClient.invalidateQueries({ queryKey: deckKeys.flashcards(deckId) });
      queryClient.invalidateQueries({ queryKey: deckKeys.detail(deckId) });
    },
  });
}
