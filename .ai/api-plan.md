# REST API Plan - 10x-cards

## 1. Resources

### Core Resources

- **Decks** (`decks` table) - Collections of flashcards organized by topic
- **Flashcards** (`flashcards` table) - Individual flashcard items containing question/answer pairs
- **Generations** (`generations` table) - AI generation session records for analytics
- **Generation Error Logs** (`generation_error_logs` table) - Error tracking for AI generation failures
- **Auth** (Supabase `auth.users`) - User authentication and session management

## 2. Endpoints

### 2.1 Authentication

### 2.2 Decks

#### List User Decks

- **Method**: `GET`
- **Path**: `/api/decks`
- **Description**: Retrieve all decks belonging to the authenticated user
- **Headers**: `Authorization: Bearer <access_token>`
- **Query Parameters**:
  - `sort` (optional): `created_at` | `updated_at` | `name` (default: `updated_at`)
  - `order` (optional): `asc` | `desc` (default: `desc`)
  - `limit` (optional): integer, max 100 (default: 50)
  - `offset` (optional): integer (default: 0)
- **Success Response** (200):

```json
{
  "data": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "name": "string",
      "description": "string | null",
      "created_at": "timestamp",
      "updated_at": "timestamp",
      "flashcard_count": "integer",
      "due_flashcard_count": "integer"
    }
  ],
  "pagination": {
    "limit": "integer",
    "offset": "integer",
    "total": "integer"
  }
}
```

- **Error Responses**:
  - 401: Unauthorized
  - 500: Internal server error

#### Get Single Deck

- **Method**: `GET`
- **Path**: `/api/decks/:id`
- **Description**: Retrieve detailed information about a specific deck
- **Headers**: `Authorization: Bearer <access_token>`
- **URL Parameters**: `id` - deck UUID
- **Success Response** (200):

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "name": "string",
  "description": "string | null",
  "created_at": "timestamp",
  "updated_at": "timestamp",
  "flashcard_count": "integer",
  "due_flashcard_count": "integer"
}
```

- **Error Responses**:
  - 401: Unauthorized
  - 403: Forbidden (deck belongs to another user)
  - 404: Deck not found
  - 500: Internal server error

#### Create Deck

- **Method**: `POST`
- **Path**: `/api/decks`
- **Description**: Create a new deck for the authenticated user
- **Headers**: `Authorization: Bearer <access_token>`
- **Request Body**:

```json
{
  "name": "string (required, non-empty)",
  "description": "string | null (optional)"
}
```

- **Success Response** (201):

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "name": "string",
  "description": "string | null",
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

- **Error Responses**:
  - 400: Validation error (name required)
  - 401: Unauthorized
  - 500: Internal server error

#### Update Deck

- **Method**: `PATCH`
- **Path**: `/api/decks/:id`
- **Description**: Update deck name or description
- **Headers**: `Authorization: Bearer <access_token>`
- **URL Parameters**: `id` - deck UUID
- **Request Body**:

```json
{
  "name": "string (optional, non-empty if provided)",
  "description": "string | null (optional)"
}
```

- **Success Response** (200):

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "name": "string",
  "description": "string | null",
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

- **Error Responses**:
  - 400: Validation error (empty name)
  - 401: Unauthorized
  - 403: Forbidden (deck belongs to another user)
  - 404: Deck not found
  - 500: Internal server error

#### Delete Deck

- **Method**: `DELETE`
- **Path**: `/api/decks/:id`
- **Description**: Delete a deck and all its flashcards (CASCADE)
- **Headers**: `Authorization: Bearer <access_token>`
- **URL Parameters**: `id` - deck UUID
- **Success Response** (204): No content
- **Error Responses**:
  - 401: Unauthorized
  - 403: Forbidden (deck belongs to another user)
  - 404: Deck not found
  - 500: Internal server error

### 2.3 Flashcards

#### List Flashcards in Deck

- **Method**: `GET`
- **Path**: `/api/decks/:deckId/flashcards`
- **Description**: Retrieve all flashcards in a specific deck
- **Headers**: `Authorization: Bearer <access_token>`
- **URL Parameters**: `deckId` - deck UUID
- **Query Parameters**:
  - `source` (optional): `ai-full` | `ai-edited` | `manual` (filter by source)
  - `due` (optional): `true` | `false` (filter cards due for review)
  - `sort` (optional): `created_at` | `next_review_at` (default: `created_at`)
  - `order` (optional): `asc` | `desc` (default: `asc`)
  - `limit` (optional): integer, max 100 (default: 50)
  - `offset` (optional): integer (default: 0)
- **Success Response** (200):

```json
{
  "data": [
    {
      "id": "uuid",
      "deck_id": "uuid",
      "user_id": "uuid",
      "generation_id": "uuid | null",
      "front": "string",
      "back": "string",
      "source": "ai-full | ai-edited | manual",
      "next_review_at": "timestamp",
      "interval": "integer",
      "ease_factor": "float",
      "repetitions": "integer",
      "created_at": "timestamp",
      "updated_at": "timestamp"
    }
  ],
  "pagination": {
    "limit": "integer",
    "offset": "integer",
    "total": "integer"
  }
}
```

- **Error Responses**:
  - 401: Unauthorized
  - 403: Forbidden (deck belongs to another user)
  - 404: Deck not found
  - 500: Internal server error

#### Get Single Flashcard

- **Method**: `GET`
- **Path**: `/api/flashcards/:id`
- **Description**: Retrieve a specific flashcard
- **Headers**: `Authorization: Bearer <access_token>`
- **URL Parameters**: `id` - flashcard UUID
- **Success Response** (200):

```json
{
  "id": "uuid",
  "deck_id": "uuid",
  "user_id": "uuid",
  "generation_id": "uuid | null",
  "front": "string",
  "back": "string",
  "source": "ai-full | ai-edited | manual",
  "next_review_at": "timestamp",
  "interval": "integer",
  "ease_factor": "float",
  "repetitions": "integer",
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

- **Error Responses**:
  - 401: Unauthorized
  - 403: Forbidden (flashcard belongs to another user)
  - 404: Flashcard not found
  - 500: Internal server error

#### Create Flashcard Manually

- **Method**: `POST`
- **Path**: `/api/decks/:deckId/flashcards`
- **Description**: Create a new flashcard manually in a specific deck
- **Headers**: `Authorization: Bearer <access_token>`
- **URL Parameters**: `deckId` - deck UUID
- **Request Body**:

```json
{
  "front": "string (required, non-empty)",
  "back": "string (required, non-empty)"
}
```

- **Success Response** (201):

```json
{
  "id": "uuid",
  "deck_id": "uuid",
  "user_id": "uuid",
  "generation_id": null,
  "front": "string",
  "back": "string",
  "source": "manual",
  "next_review_at": "timestamp",
  "interval": 0,
  "ease_factor": 2.5,
  "repetitions": 0,
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

- **Error Responses**:
  - 400: Validation error (front or back empty)
  - 401: Unauthorized
  - 403: Forbidden (deck belongs to another user)
  - 404: Deck not found
  - 500: Internal server error

#### Update Flashcard

- **Method**: `PATCH`
- **Path**: `/api/flashcards/:id`
- **Description**: Update flashcard content (changes source to 'ai-edited' if originally 'ai-full')
- **Headers**: `Authorization: Bearer <access_token>`
- **URL Parameters**: `id` - flashcard UUID
- **Request Body**:

```json
{
  "front": "string (optional, non-empty if provided)",
  "back": "string (optional, non-empty if provided)"
}
```

- **Success Response** (200):

```json
{
  "id": "uuid",
  "deck_id": "uuid",
  "user_id": "uuid",
  "generation_id": "uuid | null",
  "front": "string",
  "back": "string",
  "source": "ai-edited | manual",
  "next_review_at": "timestamp",
  "interval": "integer",
  "ease_factor": "float",
  "repetitions": "integer",
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

- **Error Responses**:
  - 400: Validation error (empty front or back if provided)
  - 401: Unauthorized
  - 403: Forbidden (flashcard belongs to another user)
  - 404: Flashcard not found
  - 500: Internal server error

#### Delete Flashcard

- **Method**: `DELETE`
- **Path**: `/api/flashcards/:id`
- **Description**: Delete a single flashcard
- **Headers**: `Authorization: Bearer <access_token>`
- **URL Parameters**: `id` - flashcard UUID
- **Success Response** (204): No content
- **Error Responses**:
  - 401: Unauthorized
  - 403: Forbidden (flashcard belongs to another user)
  - 404: Flashcard not found
  - 500: Internal server error

#### Review Flashcard

- **Method**: `POST`
- **Path**: `/api/flashcards/:id/review`
- **Description**: Submit a review response and update spaced repetition parameters
- **Headers**: `Authorization: Bearer <access_token>`
- **URL Parameters**: `id` - flashcard UUID
- **Request Body**:

```json
{
  "quality": "integer (0-5, required)",
  "review_duration_ms": "integer (optional)"
}
```

**Quality Scale**:

- 0: Complete blackout (total fail)
- 1: Incorrect, but recognized after seeing answer
- 2: Incorrect, but seemed easy after seeing answer
- 3: Correct, but required significant effort
- 4: Correct, with some hesitation
- 5: Perfect recall, easy

- **Success Response** (200):

```json
{
  "id": "uuid",
  "deck_id": "uuid",
  "user_id": "uuid",
  "generation_id": "uuid | null",
  "front": "string",
  "back": "string",
  "source": "string",
  "next_review_at": "timestamp (updated)",
  "interval": "integer (updated)",
  "ease_factor": "float (updated)",
  "repetitions": "integer (updated)",
  "created_at": "timestamp",
  "updated_at": "timestamp (updated)"
}
```

- **Error Responses**:
  - 400: Validation error (invalid quality value)
  - 401: Unauthorized
  - 403: Forbidden (flashcard belongs to another user)
  - 404: Flashcard not found
  - 500: Internal server error

#### Get Due Flashcards for Review

- **Method**: `GET`
- **Path**: `/api/decks/:deckId/flashcards/due`
- **Description**: Get flashcards due for review in a specific deck
- **Headers**: `Authorization: Bearer <access_token>`
- **URL Parameters**: `deckId` - deck UUID
- **Query Parameters**:
  - `limit` (optional): integer, max 100 (default: 20)
- **Success Response** (200):

```json
{
  "data": [
    {
      "id": "uuid",
      "deck_id": "uuid",
      "user_id": "uuid",
      "generation_id": "uuid | null",
      "front": "string",
      "back": "string",
      "source": "string",
      "next_review_at": "timestamp",
      "interval": "integer",
      "ease_factor": "float",
      "repetitions": "integer",
      "created_at": "timestamp",
      "updated_at": "timestamp"
    }
  ],
  "total_due": "integer"
}
```

- **Error Responses**:
  - 401: Unauthorized
  - 403: Forbidden (deck belongs to another user)
  - 404: Deck not found
  - 500: Internal server error

### 2.4 AI Generation

#### Generate Flashcards from Text

- **Method**: `POST`
- **Path**: `/api/decks/:deckId/generate`
- **Description**: Generate flashcard suggestions from provided text using AI
- **Headers**: `Authorization: Bearer <access_token>`
- **URL Parameters**: `deckId` - deck UUID
- **Request Body**:

```json
{
  "source_text": "string (required, 1000-10000 characters)",
  "model": "string (optional, default: 'gpt-4o')",
  "count": "integer (optional, 5-20, default: 10)"
}
```

- **Success Response** (200):

```json
{
  "generation_id": "uuid",
  "suggestions": [
    {
      "front": "string",
      "back": "string"
    }
  ],
  "model": "string",
  "generation_duration_ms": "integer"
}
```

- **Error Responses**:
  - 400: Validation error (text too short/long)
  - 401: Unauthorized
  - 403: Forbidden (deck belongs to another user)
  - 404: Deck not found
  - 422: AI generation failed
  - 429: Rate limit exceeded
  - 500: Internal server error

#### Accept Generated Flashcards

- **Method**: `POST`
- **Path**: `/api/generations/:generationId/accept`
- **Description**: Accept and save selected AI-generated flashcards to deck
- **Headers**: `Authorization: Bearer <access_token>`
- **URL Parameters**: `generationId` - generation session UUID
- **Request Body**:

```json
{
  "flashcards": [
    {
      "front": "string (required, may be edited)",
      "back": "string (required, may be edited)",
      "was_edited": "boolean (required)"
    }
  ]
}
```

- **Success Response** (201):

```json
{
  "created_count": "integer",
  "flashcards": [
    {
      "id": "uuid",
      "deck_id": "uuid",
      "user_id": "uuid",
      "generation_id": "uuid",
      "front": "string",
      "back": "string",
      "source": "ai-full | ai-edited",
      "next_review_at": "timestamp",
      "interval": 0,
      "ease_factor": 2.5,
      "repetitions": 0,
      "created_at": "timestamp",
      "updated_at": "timestamp"
    }
  ]
}
```

- **Error Responses**:
  - 400: Validation error (invalid flashcard data)
  - 401: Unauthorized
  - 403: Forbidden (generation belongs to another user)
  - 404: Generation not found
  - 500: Internal server error

### 2.5 Analytics & History

#### Get User Generation History

- **Method**: `GET`
- **Path**: `/api/generations`
- **Description**: Retrieve AI generation history for the authenticated user
- **Headers**: `Authorization: Bearer <access_token>`
- **Query Parameters**:
  - `limit` (optional): integer, max 100 (default: 20)
  - `offset` (optional): integer (default: 0)
  - `model` (optional): filter by model name
- **Success Response** (200):

```json
{
  "data": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "model": "string",
      "source_text_hash": "string",
      "source_text_length": "integer",
      "generated_count": "integer",
      "generation_duration": "integer",
      "created_at": "timestamp"
    }
  ],
  "pagination": {
    "limit": "integer",
    "offset": "integer",
    "total": "integer"
  }
}
```

- **Error Responses**:
  - 401: Unauthorized
  - 500: Internal server error

#### Get User Statistics

- **Method**: `GET`
- **Path**: `/api/stats`
- **Description**: Get aggregate statistics for the authenticated user
- **Headers**: `Authorization: Bearer <access_token>`
- **Success Response** (200):

```json
{
  "total_decks": "integer",
  "total_flashcards": "integer",
  "flashcards_by_source": {
    "ai-full": "integer",
    "ai-edited": "integer",
    "manual": "integer"
  },
  "total_due": "integer",
  "total_generations": "integer",
  "avg_generation_duration_ms": "integer",
  "study_streak_days": "integer"
}
```

- **Error Responses**:
  - 401: Unauthorized
  - 500: Internal server error

## 3. Authentication and Authorization

### 3.1 Authentication Mechanism

The API uses **Supabase Auth** with JWT-based authentication:

1. **Access Tokens**: Short-lived JWT tokens (default: 1 hour) included in the `Authorization` header as Bearer tokens
2. **Refresh Tokens**: Long-lived tokens (default: 30 days) used to obtain new access tokens
3. **Session Management**: Handled automatically by Supabase SDK on the client side

### 3.2 Token Usage

All protected endpoints require the `Authorization` header:

```
Authorization: Bearer <access_token>
```

### 3.3 Row Level Security (RLS)

Database-level security is enforced through PostgreSQL RLS policies:

- **decks**: Users can only access their own decks (`auth.uid() = user_id`)
- **flashcards**: Users can only access flashcards where `auth.uid() = user_id`
- **generations**: Users can only access their own generation records
- **generation_error_logs**: Users can only insert and view their own error logs

### 3.4 Authorization Flow

1. Client authenticates with Supabase Auth (sign up/sign in)
2. Client receives access token and refresh token
3. Client includes access token in all API requests
4. Middleware validates token using `supabase.auth.getUser()`
5. User ID from validated token is used to enforce RLS at database level
6. Additional authorization checks in endpoint logic where needed

### 3.5 Security Headers

All API responses include:

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`

## 4. Validation and Business Logic

### 4.1 Validation Rules

#### Decks

- **name**: Required, non-empty string, max 255 characters
- **description**: Optional, max 1000 characters

#### Flashcards

- **front**: Required, non-empty string, max 2000 characters
- **back**: Required, non-empty string, max 2000 characters
- **source**: Must be one of: `'ai-full'`, `'ai-edited'`, `'manual'`
- **interval**: Non-negative integer (days)
- **ease_factor**: Float, minimum 1.3
- **repetitions**: Non-negative integer
- **next_review_at**: Valid timestamp, not in past for new cards

#### Generations

- **source_text**: Required, 1000-10000 characters (as per PRD US-004)
- **model**: Valid model name from allowed list
- **count**: Integer between 5-20 (number of flashcards to generate)

#### Review Quality

- **quality**: Integer 0-5 (as per SM-2 algorithm)
- **review_duration_ms**: Optional, non-negative integer

### 4.2 Business Logic

#### 4.2.1 Flashcard Source Tracking

When flashcards are created or modified, the `source` field is set according to:

1. **Manual creation** (`POST /api/decks/:deckId/flashcards`): `source = 'manual'`
2. **AI acceptance without edits**: `source = 'ai-full'`
3. **AI acceptance with edits**: `source = 'ai-edited'`
4. **Editing 'ai-full' flashcard**: `source` changes to `'ai-edited'`
5. **Editing 'ai-edited' or 'manual'**: `source` remains unchanged

This enables tracking of AI adoption metrics (PRD Section 6).

#### 4.2.2 Spaced Repetition Algorithm

The API implements the **SM-2 (SuperMemo 2)** algorithm for calculating review schedules:

**On review submission** (`POST /api/flashcards/:id/review`):

1. If `quality >= 3` (correct response):
   - If `repetitions == 0`: `interval = 1`
   - If `repetitions == 1`: `interval = 6`
   - If `repetitions > 1`: `interval = previous_interval * ease_factor`
   - Increment `repetitions`

2. If `quality < 3` (incorrect response):
   - Reset `repetitions = 0`
   - Reset `interval = 0`
   - Card becomes due immediately

3. Update `ease_factor`:
   - `ease_factor = ease_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))`
   - Minimum `ease_factor = 1.3`

4. Calculate `next_review_at`:
   - `next_review_at = current_time + interval (in days)`

#### 4.2.3 AI Generation Workflow

**Generation Process** (`POST /api/decks/:deckId/generate`):

1. Validate source text length (1000-10000 chars)
2. Calculate SHA-256 hash of source text for duplicate detection
3. Record start time
4. Call OpenRouter API with specified model
5. Parse LLM response into structured flashcard suggestions
6. Calculate generation duration
7. Create `generations` record with metadata:
   - `user_id`, `model`, `source_text_hash`, `source_text_length`
   - `generated_count`, `generation_duration`
8. Return suggestions to client (not yet saved to database)

**Error Handling**:

- On API failure: Log error to `generation_error_logs` table
- Return 422 status with error message
- Do NOT create `generations` record on failure

**Acceptance Process** (`POST /api/generations/:generationId/accept`):

1. Validate generation belongs to user
2. Retrieve associated deck_id from generation record
3. For each accepted flashcard:
   - Set `source = 'ai-full'` if `was_edited == false`
   - Set `source = 'ai-edited'` if `was_edited == true`
   - Initialize SR fields: `interval=0`, `ease_factor=2.5`, `repetitions=0`
   - Set `next_review_at = now()`
   - Set `generation_id` reference
4. Batch insert flashcards
5. Return created flashcards with IDs

#### 4.2.4 Cascade Deletion

- **Deleting a deck** (`DELETE /api/decks/:id`):
  - Automatically deletes all associated flashcards (database CASCADE)
  - Does NOT delete generation records (they remain for analytics)

- **Deleting a generation record**:
  - Sets `generation_id = NULL` on associated flashcards (database SET NULL)
  - Flashcards remain in the system

#### 4.2.5 Duplicate Prevention

- Before generation, check if `source_text_hash` exists in recent generations (e.g., last 24 hours)
- If duplicate found, return cached results or warn user
- This prevents redundant API calls and costs

#### 4.2.6 Rate Limiting

Implement rate limiting on expensive operations:

- **AI Generation**: Max 10 requests per user per hour
- **Review submissions**: Max 500 per user per hour
- **Deck/flashcard creation**: Max 100 per user per hour

Rate limits enforced via middleware checking recent request counts.

### 4.3 Data Integrity

- **Referential Integrity**: Enforced at database level with foreign keys
- **Unique Constraints**: UUIDs prevent collisions
- **Check Constraints**:
  - `source_text_length BETWEEN 10 AND 50000`
  - `source IN ('ai-full', 'ai-edited', 'manual')`
- **Timestamps**: Auto-updated via database triggers on `updated_at`
- **User Isolation**: RLS policies prevent cross-user data access

### 4.4 Error Handling Standards

All error responses follow consistent JSON format:

```json
{
  "error": {
    "code": "string (machine-readable error code)",
    "message": "string (human-readable description)",
    "details": {} // optional, validation errors etc.
  }
}
```

**Common Error Codes**:

- `UNAUTHORIZED`: Missing or invalid authentication
- `FORBIDDEN`: Insufficient permissions
- `NOT_FOUND`: Resource does not exist
- `VALIDATION_ERROR`: Input validation failed
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `AI_GENERATION_FAILED`: LLM API error
- `INTERNAL_ERROR`: Server error

### 4.5 Performance Considerations

- **Pagination**: All list endpoints support pagination (default limit: 50, max: 100)
- **Indexes**: Database indexes on:
  - `decks(user_id)`
  - `flashcards(deck_id)`, `flashcards(deck_id, next_review_at)`, `flashcards(user_id)`, `flashcards(generation_id)`
  - `generations(user_id, created_at)`
- **Eager Loading**: Include related counts (`flashcard_count`, `due_flashcard_count`) in deck list queries
- **Caching**: Consider caching user statistics (invalidate on data changes)
- **Batch Operations**: Accept multiple flashcards in generation acceptance endpoint

## 5. API Versioning

Currently on version 1. Future versions will be indicated in the path:

- Current: `/api/endpoint`
- Future: `/api/v2/endpoint`

Version 1 will be maintained for at least 6 months after v2 release.

## 6. CORS Policy

- Allow origins: Production domain + localhost (for development)
- Allow methods: `GET`, `POST`, `PATCH`, `DELETE`, `OPTIONS`
- Allow headers: `Authorization`, `Content-Type`
- Expose headers: `X-Total-Count` (for pagination)
- Credentials: Allowed (for cookies if needed)

## 7. API Documentation

Interactive API documentation will be available via:

- **OpenAPI/Swagger**: Auto-generated from endpoint definitions
- **Postman Collection**: Exportable collection for testing
- **Code Examples**: Available in documentation for common operations
