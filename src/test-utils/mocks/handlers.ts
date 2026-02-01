/**
 * MSW Request Handlers
 * Mock handlers dla API endpoints używanych w aplikacji
 */

import { http, HttpResponse } from "msw";

const BASE_URL = "http://localhost:4321";

export const handlers = [
  // Mock Supabase Auth endpoints
  http.post(`${BASE_URL}/auth/v1/token`, () => {
    return HttpResponse.json({
      access_token: "mock-access-token",
      token_type: "bearer",
      expires_in: 3600,
      refresh_token: "mock-refresh-token",
      user: {
        id: "mock-user-id",
        email: "test@example.com",
        role: "authenticated",
      },
    });
  }),

  // Mock OpenRouter API
  http.post("https://openrouter.ai/api/v1/chat/completions", async () => {
    return HttpResponse.json({
      id: "gen-mock-id",
      model: "anthropic/claude-3-5-sonnet",
      choices: [
        {
          message: {
            role: "assistant",
            content: JSON.stringify({
              flashcards: [
                {
                  front: "Test Question 1",
                  back: "Test Answer 1",
                },
                {
                  front: "Test Question 2",
                  back: "Test Answer 2",
                },
              ],
            }),
          },
          finish_reason: "stop",
        },
      ],
      usage: {
        prompt_tokens: 100,
        completion_tokens: 50,
        total_tokens: 150,
      },
    });
  }),

  // Mock API endpoints dla decks
  http.get(`${BASE_URL}/api/decks`, () => {
    return HttpResponse.json({
      data: [
        {
          id: "deck-1",
          name: "Test Deck 1",
          description: "Test description",
          flashcard_count: 10,
          created_at: new Date().toISOString(),
        },
      ],
      error: null,
    });
  }),

  http.post(`${BASE_URL}/api/decks`, async ({ request }) => {
    const body = (await request.json()) as { name: string; description?: string };
    return HttpResponse.json({
      data: {
        id: "new-deck-id",
        name: body.name,
        description: body.description || "",
        flashcard_count: 0,
        created_at: new Date().toISOString(),
      },
      error: null,
    });
  }),

  // Mock API endpoint dla generowania fiszek
  http.post(`${BASE_URL}/api/decks/:deckId/generate`, () => {
    return HttpResponse.json({
      data: {
        flashcards: [
          {
            front: "Generated Question 1",
            back: "Generated Answer 1",
          },
          {
            front: "Generated Question 2",
            back: "Generated Answer 2",
          },
        ],
      },
      error: null,
    });
  }),
];
