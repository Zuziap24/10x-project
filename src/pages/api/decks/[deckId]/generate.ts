import type { APIRoute } from "astro";
import { generateFlashcardsSchema } from "../../../../lib/validators/generation.validator";
import { AIGenerationService, AIGenerationError } from "../../../../lib/services/ai-generation.service";
import { calculateSHA256 } from "../../../../lib/utils/hash";
import { checkGenerationRateLimit } from "../../../../lib/utils/rate-limit";
import { Logger } from "../../../../lib/logger";
import type { GenerateFlashcardsResponseDto, ApiError } from "../../../../types";
export const prerender = false;

const logger = new Logger("api/decks/generate");

/**
 * POST /api/decks/:deckId/generate
 *
 * Generates flashcard suggestions from source text using AI models.
 * This endpoint does NOT persist flashcards - they must be accepted via a separate endpoint.
 *
 * Authentication: Required (JWT token via Supabase)
 * Rate Limit: 10 requests per hour per user
 *
 * @param deckId - UUID of the deck (must belong to authenticated user)
 * @param body.source_text - Text to generate flashcards from (1000-10000 chars)
 * @param body.model - AI model to use (optional, default: "openai/gpt-4o")
 * @param body.count - Number of flashcards to generate (optional, 5-20, default: 10)
 *
 * @returns 200 - Success with generation_id and suggestions
 * @returns 400 - Validation error (invalid input)
 * @returns 401 - Authentication error (invalid/expired token)
 * @returns 403 - Authorization error (deck belongs to another user)
 * @returns 404 - Deck not found
 * @returns 422 - AI generation failed
 * @returns 429 - Rate limit exceeded
 * @returns 500 - Internal server error
 */
export const POST: APIRoute = async (context) => {
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

    // Step 3: Parse and validate request body
    const body = await context.request.json();
    const validationResult = generateFlashcardsSchema.safeParse(body);

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

    const { source_text, model, count } = validationResult.data;

    // Step 4: Verify deck exists and belongs to authenticated user
    const { data: deck, error: deckError } = await supabase
      .from("decks")
      .select("id, user_id")
      .eq("id", deckId)
      .single();

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

    // Step 5: Check rate limit (10 generations per hour)
    const withinRateLimit = await checkGenerationRateLimit(supabase, user.id);

    if (!withinRateLimit) {
      return new Response(
        JSON.stringify({
          error: {
            code: "RATE_LIMIT_EXCEEDED",
            message: "Generation rate limit exceeded. Please try again later.",
          },
        } satisfies ApiError),
        { status: 429, headers: { "Content-Type": "application/json" } }
      );
    }

    // Step 6: Calculate source text metadata for analytics
    const sourceTextHash = calculateSHA256(source_text);
    const sourceTextLength = source_text.length;

    // Step 7: Generate flashcards using AI service (with mocks in development)
    const useMockAI = import.meta.env.USE_MOCK_AI !== "false";
    console.log("[Generate Endpoint] useMockAI:", useMockAI, "model:", model);
    const aiService = new AIGenerationService(import.meta.env.OPENROUTER_API_KEY || "", useMockAI);

    const { suggestions, generationDuration } = await aiService.generateFlashcards({
      sourceText: source_text,
      model,
      count,
    });

    // Step 8: Log successful generation to database
    const { data: generation, error: generationError } = await supabase
      .from("generations")
      .insert({
        user_id: user.id,
        model,
        source_text_hash: sourceTextHash,
        source_text_length: sourceTextLength,
        generated_count: suggestions.length,
        generation_duration: generationDuration,
      })
      .select("id")
      .single();

    if (generationError || !generation) {
      throw new Error("Failed to create generation record");
    }

    // Step 9: Return success response with suggestions
    const response: GenerateFlashcardsResponseDto = {
      generation_id: generation.id,
      suggestions,
      model,
      generation_duration_ms: generationDuration,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Handle AI generation errors
    if (error instanceof AIGenerationError) {
      // Log detailed error information for debugging
      logger.error(error, {
        errorCode: error.errorCode,
        cause: error.cause instanceof Error ? error.cause.message : String(error.cause),
      });

      // Log error to database
      try {
        const supabase = context.locals.supabase;
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          await supabase.from("generation_error_logs").insert({
            user_id: user.id,
            model: "unknown",
            error_code: error.errorCode || "UNKNOWN_ERROR",
            error_message: error.message,
          });
        }
      } catch {
        // Silently fail - don't block error response
      }

      return new Response(
        JSON.stringify({
          error: {
            code: "AI_GENERATION_FAILED",
            message: "Failed to generate flashcards from the provided text",
            details: {
              error: error.message,
              errorCode: error.errorCode,
            },
          },
        } satisfies ApiError),
        { status: 422, headers: { "Content-Type": "application/json" } }
      );
    }

    // Handle unexpected errors
    const unexpectedError = error instanceof Error ? error : new Error(String(error));
    logger.error(unexpectedError, { endpoint: "generate" });

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
