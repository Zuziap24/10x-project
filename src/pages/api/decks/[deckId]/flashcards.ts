import type { APIRoute } from "astro";
import { z } from "zod";
import type {
  PaginatedResponse,
  FlashcardDto,
  CreateFlashcardCommand,
  ApiError,
  FlashcardSource,
} from "../../../../types";
import { isFeatureEnabled, featureDisabledResponse } from "../../../../features";

export const prerender = false;

// Query params validation schema
const flashcardsQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
  source: z.enum(["ai-full", "ai-edited", "manual"]).optional(),
  due: z
    .string()
    .optional()
    .transform((val) => (val === "true" ? true : val === "false" ? false : undefined)),
  sort: z.enum(["created_at", "next_review_at"]).default("created_at"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

// Create flashcard validation schema
const createFlashcardSchema = z.object({
  front: z.string().min(1, "Front is required").max(5000, "Front must be at most 5000 characters"),
  back: z.string().min(1, "Back is required").max(10000, "Back must be at most 10000 characters"),
});

/**
 * GET /api/decks/:deckId/flashcards
 *
 * Fetches flashcards for a deck with pagination and filters.
 *
 * Query params:
 * - limit: number (1-100, default 50)
 * - offset: number (min 0, default 0)
 * - source: "ai-full" | "ai-edited" | "manual" (optional)
 * - due: "true" | "false" (optional)
 * - sort: "created_at" | "next_review_at" (default "created_at")
 * - order: "asc" | "desc" (default "desc")
 */
export const GET: APIRoute = async (context) => {
  // Check feature flag
  if (!isFeatureEnabled("collections")) {
    return featureDisabledResponse("Collections");
  }

  try {
    const deckId = context.params.deckId;

    if (!deckId) {
      return new Response(
        JSON.stringify({
          error: { code: "VALIDATION_ERROR", message: "Deck ID is required" },
        } satisfies ApiError),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Authenticate user
    const supabase = context.locals.supabase;
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({
          error: { code: "UNAUTHORIZED", message: "Invalid or expired access token" },
        } satisfies ApiError),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // Parse and validate query params
    const url = new URL(context.request.url);
    const queryParams = Object.fromEntries(url.searchParams.entries());
    const validationResult = flashcardsQuerySchema.safeParse(queryParams);

    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid query parameters",
            details: validationResult.error.flatten(),
          },
        } satisfies ApiError),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { limit, offset, source, due, sort, order } = validationResult.data;

    // Verify deck exists and belongs to user
    const { data: deck, error: deckError } = await supabase
      .from("decks")
      .select("id, user_id")
      .eq("id", deckId)
      .single();

    if (deckError || !deck) {
      return new Response(
        JSON.stringify({
          error: { code: "DECK_NOT_FOUND", message: "Deck not found" },
        } satisfies ApiError),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    if (deck.user_id !== user.id) {
      return new Response(
        JSON.stringify({
          error: { code: "FORBIDDEN", message: "You do not have access to this deck" },
        } satisfies ApiError),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    // Build query
    let query = supabase.from("flashcards").select("*", { count: "exact" }).eq("deck_id", deckId);

    // Apply filters
    if (source) {
      query = query.eq("source", source);
    }

    if (due === true) {
      query = query.lte("next_review_at", new Date().toISOString());
    } else if (due === false) {
      query = query.gt("next_review_at", new Date().toISOString());
    }

    // Apply sorting and pagination
    query = query.order(sort, { ascending: order === "asc" }).range(offset, offset + limit - 1);

    const { data: flashcards, error: flashcardsError, count } = await query;

    if (flashcardsError) {
      throw new Error("Failed to fetch flashcards");
    }

    // Build response
    const response: PaginatedResponse<FlashcardDto> = {
      data: (flashcards ?? []).map((fc) => ({
        ...fc,
        source: fc.source as FlashcardSource,
      })),
      pagination: {
        limit,
        offset,
        total: count ?? 0,
      },
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return new Response(
      JSON.stringify({
        error: { code: "INTERNAL_SERVER_ERROR", message: "An unexpected error occurred" },
      } satisfies ApiError),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

/**
 * POST /api/decks/:deckId/flashcards
 *
 * Creates a new flashcard manually.
 */
export const POST: APIRoute = async (context) => {
  // Check feature flag
  if (!isFeatureEnabled("collections")) {
    return featureDisabledResponse("Collections");
  }

  try {
    const deckId = context.params.deckId;

    if (!deckId) {
      return new Response(
        JSON.stringify({
          error: { code: "VALIDATION_ERROR", message: "Deck ID is required" },
        } satisfies ApiError),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Authenticate user
    const supabase = context.locals.supabase;
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({
          error: { code: "UNAUTHORIZED", message: "Invalid or expired access token" },
        } satisfies ApiError),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // Parse and validate body
    const body = await context.request.json();
    const validationResult = createFlashcardSchema.safeParse(body);

    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid request body",
            details: validationResult.error.flatten(),
          },
        } satisfies ApiError),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { front, back }: CreateFlashcardCommand = validationResult.data;

    // Verify deck exists and belongs to user
    const { data: deck, error: deckError } = await supabase
      .from("decks")
      .select("id, user_id")
      .eq("id", deckId)
      .single();

    if (deckError || !deck) {
      return new Response(
        JSON.stringify({
          error: { code: "DECK_NOT_FOUND", message: "Deck not found" },
        } satisfies ApiError),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    if (deck.user_id !== user.id) {
      return new Response(
        JSON.stringify({
          error: { code: "FORBIDDEN", message: "You do not have access to this deck" },
        } satisfies ApiError),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    // Create flashcard
    const { data: flashcard, error: createError } = await supabase
      .from("flashcards")
      .insert({
        deck_id: deckId,
        user_id: user.id,
        front,
        back,
        source: "manual",
      })
      .select()
      .single();

    if (createError || !flashcard) {
      throw new Error("Failed to create flashcard");
    }

    const response: FlashcardDto = {
      ...flashcard,
      source: flashcard.source as FlashcardSource,
    };

    return new Response(JSON.stringify(response), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return new Response(
      JSON.stringify({
        error: { code: "INTERNAL_SERVER_ERROR", message: "An unexpected error occurred" },
      } satisfies ApiError),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
