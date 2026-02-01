import type { APIRoute } from "astro";
import type { DeckDto, CreateDeckCommand, PaginatedResponse, ApiError } from "../../../types";
import { z } from "zod";
import { Logger } from "../../../lib/logger";

export const prerender = false;

const logger = new Logger("api/decks");

// Validation schema for creating a deck
const createDeckSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be 100 characters or less"),
  description: z.string().max(500, "Description must be 500 characters or less").nullable().optional(),
});

/**
 * GET /api/decks
 *
 * Fetches all decks for the authenticated user with flashcard counts.
 *
 * Authentication: Required
 *
 * @returns 200 - Success with paginated deck data
 * @returns 401 - Authentication error
 * @returns 500 - Internal server error
 */
export const GET: APIRoute = async (context) => {
  try {
    // Authenticate user via Supabase
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

    // Parse pagination parameters
    const url = new URL(context.request.url);
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "20"), 100);
    const offset = parseInt(url.searchParams.get("offset") || "0");

    // Fetch decks from database
    const {
      data: decks,
      error: decksError,
      count,
    } = await supabase
      .from("decks")
      .select("*", { count: "exact" })
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (decksError) {
      throw new Error("Failed to fetch decks");
    }

    // For each deck, get flashcard counts
    const decksWithCounts: DeckDto[] = await Promise.all(
      (decks || []).map(async (deck) => {
        // Count total flashcards
        const { count: flashcardCount } = await supabase
          .from("flashcards")
          .select("*", { count: "exact", head: true })
          .eq("deck_id", deck.id);

        // Count due flashcards
        const { count: dueCount } = await supabase
          .from("flashcards")
          .select("*", { count: "exact", head: true })
          .eq("deck_id", deck.id)
          .lte("next_review_at", new Date().toISOString());

        return {
          ...deck,
          flashcard_count: flashcardCount || 0,
          due_flashcard_count: dueCount || 0,
        };
      })
    );

    const response: PaginatedResponse<DeckDto> = {
      data: decksWithCounts,
      pagination: {
        limit,
        offset,
        total: count || 0,
      },
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    logger.error(error instanceof Error ? error : new Error("Unknown error"), { action: "fetch_decks" });
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

/**
 * POST /api/decks
 *
 * Creates a new deck for the authenticated user.
 *
 * Authentication: Required
 *
 * @body name - Required deck name
 * @body description - Optional deck description
 *
 * @returns 201 - Success with created deck data
 * @returns 400 - Validation error
 * @returns 401 - Authentication error
 * @returns 500 - Internal server error
 */
export const POST: APIRoute = async (context) => {
  try {
    // Authenticate user via Supabase
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

    // Parse and validate request body
    let body: CreateDeckCommand;
    try {
      body = await context.request.json();
    } catch {
      return new Response(
        JSON.stringify({
          error: {
            code: "INVALID_JSON",
            message: "Request body must be valid JSON",
          },
        } satisfies ApiError),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const validation = createDeckSchema.safeParse(body);
    if (!validation.success) {
      return new Response(
        JSON.stringify({
          error: {
            code: "VALIDATION_ERROR",
            message: validation.error.errors[0]?.message || "Invalid input",
            details: validation.error.flatten().fieldErrors,
          },
        } satisfies ApiError),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Create the deck
    const { data: deck, error: createError } = await supabase
      .from("decks")
      .insert({
        name: validation.data.name,
        description: validation.data.description || null,
        user_id: user.id,
      })
      .select()
      .single();

    if (createError || !deck) {
      logger.error(new Error(`Failed to create deck: ${createError?.message || "No data returned"}`), {
        action: "create_deck",
        supabaseError: createError,
        userId: user.id,
      });
      throw new Error("Failed to create deck");
    }

    // Return deck with counts (new deck has 0 flashcards)
    const deckDto: DeckDto = {
      ...deck,
      flashcard_count: 0,
      due_flashcard_count: 0,
    };

    return new Response(JSON.stringify(deckDto), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    logger.error(error instanceof Error ? error : new Error("Unknown error"), { action: "create_deck" });
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
