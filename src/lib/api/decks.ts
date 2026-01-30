import type {
  DeckDto,
  FlashcardDto,
  PaginatedResponse,
  CreateFlashcardCommand,
  UpdateFlashcardCommand,
  GenerateFlashcardsCommand,
  GenerateFlashcardsResponseDto,
  AcceptFlashcardsCommand,
  AcceptFlashcardsResponseDto,
  ApiError,
} from "../../types";

/**
 * Base fetch wrapper with error handling
 */
async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const errorData: ApiError = await response.json().catch(() => ({
      error: {
        code: `HTTP_${response.status}`,
        message: response.statusText || "An error occurred",
      },
    }));

    throw new ApiRequestError(errorData.error.message, errorData.error.code, response.status, errorData.error.details);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

/**
 * Custom error class for API request failures
 */
export class ApiRequestError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

// ------------------------------------------------------------------
// Deck API Functions
// ------------------------------------------------------------------

/**
 * Fetch a single deck by ID
 */
export async function fetchDeck(deckId: string): Promise<DeckDto> {
  return apiFetch<DeckDto>(`/api/decks/${deckId}`);
}

/**
 * Fetch flashcards for a deck with pagination
 */
export interface FetchFlashcardsParams {
  deckId: string;
  limit?: number;
  offset?: number;
  source?: "ai-full" | "ai-edited" | "manual";
  due?: boolean;
  sort?: "created_at" | "next_review_at";
  order?: "asc" | "desc";
}

export async function fetchFlashcards(params: FetchFlashcardsParams): Promise<PaginatedResponse<FlashcardDto>> {
  const { deckId, limit = 50, offset = 0, source, due, sort, order } = params;

  const searchParams = new URLSearchParams();
  searchParams.set("limit", String(limit));
  searchParams.set("offset", String(offset));

  if (source) searchParams.set("source", source);
  if (due !== undefined) searchParams.set("due", String(due));
  if (sort) searchParams.set("sort", sort);
  if (order) searchParams.set("order", order);

  return apiFetch<PaginatedResponse<FlashcardDto>>(`/api/decks/${deckId}/flashcards?${searchParams.toString()}`);
}

// ------------------------------------------------------------------
// Flashcard CRUD Functions
// ------------------------------------------------------------------

/**
 * Create a new flashcard manually
 */
export async function createFlashcard(deckId: string, data: CreateFlashcardCommand): Promise<FlashcardDto> {
  return apiFetch<FlashcardDto>(`/api/decks/${deckId}/flashcards`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/**
 * Update an existing flashcard
 */
export async function updateFlashcard(flashcardId: string, data: UpdateFlashcardCommand): Promise<FlashcardDto> {
  return apiFetch<FlashcardDto>(`/api/flashcards/${flashcardId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

/**
 * Delete a flashcard
 */
export async function deleteFlashcard(flashcardId: string): Promise<void> {
  await apiFetch<undefined>(`/api/flashcards/${flashcardId}`, { method: "DELETE" });
}

// ------------------------------------------------------------------
// AI Generation Functions
// ------------------------------------------------------------------

/**
 * Generate flashcard suggestions using AI
 */
export async function generateFlashcards(
  deckId: string,
  data: GenerateFlashcardsCommand
): Promise<GenerateFlashcardsResponseDto> {
  return apiFetch<GenerateFlashcardsResponseDto>(`/api/decks/${deckId}/generate`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/**
 * Accept and save selected AI-generated flashcards
 */
export async function acceptFlashcards(
  generationId: string,
  data: AcceptFlashcardsCommand
): Promise<AcceptFlashcardsResponseDto> {
  return apiFetch<AcceptFlashcardsResponseDto>(`/api/generations/${generationId}/accept`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}
