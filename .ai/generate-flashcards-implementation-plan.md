# API Endpoint Implementation Plan: Generate Flashcards from Text

## 1. Endpoint Overview

This endpoint enables users to generate flashcard suggestions from provided text using AI models through OpenRouter.ai. The generation process is tracked in the `generations` table for analytics, but the actual flashcards are not persisted until the user explicitly accepts them via a separate endpoint. This allows users to review and edit suggestions before committing them to their deck.

**Key Characteristics:**

- AI-powered content generation
- Two-phase process: generate → accept
- Analytics tracking for model performance and cost management
- Error logging for failed generations
- Rate limiting consideration for API cost control

## 2. Request Details

- **HTTP Method**: `POST`
- **URL Structure**: `/api/decks/:deckId/generate`
- **Content-Type**: `application/json`

### Parameters

#### URL Parameters (Required)

- `deckId` (string, UUID): The UUID of the deck for which flashcards will be generated

#### Request Body

```typescript
{
  source_text: string;    // Required, 1000-10000 characters
  model?: string;         // Optional, default: 'gpt-4o'
  count?: number;        // Optional, 5-20, default: 10
}
```

#### Headers (Required)

- `Authorization: Bearer <access_token>` - Supabase JWT token

### Validation Requirements

1. **source_text**:
   - Required field
   - Minimum length: 1000 characters
   - Maximum length: 10000 characters
   - Must be non-empty after trimming

2. **model** (optional):
   - Must be from allowed list (to be configured)
   - Default: `'gpt-4o'`
   - Validate against whitelist to prevent arbitrary model usage

3. **count** (optional):
   - Integer between 5 and 20
   - Default: 10
   - Controls number of flashcards to generate

4. **deckId**:
   - Must be valid UUID format
   - Must exist in database
   - Must belong to authenticated user

## 3. Used Types

### DTOs

- `GenerateFlashcardsCommand` - Request body validation
- `GenerateFlashcardsResponseDto` - Success response
- `GeneratedSuggestionDto` - Individual flashcard suggestion
- `ApiError` - Error response structure

### Database Entities

- `generations` table (for logging)
- `generation_error_logs` table (for error tracking)
- `decks` table (for ownership verification)

## 4. Response Details

### Success Response (200 OK)

```typescript
{
  generation_id: string; // UUID of the generation record
  suggestions: Array<{
    front: string;
    back: string;
  }>;
  model: string; // Model that was used
  generation_duration_ms: number; // Time taken for generation
}
```

### Error Responses

#### 400 Bad Request

- Invalid `source_text` length (too short or too long)
- Invalid `count` value (outside 5-20 range)
- Invalid `model` name
- Missing required fields

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "source_text must be between 1000 and 10000 characters",
    "details": {
      "field": "source_text",
      "length": 500,
      "min": 1000,
      "max": 10000
    }
  }
}
```

#### 401 Unauthorized

- Missing or invalid access token
- Expired token

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or expired access token"
  }
}
```

#### 403 Forbidden

- Deck exists but belongs to another user

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "You do not have access to this deck"
  }
}
```

#### 404 Not Found

- Deck with given `deckId` does not exist

```json
{
  "error": {
    "code": "DECK_NOT_FOUND",
    "message": "Deck not found"
  }
}
```

#### 422 Unprocessable Entity

- AI generation failed (model error, parsing error, etc.)

```json
{
  "error": {
    "code": "AI_GENERATION_FAILED",
    "message": "Failed to generate flashcards from the provided text",
    "details": {
      "model": "gpt-4o",
      "error": "Model returned invalid response format"
    }
  }
}
```

#### 429 Too Many Requests

- Rate limit exceeded (user has made too many generation requests)

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Generation rate limit exceeded. Please try again later."
  }
}
```

#### 500 Internal Server Error

- Unexpected server error
- Database error

```json
{
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "message": "An unexpected error occurred"
  }
}
```

## 5. Data Flow

### Step-by-Step Process

1. **Request Reception & Initial Validation**
   - Astro endpoint receives POST request
   - Extract `deckId` from URL params
   - Parse and validate request body using Zod schema
   - Validate JWT token via middleware

2. **User Authentication & Authorization**
   - Get `supabase` client from `context.locals`
   - Call `supabase.auth.getUser()` to validate token
   - Extract `user_id` from authenticated user

3. **Deck Ownership Verification**
   - Query `decks` table to verify deck exists
   - Verify `deck.user_id === authenticated_user_id`
   - Return 404 if deck not found
   - Return 403 if deck belongs to another user

4. **Input Processing**
   - Trim `source_text`
   - Calculate SHA-256 hash of `source_text` for duplicate tracking
   - Measure `source_text_length`
   - Set `model` to default if not provided
   - Set `count` to default if not provided

5. **AI Generation Service Call**
   - Record `start_time`
   - Call `AIGenerationService.generateFlashcards()`
   - Service handles:
     - OpenRouter API communication
     - Prompt engineering
     - Response parsing and validation
     - Retry logic for transient failures
   - Calculate `generation_duration = Date.now() - start_time`

6. **Success Path**
   - Parse AI response into structured flashcard suggestions
   - Create record in `generations` table:
     ```typescript
     {
       user_id,
       model,
       source_text_hash,
       source_text_length,
       generated_count: suggestions.length,
       generation_duration
     }
     ```
   - Return `generation_id` and suggestions to client

7. **Error Path**
   - If AI generation fails:
     - Create record in `generation_error_logs` table:
       ```typescript
       {
         (user_id, model, error_code, error_message);
       }
       ```
     - Return 422 response with error details
     - Do NOT create `generations` record

### Database Interactions

1. **Read Operations**:
   - Query `decks` table to verify ownership
   - (Optional) Query `generations` table to check for duplicate `source_text_hash`

2. **Write Operations**:
   - Insert into `generations` table (on success)
   - Insert into `generation_error_logs` table (on failure)

### External Service Interactions

1. **OpenRouter API**:
   - Endpoint: `https://openrouter.ai/api/v1/chat/completions`
   - Authentication: API key from environment variables
   - Model selection: Based on user preference or default
   - Prompt structure: Engineered to produce valid flashcard JSON

## 6. Security Considerations

### Authentication & Authorization

1. **Token Validation**:
   - Middleware validates JWT token via `supabase.auth.getUser()`
   - Return 401 if token is invalid or expired
   - Extract `user_id` from validated token

2. **Deck Ownership**:
   - Verify deck belongs to authenticated user before generation
   - Supabase RLS policies provide additional database-level protection
   - Return 403 if ownership check fails

3. **Rate Limiting**:
   - Implement rate limiting to prevent abuse and control costs
   - Suggested limits:
     - 10 generations per hour per user
     - 50 generations per day per user
   - Track via Redis or database timestamp queries
   - Return 429 when limit exceeded

### Input Validation & Sanitization

1. **Source Text**:
   - Enforce length limits (1000-10000 chars)
   - Trim whitespace
   - Consider sanitizing HTML/scripts if user input might contain them
   - Validate character encoding (UTF-8)

2. **Model Parameter**:
   - Whitelist allowed models
   - Prevent injection of arbitrary model names
   - Default to safe, tested model

3. **Count Parameter**:
   - Enforce numeric range (5-20)
   - Prevent excessive generation requests

### API Key Protection

1. **Environment Variables**:
   - Store OpenRouter API key in `import.meta.env.OPENROUTER_API_KEY`
   - Never expose API key in response or logs
   - Use server-side only (no client access)

2. **Error Messages**:
   - Sanitize error messages to avoid leaking API keys or sensitive data
   - Log detailed errors server-side only
   - Return generic error messages to client

### Cost Control

1. **Generation Limits**:
   - Enforce character limits on source text
   - Limit number of flashcards per generation
   - Track usage per user for billing/limits

2. **Model Selection**:
   - Whitelist cost-effective models
   - Consider tiered access (free vs paid users)
   - Monitor usage via `generations` table

### Data Privacy

1. **Source Text Storage**:
   - Store only hash, not full source text
   - Comply with GDPR/privacy regulations
   - Allow users to delete generation history

2. **Error Logging**:
   - Avoid logging sensitive user data
   - Redact API keys from error logs
   - Implement log retention policies

## 7. Error Handling

### Validation Errors (400)

```typescript
// Zod validation catches:
- Missing required fields
- Invalid data types
- Out-of-range values
- Invalid UUID format

// Response:
{
  error: {
    code: "VALIDATION_ERROR",
    message: string,
    details: Record<string, unknown>
  }
}
```

### Authentication Errors (401)

```typescript
// Supabase auth.getUser() fails
if (!user) {
  return new Response(
    JSON.stringify({
      error: {
        code: "UNAUTHORIZED",
        message: "Invalid or expired access token",
      },
    }),
    { status: 401 }
  );
}
```

### Authorization Errors (403)

```typescript
// Deck ownership check fails
if (deck.user_id !== user.id) {
  return new Response(
    JSON.stringify({
      error: {
        code: "FORBIDDEN",
        message: "You do not have access to this deck",
      },
    }),
    { status: 403 }
  );
}
```

### Not Found Errors (404)

```typescript
// Deck does not exist
if (!deck) {
  return new Response(
    JSON.stringify({
      error: {
        code: "DECK_NOT_FOUND",
        message: "Deck not found",
      },
    }),
    { status: 404 }
  );
}
```

### AI Generation Errors (422)

```typescript
// OpenRouter API fails or returns invalid data
try {
  const suggestions = await aiService.generateFlashcards(...);
} catch (error) {
  // Log to generation_error_logs
  await supabase.from('generation_error_logs').insert({
    user_id: user.id,
    model,
    error_code: error.code,
    error_message: error.message
  });

  return new Response(
    JSON.stringify({
      error: {
        code: "AI_GENERATION_FAILED",
        message: "Failed to generate flashcards",
        details: {
          model,
          error: error.message
        }
      }
    }),
    { status: 422 }
  );
}
```

### Rate Limit Errors (429)

```typescript
// Check recent generation count
const recentGenerations = await checkRateLimit(user.id);
if (recentGenerations >= RATE_LIMIT) {
  return new Response(
    JSON.stringify({
      error: {
        code: "RATE_LIMIT_EXCEEDED",
        message: "Generation rate limit exceeded",
      },
    }),
    { status: 429 }
  );
}
```

### Database Errors (500)

```typescript
// Catch unexpected database errors
try {
  await supabase.from('generations').insert(...);
} catch (error) {
  console.error('Database error:', error);
  return new Response(
    JSON.stringify({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "An unexpected error occurred"
      }
    }),
    { status: 500 }
  );
}
```

### Retry Logic

- Implement exponential backoff for transient OpenRouter API errors
- Retry up to 3 times with delays: 1s, 2s, 4s
- Log retry attempts for monitoring
- Return 422 if all retries fail

## 8. Performance Considerations

### Potential Bottlenecks

1. **OpenRouter API Latency**:
   - LLM inference can take 5-30 seconds
   - Network latency adds overhead
   - Model choice affects speed

2. **Database Operations**:
   - Deck ownership query (minimal impact)
   - Generation record insertion (minimal impact)

3. **Hash Calculation**:
   - SHA-256 on 10KB text is fast (<1ms)
   - Negligible performance impact

### Optimization Strategies

#### 1. Response Streaming

- Consider streaming flashcard suggestions as they're generated
- Improves perceived performance
- Requires WebSocket or Server-Sent Events

#### 2. Caching

- Cache duplicate generations (same `source_text_hash`)
- Check `generations` table before calling API
- Return cached suggestions if found within X hours
- Significantly reduces API costs and improves speed

#### 3. Background Processing

- Consider async generation for long texts
- Return `generation_id` immediately
- Poll for completion or use webhooks
- Improves user experience for slow generations

#### 4. Database Optimization

- Index on `decks(id, user_id)` for fast ownership checks (already exists)
- Index on `generations(source_text_hash)` for duplicate detection
- Use connection pooling for Supabase client

#### 5. API Call Optimization

- Batch multiple generation requests if possible
- Use appropriate model for cost/speed tradeoff
- Set reasonable timeout limits (e.g., 60 seconds)

#### 6. Monitoring

- Track generation durations in `generations.generation_duration`
- Monitor API response times
- Alert on slow or failing generations
- Analyze model performance for optimization

### Resource Usage

- **Memory**: Minimal (request/response objects only)
- **CPU**: Low (mostly I/O bound)
- **Network**: Depends on OpenRouter API
- **Database**: Low (1-2 queries per request)

### Scalability

- Stateless endpoint design allows horizontal scaling
- Rate limiting prevents individual user abuse
- Consider queue-based processing for high load
- Monitor OpenRouter API rate limits

## 9. Implementation Steps

### Step 1: Create Zod Validation Schema

**File**: `src/lib/validators/generation.validator.ts`

```typescript
import { z } from "zod";

export const generateFlashcardsSchema = z.object({
  source_text: z
    .string()
    .trim()
    .min(1000, "Source text must be at least 1000 characters")
    .max(10000, "Source text must not exceed 10000 characters"),
  model: z.string().optional().default("gpt-4o"),
  count: z.number().int().min(5, "Count must be at least 5").max(20, "Count must not exceed 20").optional().default(10),
});

export type GenerateFlashcardsInput = z.infer<typeof generateFlashcardsSchema>;
```

### Step 2: Create AI Generation Service

**File**: `src/lib/services/ai-generation.service.ts`

```typescript
import type { GeneratedSuggestionDto } from "../../types";

interface GenerateFlashcardsParams {
  sourceText: string;
  model: string;
  count: number;
}

interface GenerateFlashcardsResult {
  suggestions: GeneratedSuggestionDto[];
  generationDuration: number;
}

export class AIGenerationService {
  private apiKey: string;
  private baseUrl = "https://openrouter.ai/api/v1";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateFlashcards(params: GenerateFlashcardsParams): Promise<GenerateFlashcardsResult> {
    const startTime = Date.now();

    // Construct prompt
    const prompt = this.buildPrompt(params.sourceText, params.count);

    // Call OpenRouter API with retry logic
    const suggestions = await this.callOpenRouterWithRetry(params.model, prompt, params.count);

    const generationDuration = Date.now() - startTime;

    return {
      suggestions,
      generationDuration,
    };
  }

  private buildPrompt(sourceText: string, count: number): string {
    return `Generate exactly ${count} flashcards from the following text.
Each flashcard should have a question (front) and answer (back).
Return valid JSON array with format: [{"front": "...", "back": "..."}, ...]

Text:
${sourceText}`;
  }

  private async callOpenRouterWithRetry(
    model: string,
    prompt: string,
    count: number,
    maxRetries = 3
  ): Promise<GeneratedSuggestionDto[]> {
    // Implementation with exponential backoff
    // Parse and validate response
    // Return structured suggestions
  }
}
```

### Step 3: Create Helper Utilities

**File**: `src/lib/utils/hash.ts`

```typescript
import crypto from "crypto";

export function calculateSHA256(text: string): string {
  return crypto.createHash("sha256").update(text, "utf8").digest("hex");
}
```

**File**: `src/lib/utils/rate-limit.ts`

```typescript
import type { SupabaseClient } from "../../db/supabase.client";

export async function checkGenerationRateLimit(
  supabase: SupabaseClient,
  userId: string,
  limitPerHour = 10
): Promise<boolean> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { count, error } = await supabase
    .from("generations")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", oneHourAgo);

  if (error) throw error;

  return (count ?? 0) < limitPerHour;
}
```

### Step 4: Create API Endpoint

**File**: `src/pages/api/decks/[deckId]/generate.ts`

```typescript
import type { APIRoute } from "astro";
import { generateFlashcardsSchema } from "../../../../lib/validators/generation.validator";
import { AIGenerationService } from "../../../../lib/services/ai-generation.service";
import { calculateSHA256 } from "../../../../lib/utils/hash";
import { checkGenerationRateLimit } from "../../../../lib/utils/rate-limit";
import type { GenerateFlashcardsResponseDto, ApiError } from "../../../../types";

export const prerender = false;

export const POST: APIRoute = async (context) => {
  try {
    // 1. Extract deck ID from params
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

    // 2. Get authenticated user
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

    // 3. Parse and validate request body
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

    // 4. Verify deck ownership
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

    // 5. Check rate limit
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

    // 6. Calculate source text metadata
    const sourceTextHash = calculateSHA256(source_text);
    const sourceTextLength = source_text.length;

    // 7. Generate flashcards using AI service
    const aiService = new AIGenerationService(import.meta.env.OPENROUTER_API_KEY);

    const { suggestions, generationDuration } = await aiService.generateFlashcards({
      sourceText: source_text,
      model,
      count,
    });

    // 8. Create generation record
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

    // 9. Return success response
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
      // Log to error table
      try {
        const supabase = context.locals.supabase;
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          await supabase.from("generation_error_logs").insert({
            user_id: user.id,
            model: error.model,
            error_code: error.code,
            error_message: error.message,
          });
        }
      } catch (logError) {
        console.error("Failed to log error:", logError);
      }

      return new Response(
        JSON.stringify({
          error: {
            code: "AI_GENERATION_FAILED",
            message: "Failed to generate flashcards from the provided text",
            details: {
              model: error.model,
              error: error.message,
            },
          },
        } satisfies ApiError),
        { status: 422, headers: { "Content-Type": "application/json" } }
      );
    }

    // Handle unexpected errors
    console.error("Unexpected error in generate endpoint:", error);

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
```

### Step 5: Add Environment Variables

**File**: `.env` (not committed)

```
OPENROUTER_API_KEY=your_api_key_here
```

**File**: `src/env.d.ts` (update)

```typescript
interface ImportMetaEnv {
  readonly OPENROUTER_API_KEY: string;
  // ... other env variables
}
```

### Step 7: Update Documentation

- Add endpoint to API documentation
- Document rate limits
- Document supported models
- Add usage examples
