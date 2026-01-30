import type { APIRoute } from "astro";
import { z } from "zod";
import type { FlashcardDto, ApiError, FlashcardSource } from "../../../types";

export const prerender = false;

// Update flashcard validation schema
const updateFlashcardSchema = z
  .object({
    front: z.string().min(1).max(5000).optional(),
    back: z.string().min(1).max(10000).optional(),
  })
  .refine((data) => data.front !== undefined || data.back !== undefined, {
    message: "At least one field (front or back) must be provided",
  });

/**
 * PATCH /api/flashcards/:flashcardId
 *
 * Updates an existing flashcard's content.
 */
export const PATCH: APIRoute = async (context) => {
  try {
    const flashcardId = context.params.flashcardId;

    if (!flashcardId) {
      return new Response(
        JSON.stringify({
          error: { code: "VALIDATION_ERROR", message: "Flashcard ID is required" },
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
    const validationResult = updateFlashcardSchema.safeParse(body);

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

    const updateData = validationResult.data;

    // Verify flashcard exists and belongs to user
    const { data: existingFlashcard, error: fetchError } = await supabase
      .from("flashcards")
      .select("id, user_id")
      .eq("id", flashcardId)
      .single();

    if (fetchError || !existingFlashcard) {
      return new Response(
        JSON.stringify({
          error: { code: "FLASHCARD_NOT_FOUND", message: "Flashcard not found" },
        } satisfies ApiError),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    if (existingFlashcard.user_id !== user.id) {
      return new Response(
        JSON.stringify({
          error: { code: "FORBIDDEN", message: "You do not have access to this flashcard" },
        } satisfies ApiError),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    // Update flashcard
    const { data: flashcard, error: updateError } = await supabase
      .from("flashcards")
      .update(updateData)
      .eq("id", flashcardId)
      .select()
      .single();

    if (updateError || !flashcard) {
      throw new Error("Failed to update flashcard");
    }

    const response: FlashcardDto = {
      ...flashcard,
      source: flashcard.source as FlashcardSource,
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
 * DELETE /api/flashcards/:flashcardId
 *
 * Deletes a flashcard.
 */
export const DELETE: APIRoute = async (context) => {
  try {
    const flashcardId = context.params.flashcardId;

    if (!flashcardId) {
      return new Response(
        JSON.stringify({
          error: { code: "VALIDATION_ERROR", message: "Flashcard ID is required" },
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

    // Verify flashcard exists and belongs to user
    const { data: existingFlashcard, error: fetchError } = await supabase
      .from("flashcards")
      .select("id, user_id")
      .eq("id", flashcardId)
      .single();

    if (fetchError || !existingFlashcard) {
      return new Response(
        JSON.stringify({
          error: { code: "FLASHCARD_NOT_FOUND", message: "Flashcard not found" },
        } satisfies ApiError),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    if (existingFlashcard.user_id !== user.id) {
      return new Response(
        JSON.stringify({
          error: { code: "FORBIDDEN", message: "You do not have access to this flashcard" },
        } satisfies ApiError),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    // Delete flashcard
    const { error: deleteError } = await supabase.from("flashcards").delete().eq("id", flashcardId);

    if (deleteError) {
      throw new Error("Failed to delete flashcard");
    }

    return new Response(null, { status: 204 });
  } catch {
    return new Response(
      JSON.stringify({
        error: { code: "INTERNAL_SERVER_ERROR", message: "An unexpected error occurred" },
      } satisfies ApiError),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
