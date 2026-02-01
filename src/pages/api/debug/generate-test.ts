import type { APIRoute } from "astro";
import { AIGenerationService } from "../../../lib/services/ai-generation.service";

export const prerender = false;

/**
 * Temporary debug endpoint to test AI generation and optional DB write.
 * POST body: { source_text: string, count?: number, model?: string }
 */
export const POST: APIRoute = async (context) => {
  try {
    const body = await context.request.json();
    const source_text =
      (body?.source_text as string) || "This is a short test text about JavaScript promises and async/await.";
    const count = typeof body?.count === "number" ? body.count : 3;
    const model = (body?.model as string) || "openai/gpt-4o";

    const useMock = import.meta.env.USE_MOCK_AI !== "false";
    const apiKey = import.meta.env.OPENROUTER_API_KEY || "";

    const ai = new AIGenerationService(apiKey, useMock);

    const { suggestions, generationDuration } = await ai.generateFlashcards({
      sourceText: source_text,
      model,
      count,
    } as Parameters<typeof ai.generateFlashcards>[0]);

    // Try to insert a generation record to Supabase for verification (best-effort)
    const supabase = context.locals.supabase;
    let insertResult: { success: boolean; error?: unknown; id?: string } = { success: false };

    try {
      const { data, error } = await supabase
        .from("generations")
        .insert({
          user_id: "debug-user",
          model,
          source_text_hash: "debug-hash",
          source_text_length: source_text.length,
          generated_count: suggestions.length,
          generation_duration: generationDuration,
        })
        .select("id")
        .single();

      if (error) {
        insertResult = { success: false, error };
      } else {
        insertResult = { success: true, id: data?.id };
      }
    } catch (e) {
      insertResult = { success: false, error: e };
    }

    return new Response(JSON.stringify({ suggestions, generationDuration, insertResult }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), { status: 500 });
  }
};
