import type { APIRoute } from "astro";
import type { DeckDto, ApiError } from "../../../../types";
import { isFeatureEnabled, featureDisabledResponse } from "../../../../features";

export const prerender = false;

/**
 * GET /api/decks/:deckId
 *
 * Fetches a single deck by ID with flashcard counts.
 *
 * Authentication: Required (JWT token via Supabase)
 *
 * @param deckId - UUID of the deck
 *
 * @returns 200 - Success with deck data
 * @returns 401 - Authentication error
 * @returns 403 - Authorization error (deck belongs to another user) or Feature disabled
 * @returns 404 - Deck not found
 * @returns 500 - Internal server error
 */
export const GET: APIRoute = async (context) => {
  // Check feature flag
  if (!isFeatureEnabled("collections")) {
    return featureDisabledResponse("Collections");
  }

  try {
    // Step 1: Extract and validate deck ID from URL params
    const deckId = context.params.deckId;

    if (!deckId) {
      return new Response(
        JSON.stringify({
          error: {
            code: "VALIDATION_ERROR",
            message: "Deck ID is required",
          },
        } satisfies ApiError),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Step 2: Authenticate user via Supabase
    const supabase = context.locals.supabase;
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({
          error: {
            code: "UNAUTHORIZED",
            message: "Invalid or expired access token",
          },
        } satisfies ApiError),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // Step 3: Fetch deck from database
    const { data: deck, error: deckError } = await supabase.from("decks").select("*").eq("id", deckId).single();

    if (deckError || !deck) {
      return new Response(
        JSON.stringify({
          error: {
            code: "DECK_NOT_FOUND",
            message: "Deck not found",
          },
        } satisfies ApiError),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Step 4: Verify deck belongs to authenticated user
    if (deck.user_id !== user.id) {
      return new Response(
        JSON.stringify({
          error: {
            code: "FORBIDDEN",
            message: "You do not have access to this deck",
          },
        } satisfies ApiError),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    // Step 5: Count total flashcards
    const { count: flashcardCount, error: countError } = await supabase
      .from("flashcards")
      .select("*", { count: "exact", head: true })
      .eq("deck_id", deckId);

    if (countError) {
      throw new Error("Failed to count flashcards");
    }

    // Step 6: Count due flashcards (next_review_at <= now)
    const { count: dueCount, error: dueError } = await supabase
      .from("flashcards")
      .select("*", { count: "exact", head: true })
      .eq("deck_id", deckId)
      .lte("next_review_at", new Date().toISOString());

    if (dueError) {
      throw new Error("Failed to count due flashcards");
    }

    // Step 7: Build and return response
    const response: DeckDto = {
      ...deck,
      flashcard_count: flashcardCount ?? 0,
      due_flashcard_count: dueCount ?? 0,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return new Response(
      JSON.stringify({
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "An unexpected error occurred",
        },
      } satisfies ApiError),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
