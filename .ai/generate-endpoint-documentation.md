# API Endpoint: Generate Flashcards

## Overview

REST API endpoint for generating flashcard suggestions from text using AI models (with mock support for development).

## Endpoint Details

- **Method**: POST
- **Path**: `/api/decks/:deckId/generate`
- **Authentication**: Required (Supabase JWT token)
- **Rate Limit**: 10 requests per hour per user

## Request

### URL Parameters

- `deckId` (string, UUID): The deck ID where flashcards will be generated

### Headers

```
Authorization: Bearer <supabase_jwt_token>
Content-Type: application/json
```

### Body

```json
{
  "source_text": "Your text here (1000-10000 characters)...",
  "model": "openai/gpt-4o", // optional, default: "openai/gpt-4o"
  "count": 10 // optional, 5-20, default: 10
}
```

### Allowed Models

- `openai/gpt-4o` (default)
- `openai/gpt-4o-mini`
- `anthropic/claude-3.5-sonnet`
- `google/gemini-pro-1.5`

## Response

### Success (200 OK)

```json
{
  "generation_id": "uuid-of-generation-record",
  "suggestions": [
    {
      "front": "Question 1?",
      "back": "Answer 1"
    },
    {
      "front": "Question 2?",
      "back": "Answer 2"
    }
  ],
  "model": "openai/gpt-4o",
  "generation_duration_ms": 1234
}
```

### Error Responses

#### 400 Bad Request - Validation Error

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request body",
    "details": {
      /* Zod validation details */
    }
  }
}
```

#### 401 Unauthorized

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or expired access token"
  }
}
```

#### 403 Forbidden

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "You do not have access to this deck"
  }
}
```

#### 404 Not Found

```json
{
  "error": {
    "code": "DECK_NOT_FOUND",
    "message": "Deck not found"
  }
}
```

#### 422 Unprocessable Entity - AI Generation Failed

```json
{
  "error": {
    "code": "AI_GENERATION_FAILED",
    "message": "Failed to generate flashcards from the provided text",
    "details": {
      "error": "Detailed error message"
    }
  }
}
```

#### 429 Too Many Requests

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Generation rate limit exceeded. Please try again later."
  }
}
```

#### 500 Internal Server Error

```json
{
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "message": "An unexpected error occurred"
  }
}
```

## Development Mode (Mocks)

By default, the endpoint uses **mock AI generation** to avoid API costs during development.

### Enable/Disable Mocks

Set in `.env`:

```bash
# Use mocks (default)
USE_MOCK_AI=true

# Use real OpenRouter API
USE_MOCK_AI=false
```

### Mock Behavior

- Simulates API delay (500-2000ms)
- Generates contextual flashcards based on source text preview
- No API calls or costs
- Perfect for development and testing

## Testing with cURL

### Example Request

```bash
curl -X POST http://localhost:4321/api/decks/YOUR_DECK_UUID/generate \
  -H "Authorization: Bearer YOUR_SUPABASE_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "source_text": "Lorem ipsum dolor sit amet, consectetur adipiscing elit... (at least 1000 characters)",
    "model": "openai/gpt-4o",
    "count": 5
  }'
```

## Implementation Files

### Created Files

1. ✅ `/src/lib/validators/generation.validator.ts` - Zod validation schema
2. ✅ `/src/lib/utils/hash.ts` - SHA-256 hashing utility
3. ✅ `/src/lib/utils/rate-limit.ts` - Rate limiting check
4. ✅ `/src/lib/services/ai-generation.service.ts` - AI generation service (with mocks)
5. ✅ `/src/pages/api/decks/[deckId]/generate.ts` - API endpoint handler

### Database Tables Used

- `decks` - Deck ownership verification
- `generations` - Success logging
- `generation_error_logs` - Failure logging

## Next Steps

To complete the two-phase generation flow, implement:

- `POST /api/decks/:deckId/flashcards/accept` - Accept and persist generated flashcards
- Frontend UI for reviewing and editing suggestions before acceptance
