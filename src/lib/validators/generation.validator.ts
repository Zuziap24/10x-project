import { z } from "zod";

/**
 * Allowed AI models for flashcard generation.
 * Add more models as needed based on OpenRouter availability and testing.
 */
const ALLOWED_MODELS = [
  "openai/gpt-4o",
  "openai/gpt-4o-mini",
  "anthropic/claude-3.5-sonnet",
  "google/gemini-pro-1.5",
] as const;

/**
 * Validation schema for flashcard generation request.
 * Validates source text length, model selection, and flashcard count.
 */
export const generateFlashcardsSchema = z.object({
  source_text: z
    .string()
    .trim()
    .min(1000, "Source text must be at least 1000 characters long")
    .max(10000, "Source text must not exceed 10000 characters"),

  model: z.enum(ALLOWED_MODELS).optional().default("openai/gpt-4o"),

  count: z
    .number()
    .int("Count must be an integer")
    .min(5, "Count must be at least 5")
    .max(20, "Count must not exceed 20")
    .optional()
    .default(10),
});

export type GenerateFlashcardsInput = z.infer<typeof generateFlashcardsSchema>;
