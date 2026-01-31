import type { GeneratedSuggestionDto } from "../../types";
import { OpenRouterService } from "./openrouter.service";
import { OpenRouterError } from "./openrouter.types";

interface GenerateFlashcardsParams {
  sourceText: string;
  model: string;
  count: number;
}

interface GenerateFlashcardsResult {
  suggestions: GeneratedSuggestionDto[];
  generationDuration: number;
}

/**
 * Error thrown when OpenRouter API call fails.
 */
export class AIGenerationError extends Error {
  constructor(
    message: string,
    public readonly errorCode: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "AIGenerationError";
  }
}

/**
 * Service for generating flashcards using AI models via OpenRouter API.
 * Handles API communication, prompt engineering, response parsing, and retry logic.
 */
export class AIGenerationService {
  private openRouter: OpenRouterService;
  private useMock: boolean;

  constructor(apiKey: string, useMock = false) {
    if (!apiKey && !useMock) {
      throw new Error("OpenRouter API key is required");
    }
    this.useMock = useMock;

    // Adapt to OpenRouterServiceOptions expected shape
    this.openRouter = new OpenRouterService({
      apiKeyProvider: () => apiKey,
      timeoutMs: 60000,
      retry: {
        attempts: 3,
        factor: 2,
        minTimeoutMs: 1000,
      },
    });
  }

  /**
   * Generates flashcard suggestions from source text using the specified AI model.
   *
   * @param params - Generation parameters (sourceText, model, count)
   * @returns Array of flashcard suggestions with generation duration
   * @throws {AIGenerationError} When API call fails or response is invalid
   */
  async generateFlashcards(params: GenerateFlashcardsParams): Promise<GenerateFlashcardsResult> {
    const startTime = Date.now();

    try {
      // Use mock data in development mode
      const suggestions = this.useMock
        ? await this.generateMockFlashcards(params.count, params.sourceText)
        : await this.callOpenRouter(params.model, params.sourceText, params.count);

      const generationDuration = Date.now() - startTime;

      return {
        suggestions,
        generationDuration,
      };
    } catch (error) {
      if (error instanceof AIGenerationError) {
        // Re-throw with duration information
        throw error;
      }

      if (error instanceof OpenRouterError) {
        throw new AIGenerationError(error.message, error.code, error);
      }

      // Wrap unexpected errors
      throw new AIGenerationError("Unexpected error during flashcard generation", "UNEXPECTED_ERROR", error);
    }
  }

  private async callOpenRouter(model: string, sourceText: string, count: number): Promise<GeneratedSuggestionDto[]> {
    // Configure model and send a single conversational request using OpenRouterService
    // Set default model for this call
    if (model) {
      this.openRouter.setDefaultModel(model);
    }

    const systemMessage = `You are an expert at creating high-quality flashcards for effective learning.
Generate exactly ${count} flashcards from the provided text.
Each flashcard should have a clear question (front) and answer (back).
Focus on key concepts and facts suitable for spaced repetition.

IMPORTANT: Detect the language of the source text and create ALL flashcards in that SAME language.
For example:
- If the source text is in Polish, write questions and answers in Polish.
- If the source text is in English, write questions and answers in English.
- If the source text is in German, write questions and answers in German.
Do NOT translate or mix languages. Keep everything in the original language of the source text.`;

    const userMessage = `Source text:\n${sourceText}`;

    // Response format (JSON Schema) expected by the consumer
    // Note: strict mode requires additionalProperties: false at all object levels
    const responseFormat = {
      type: "json_schema" as const,
      json_schema: {
        name: "flashcards",
        strict: true,
        schema: {
          type: "object",
          properties: {
            flashcards: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  front: { type: "string" },
                  back: { type: "string" },
                },
                required: ["front", "back"],
                additionalProperties: false,
              },
            },
          },
          required: ["flashcards"],
          additionalProperties: false,
        },
      },
    };

    const result = await this.openRouter.sendMessage({
      model,
      systemMessage,
      userMessage,
      modelParams: {
        temperature: 0.7,
        top_p: 1,
      },
      responseFormat,
    });

    if (!result.success) {
      const err = result.error;
      throw new AIGenerationError(err?.message || "AI generation failed", err?.code || "AI_ERROR", err?.details);
    }

    // Expect data to be parsed JSON matching the schema
    const data = result.data as Record<string, unknown> | null;

    if (!data || typeof data !== "object") {
      throw new AIGenerationError("Invalid AI response shape", "PARSE_ERROR", data);
    }

    const flashcardsValue = data["flashcards"];

    if (!Array.isArray(flashcardsValue)) {
      throw new AIGenerationError("Invalid AI response shape: flashcards missing or not array", "PARSE_ERROR", data);
    }

    return flashcardsValue as GeneratedSuggestionDto[];
  }

  /**
   * Delays execution for the specified duration.
   * Used for exponential backoff in retry logic.
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Generates mock flashcards for development and testing.
   * Creates realistic flashcards based on the count and source text preview.
   *
   * @param count - Number of flashcards to generate
   * @param sourceText - Source text (used to create contextual mocks)
   * @returns Array of mock flashcard suggestions
   */
  private async generateMockFlashcards(count: number, sourceText: string): Promise<GeneratedSuggestionDto[]> {
    // Simulate API delay (500-2000ms)
    const delay = 500 + Math.random() * 1500;
    await this.delay(delay);

    // Extract first few words for context
    const preview = sourceText.substring(0, 50).trim();
    const topic = this.extractTopic(preview);

    const suggestions: GeneratedSuggestionDto[] = [];

    for (let i = 0; i < count; i++) {
      suggestions.push({
        front: `Question ${i + 1} about ${topic}?`,
        back: `Answer ${i + 1}: This is a generated answer based on the provided text about ${topic}. It demonstrates the flashcard format with a clear, concise response.`,
      });
    }

    return suggestions;
  }

  /**
   * Extracts a topic or keyword from the text preview for mock generation.
   */
  private extractTopic(preview: string): string {
    // Simple heuristic: take first meaningful word (>3 chars) or use generic
    const words = preview.split(/\s+/).filter((w) => w.length > 3);
    return words.length > 0 ? words[0].toLowerCase() : "the topic";
  }
}
