import type { APIRoute } from "astro";
import { z } from "zod";
import type { AcceptFlashcardsResponseDto, FlashcardDto, ApiError, FlashcardSource } from "../../../../types";

export const prerender = false;

// Accept flashcards validation schema
const acceptFlashcardsSchema = z.object({
  flashcards: z
    .array(
      z.object({
        front: z.string().min(1).max(5000),
        back: z.string().min(1).max(10000),
        was_edited: z.boolean(),
      })
    )
    .min(1, "At least one flashcard must be provided")
    .max(50, "Maximum 50 flashcards can be accepted at once"),
});

/**
 * POST /api/generations/:generationId/accept
 *
 * Accepts and saves selected AI-generated flashcards.
 * This endpoint creates actual flashcard records from generation suggestions.
 *
 * @param generationId - UUID of the generation record
 * @param body.flashcards - Array of flashcards to accept
 */
export const POST: APIRoute = async (context) => {
  try {
    const generationId = context.params.generationId;

    if (!generationId) {
      return new Response(
        JSON.stringify({
          error: { code: "VALIDATION_ERROR", message: "Generation ID is required" },
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
    const validationResult = acceptFlashcardsSchema.safeParse(body);

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

    const { flashcards: flashcardsToAccept } = validationResult.data;

    // Verify generation exists and belongs to user
    const { data: generation, error: generationError } = await supabase
      .from("generations")
      .select("id, user_id")
      .eq("id", generationId)
      .single();

    if (generationError || !generation) {
      return new Response(
        JSON.stringify({
          error: { code: "GENERATION_NOT_FOUND", message: "Generation not found" },
        } satisfies ApiError),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    if (generation.user_id !== user.id) {
      return new Response(
        JSON.stringify({
          error: { code: "FORBIDDEN", message: "You do not have access to this generation" },
        } satisfies ApiError),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get the deck_id from URL query param or find from existing flashcards with this generation
    const url = new URL(context.request.url);
    let deckId = url.searchParams.get("deck_id");

    if (!deckId) {
      // Try to find deck_id from existing flashcards with this generation_id
      const { data: existingFlashcard } = await supabase
        .from("flashcards")
        .select("deck_id")
        .eq("generation_id", generationId)
        .limit(1)
        .single();

      if (existingFlashcard) {
        deckId = existingFlashcard.deck_id;
      } else {
        // If no existing flashcards, we need deck_id to be provided
        // Try to get from most recent deck
        const { data: recentDeck } = await supabase
          .from("decks")
          .select("id")
          .eq("user_id", user.id)
          .order("updated_at", { ascending: false })
          .limit(1)
          .single();

        if (!recentDeck) {
          return new Response(
            JSON.stringify({
              error: {
                code: "VALIDATION_ERROR",
                message: "deck_id query parameter is required",
              },
            } satisfies ApiError),
            { status: 400, headers: { "Content-Type": "application/json" } }
          );
        }

        deckId = recentDeck.id;
      }
    }

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

    // At this point deckId is guaranteed to be set
    const finalDeckId = deckId;

    // Prepare flashcards for insertion
    const flashcardsToInsert = flashcardsToAccept.map((fc) => ({
      deck_id: finalDeckId,
      user_id: user.id,
      generation_id: generationId,
      front: fc.front,
      back: fc.back,
      source: fc.was_edited ? "ai-edited" : "ai-full",
    }));

    // Insert flashcards
    const { data: createdFlashcards, error: insertError } = await supabase
      .from("flashcards")
      .insert(flashcardsToInsert)
      .select();

    if (insertError || !createdFlashcards) {
      throw new Error("Failed to create flashcards");
    }

    // Build response
    const response: AcceptFlashcardsResponseDto = {
      created_count: createdFlashcards.length,
      flashcards: createdFlashcards.map((fc) => ({
        ...fc,
        source: fc.source as FlashcardSource,
      })) as FlashcardDto[],
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
