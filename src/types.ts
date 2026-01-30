import type { Database } from "./db/database.types";

/**
 * Helper type to access Table Row definitions from Supabase generated types.
 */
type TableRow<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"];

/**
 * Flashcard source types as defined in API plan.
 * Used to type the 'source' field more strictly than the database 'string'.
 */
export type FlashcardSource = "ai-full" | "ai-edited" | "manual";

// ------------------------------------------------------------------
// Shared Types
// ------------------------------------------------------------------

export interface PaginationMeta {
  limit: number;
  offset: number;
  total: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

// ------------------------------------------------------------------
// Decks
// ------------------------------------------------------------------

/**
 * Data Transfer Object for a Deck.
 * Extends the database entity with computed counts.
 */
export type DeckDto = TableRow<"decks"> & {
  flashcard_count: number;
  due_flashcard_count: number;
};

/**
 * Command to create a new deck.
 * 'name' is required, 'description' is optional/nullable.
 */
export type CreateDeckCommand = Pick<TableRow<"decks">, "name"> & {
  description?: string | null;
};

/**
 * Command to update an existing deck.
 * Partial of CreateDeckCommand.
 */
export type UpdateDeckCommand = Partial<CreateDeckCommand>;

// ------------------------------------------------------------------
// Flashcards
// ------------------------------------------------------------------

/**
 * Data Transfer Object for a Flashcard.
 * Overrides the 'source' field to use the specific union type.
 */
export type FlashcardDto = Omit<TableRow<"flashcards">, "source"> & {
  source: FlashcardSource;
};

/**
 * Command to manually create a new flashcard.
 * Only requires content fields.
 */
export type CreateFlashcardCommand = Pick<TableRow<"flashcards">, "front" | "back">;

/**
 * Command to update flashcard content.
 */
export type UpdateFlashcardCommand = Partial<CreateFlashcardCommand>;

/**
 * Command to submit a spaced repetition review.
 * quality: 0-5 scale.
 */
export interface ReviewFlashcardCommand {
  quality: number;
  review_duration_ms?: number;
}

/**
 * Special response shape for "Get Due Flashcards" endpoint.
 */
export interface DueFlashcardsResponseDto {
  data: FlashcardDto[];
  total_due: number;
}

// ------------------------------------------------------------------
// AI Generations
// ------------------------------------------------------------------

/**
 * DTO for Generation History log.
 * Maps directly to the database entity.
 */
export type GenerationHistoryDto = TableRow<"generations">;

/**
 * Command to initiate AI flashcard generation.
 */
export interface GenerateFlashcardsCommand {
  source_text: string;
  model?: string;
  count?: number;
}

/**
 * Represents a single generated suggestion before it is saved to DB.
 */
export interface GeneratedSuggestionDto {
  front: string;
  back: string;
}

/**
 * Response returned after AI generation is complete (but before acceptance).
 */
export interface GenerateFlashcardsResponseDto {
  generation_id: string;
  suggestions: GeneratedSuggestionDto[];
  model: string;
  generation_duration_ms: number;
}

/**
 * Item structure for the acceptance command.
 */
export interface AcceptFlashcardItem extends GeneratedSuggestionDto {
  was_edited: boolean;
}

/**
 * Command to accept and save specific generated flashcards.
 */
export interface AcceptFlashcardsCommand {
  flashcards: AcceptFlashcardItem[];
}

/**
 * Response after accepting flashcards, returning the created entities.
 */
export interface AcceptFlashcardsResponseDto {
  created_count: number;
  flashcards: FlashcardDto[];
}

// ------------------------------------------------------------------
// Statistics
// ------------------------------------------------------------------

/**
 * Aggregated user statistics.
 * No direct database table mapping; constructed from queries.
 */
export interface UserStatsDto {
  total_decks: number;
  total_flashcards: number;
  flashcards_by_source: Record<FlashcardSource, number>;
  total_due: number;
  total_generations: number;
  avg_generation_duration_ms: number;
  study_streak_days: number;
}
