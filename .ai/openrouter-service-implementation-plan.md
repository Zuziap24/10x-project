## OpenRouter Service — Plan implementacji

Poniższy dokument to kompletny plan implementacji usługi integrującej OpenRouter (OpenRouter.ai) z aplikacją budowaną w technologii Astro + TypeScript + React i używającą Supabase dla funkcji backendowych. Zawiera opis komponentów, konstruktorów, API serwisu, obsługę błędów, kwestie bezpieczeństwa i szczegółowy plan wdrożenia krok po kroku.

---

## 1. Opis usługi

OpenRouter Service (dalej: ORService) to warstwa integracyjna pośrednicząca pomiędzy aplikacją frontendową a API OpenRouter. ORService ma za zadanie:

- Przygotować i walidować kontekst konwersacji (system message, user message, conversation history).
- Skonfigurować i wywołać endpoint OpenRouter z odpowiednimi parametrami (model, temperature, max_tokens, itp.).
- Wymusić i walidować ustrukturyzowane odpowiedzi przy użyciu `response_format` (JSON Schema) tam, gdzie wymagane.
- Obsłużyć ponawianie prób, throttling, limity i błędy sieciowe oraz mapować błędy na czytelne kody/komunikaty.
- Zapewnić bezpieczne przetrzymywanie i użycie kluczy API, obsługę logowania i metryk użycia.

Kontrakt wejścia/wyjścia (skrót):

- Wejście: { conversation: Message[], systemMessage?: string, model?: string, modelParams?: Record<string, any>, responseSchema?: JSONSchema }
- Wyjście: { success: boolean, data?: any, error?: { code, message, details? } }

Edge cases: puste wiadomości, bardzo długie konwersacje, niedostępność API, niepoprawne schema response_format.

---

## 2. Opis konstruktora

Proponowany kontrakt konstruktora (TypeScript-like):

constructor(options: {
  apiKeyProvider: () => Promise<string> | string; // sposób pozyskania klucza (env, vault, supabase secrets)
  baseUrl?: string; // domyślnie https://api.openrouter.ai
  defaultModel?: string; // np. "gpt-4o-mini" lub inna obsługiwana nazwa
  defaultParams?: Record<string, any>; // domyślne parametry modelu
  timeoutMs?: number; // http timeout
  retry?: { attempts: number, factor: number, minTimeoutMs: number }; // prosty backoff
  logger?: Logger; // interfejs do logowania (info/warn/error)
  telemetry?: TelemetryClient; // opcjonalnie do śledzenia zużycia
})

Opis pól:

- apiKeyProvider — funkcja lub źródło klucza; należy unikać twardego zapisu kluczy w repozytorium. Preferowane: import z `src/db/supabase.client.ts` (bezpośredni fetch secret) lub env var załadowane w runtime.
- baseUrl — konfigurowalny endpoint innego środowiska OpenRouter.
- defaultModel/defaultParams — wartości domyślne ułatwiające wywołania z frontendu.

Wymagania konstruktora:

- Walidacja obecności apiKeyProvider.
- Nieblokujące pobranie klucza (lazy) — pobieraj klucz tuż przed wywołaniem, nie w konstruktorze.

---

## 3. Publiczne metody i pola

Lista metod, sygnatur i krótkie opisy:

1. async sendMessage(params: {
   conversation: Message[];
   systemMessage?: string;
   userMessage?: string;
   model?: string;
   modelParams?: Record<string, any>;
   responseFormat?: ResponseFormatSpec; // optional JSON schema wrapper
   stream?: boolean; // czy zwracać stream
}) => Promise<ServiceResponse>

- Cel: główna metoda do wysyłania zapytań konwersacyjnych do OpenRouter.
- Zachowanie: łączy domyślne i przekazane parametry, waliduje payload, robi request, analizuje odpowiedź i waliduje schema jeśli podany `responseFormat`.

2. async sendRaw(requestBody: any) => Promise<any>

- Cel: niskopoziomowe wywołanie (użyteczne w testach lub do nietypowych opcji OpenRouter). Nie narzuca response schema.

3. setDefaultModel(model: string): void

- Cel: zmiana modelu domyślnego runtime.

4. healthCheck(): Promise<{ ok: boolean, latencyMs?: number, message?: string }>

- Cel: szybka metoda do sprawdzenia dostępności i latencji OpenRouter (przydatne dla endpointu health w aplikacji).

5. getUsage(): Promise<UsageMetrics>

- Cel: (opcjonalnie) pobranie metryk użycia lub agregowanie lokalnych liczników żądań.

Publiczne pola (ew. akcesory):

- baseUrl
- defaultModel
- lastResponseMetadata (ostatnie statusy, headers) — do debugowania

Kontrakty błędów: każda metoda powinna zwracać spójną strukturę ServiceResponse z kodami błędów i ewentualnymi szczegółami (np. rate_limit, model_not_found, invalid_schema, network_error).

---

## 4. Prywatne metody i pola

Proponowane prywatne metody i pola (implementacyjne):

Pola:

- _apiKeyCache: { key?: string, expiresAt?: number }
- _httpClient: configured fetch/axios instance (with timeout, retry, headers)
- _logger
- _retryConfig

Metody prywatne:

1. async _resolveApiKey(): Promise<string>

- Cel: jednorazowe, bezpieczne pobranie i zwrócenie klucza API (env/vault/supabase). Obsługa cache z krótkim TTL.

2. _buildPayload(...): any

- Cel: złożenie ciała requestu zgodnie z wymaganiami OpenRouter (messages, model, params, response_format).

3. _validateResponseFormat(response, responseFormatSpec): void

- Cel: walidacja odpowiedzi modelu zgodnie z dostarczonym JSON Schema. W razie niespełnienia — rzut error typu `InvalidModelResponse`.

4. async _request(payload): Promise<any>

- Cel: rzeczywiste wywołanie HTTP z retry/backoff, obsługą timeout i mapowaniem nagłówków throttlingu.

5. _handleOpenRouterError(httpError, body): ServiceError

- Cel: unifikacja błędów (rate_limit, auth, model not found, bad request) do wewnętrznego formatu.

6. _formatResponseForClient(openRouterResponse, responseFormatSpec?): any

- Cel: sparsowanie wyników, wyciągnięcie tekstu, alternatywnych candidate'ów, oraz zwrócenie znormalizowanej struktury.

7. _shouldRetry(error): boolean

- Cel: określenie, czy ponowić wywołanie (sieciowe 5xx, rate-limit z Retry-After, czasowe). Nie retry dla błędów 4xx (poza chwilowymi rate-limit lub 429 z Retry-After).

---

## 5. Obsługa błędów

Potencjalne scenariusze błędów (ponumerowane) i rekomendowane reakcje:

1. Network error / timeout
   - Opis: brak odpowiedzi sieciowej, DNS, timeout.
   - Działanie: retry z backoff (do N prób), zwrócenie kodu `network_error` gdy przekroczono próby.

2. 401 / 403 — błąd autoryzacji
   - Opis: nieprawidłowy lub wygasły klucz API.
   - Działanie: nie retry, zwróć `auth_error`. W logach: minimalna ilość informacji (bez pełnego klucza). Sugeruj sprawdzenie provider'a klucza.

3. 404 / model not found
   - Opis: żądanie do nieobsługiwanego modelu.
   - Działanie: zwróć `model_not_found`, opcjonalnie zaproponuj `defaultModel`.

4. 429 / rate limit
   - Opis: przekroczono limity.
   - Działanie: jeżeli header `Retry-After` jest dostępny — retry po tym czasie; inaczej exponencjalny backoff z limitem. Zwróć `rate_limited` jeśli nie uda się po kilku próbach.

5. 5xx — błędy serwera OpenRouter
   - Działanie: retry z backoff do ustalonej liczby prób, potem `server_error`.

6. Invalid response schema (response_format niezgodny)
   - Opis: model zwrócił dane, które nie przechodzą podanego JSON Schema.
   - Działanie: rzuć `invalid_model_response` z przykładami niezgodnych fragmentów; opcjonalnie: próbuj ponowić z ostrzejszym promptem (jeśli skonfigurowano politykę naprawczą).

7. TooLarge / token limit exceeded
   - Opis: wejście lub odpowiedź przekracza limity tokenów.
   - Działanie: komunikat `input_too_large` i sugestia chunkowania history/summary. W razie odpowiedzi zbyt długiej — `output_truncated` i zwrócenie partial content wraz z flagą.

8. Invalid request / malformed payload
   - Działanie: zwróć `bad_request` z opisem co jest niepoprawne.

Wszystkie błędy powinny zawierać: code, message, optional details (bez wrażliwych danych). Dla wewnętrznych logów można dodać requestId i traceId.

---

## 6. Kwestie bezpieczeństwa

1. Przechowywanie kluczy API
   - Nie przechowywać kluczy w kodzie ani w repozytorium.
   - Preferowane: env vars (process.env), lub secret store (Supabase Secrets / Vault / cloud secrets). W aplikacjach server-side (Astro server endpoints) pobierać klucz po stronie serwera.

2. Ogranicz logowanie
   - Nigdy nie logować pełnego request body lub klucza. Logować jedynie meta (status HTTP, model, latency, requestId).

3. Rate limiting i quota
   - Implementować lokalne throttling per-user/per-tenant, aby zapobiec nadużyciom i nieoczekiwanym kosztom.

4. Input validation
   - Walidować wejściowe JSON Schema (jeśli użytkownik dostarcza responseFormat), limitować maksymalną długość historii.

5. Outbound network
   - Zabezpieczyć listę akceptowalnych hostów (openrouter.ai), TLS weryfikowany.

6. Least privilege
   - Jeśli używamy kluczy z ograniczeniami (OpenRouter/Model-scoped keys), stosować najmniejsze uprawnienia wymagane do działania.

7. Data retention & PII
   - Zdefiniować politykę przechowywania konwersacji i odpowiedzi (maskowanie PII przed zapisem, jeśli konieczne). Umożliwić opcję "do not store" dla wrażliwych danych.

---

## 7. Plan wdrożenia krok po kroku (dostosowany do stacku: Astro + TypeScript + React + Supabase)

Przyjmuję następujące rozsądne założenia:

- Aplikacja ma serwerowe API w `src/pages/api/*` (Astro server endpoints) lub podobny backend, gdzie ORService zostanie wdrożony.
- TypeScript jest używany w całym projekcie.
- Supabase jest używany jako DB/auth i może przechowywać/metadane użycia.

Krok 0 — Przygotowanie i decyzje architektoniczne

- Zdecyduj, czy ORService będzie implementowany jako singleton serwisowy w `src/lib/openrouter.service.ts` (zalecane) czy jako klasa instantiowana per-request.
- Ustal sposób pozyskiwania klucza: env var vs Supabase secrets. Dla szybkiego startu: env var (process.env.OPENROUTER_API_KEY). W produkcji: secret store + minimalne prawa.

Krok 1 — Stwórz szkielet serwisu

- Dodaj plik: `src/lib/openrouter.service.ts` i zdefiniuj klasę `OpenRouterService` z konstruktorem opisanym wcześniej.
- Zaimplementuj publiczne metody `sendMessage`, `sendRaw`, `healthCheck`, `setDefaultModel`.
- Dodaj prywatne metody: `_resolveApiKey`, `_buildPayload`, `_request`, `_handleOpenRouterError`, `_validateResponseFormat`.

Krok 2 — HTTP client i konfiguracja

- Użyj `fetch` (w Node 18+) lub lekko skonfigurowanego `axios` jeśli preferujesz (dodaj do package.json). W TypeScript zadeklaruj typy odpowiedzi.
- Skonfiguruj timeout i retry/backoff w `_request` (prostym exponentional backoff, np. attempts: 3, factor: 2).

Krok 3 — Implementacja response_format (JSON Schema)

- Umożliw użytkownikowi przekazanie `responseFormat` w `sendMessage` jako:

  { type: 'json_schema', json_schema: { name: 'cards_schema_v1', strict: true, schema: { type: 'object', properties: { flashcards: { type: 'array', items: { type: 'object', properties: { question: { type: 'string' }, answer: { type: 'string' } }, required: ['question','answer'] } } }, required: ['flashcards'] } } }

- Implementacja:
  - W `_buildPayload` dołącz `response_format` zgodnie z wymogami OpenRouter.
  - Po otrzymaniu odpowiedzi wykonaj walidację JSON Schema (użyć `ajv` lub `zod` dla TS). Jeżeli schema nie przejdzie, rzuć `invalid_model_response` z fragmentami niezgodności.

Krok 4 — Prompty: systemMessage i userMessage

- W `sendMessage` zbuduj `messages` zgodnie z konwencją OpenRouter: najpierw `system` (opcjonalnie), potem poprzednie wiadomości (`assistant`/`user`), a na końcu aktywna `userMessage`.
- Przykład struktury `messages`:

  [
    { role: 'system', content: 'You are a helpful assistant that returns flashcards in a strict JSON schema.' },
    { role: 'user', content: 'Tutaj poprzednia treść konwersacji...' },
    { role: 'user', content: 'Stwórz 3 fiszki na temat X' }
  ]

- Dobre praktyki: 
  - Trzymać systemMessage krótkim i konkretnym.
  - W razie potrzeby programowo modyfikować systemMessage aby wymusić format.

Krok 5 — Model i parametry modelu

- Domyślny model ustawić w konstruktorze (np. "gpt-4o-mini" lub inny wspierany przez OpenRouter).
- Pozwól nadpisać model per-request poprzez pole `model`.
- Parametry modelu (`temperature`, `max_tokens`, `top_p`, `stop`, `presence_penalty`, etc.) łączać z `defaultParams` oraz z per-request `modelParams`.

Przykładowy payload (z response_format):

{
  model: "gpt-4o-mini",
  messages: [ /* jak wyżej */ ],
  temperature: 0.2,
  max_tokens: 800,
  response_format: {
    type: 'json_schema',
    json_schema: {
      name: 'flashcards_v1',
      strict: true,
      schema: {
        type: 'object',
        properties: {
          flashcards: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                question: { type: 'string' },
                answer: { type: 'string' },
                source: { type: 'string' }
              },
              required: ['question','answer']
            }
          }
        },
        required: ['flashcards']
      }
    }
  }
}

Krok 6 — Obsługa streamingu (opcjonalnie)

- Jeśli chcesz obsłużyć streaming (np. SSE), implementacja będzie wymagać innego endpointu i przepływu — wystaw publiczną metodę `sendMessageStream` i mapuj eventy na klienta.

Krok 7 — Obsługa błędów, monitoring i retry

- Zaimplementuj mapowanie błędów opisane w sekcji błędów.
- Instrumentuj metryki (latency, counts, errors) i wysyłaj do Telemetry (np. Supabase logs, Sentry, lub inny system APM).

Krok 8 — Testy

- Napisz testy jednostkowe (Jest / Vitest) dla:
  - _buildPayload (różne inputy)
  - _validateResponseFormat (poprawny i niepoprawny model output)
  - mapowanie błędów w _handleOpenRouterError
  - healthCheck

Krok 9 — Integracja z aplikacją (frontend)

- Endpointy server-side (Astro): utwórz `src/pages/api/openrouter/send.ts` (lub podobnie) który wywołuje ORService.sendMessage i zwraca znormalizowaną strukturę. Frontend (React) wywołuje ten endpoint.
- Autoryzacja: endpoint powinien sprawdzać uprawnienia użytkownika (Supabase auth) przed umożliwieniem wysyłania żądań, aby uniknąć nadużyć.

Krok 10 — Deployment i CI

- Dodaj env var `OPENROUTER_API_KEY` do środowiska produkcyjnego (np. DigitalOcean App Platform, Vercel secrets, Docker env).
- Zadbaj o tajny dostęp w CI (Github Actions secrets) i nie umieszczaj klucza w workflow.

Krok 11 — Observability i operacje

- Wypuść health endpoint i skonfiguruj monitorowanie uptime.
- Ustaw alerty na nagłe skoki kosztów (duży throughput) lub dużą liczbę błędów rate-limit.

---

## Przykłady (konkretne)

1) Przykład system message (numerowany):

- 1.1 System message (ogólny): "You are a concise assistant that returns answers in exact JSON format according to provided schema. Do not include extra text outside the JSON."

2) Przykład user message:

- 2.1 User message: "Wygeneruj 5 fiszek na temat fotosyntezy. Każda fiszka powinna zawierać pytanie i krótką odpowiedź."

3) Przykład response_format (użyj wzoru podanego w zadaniu):

- 3.1 Response format spec (konkretny):

{ type: 'json_schema', json_schema: { name: 'flashcards_v1', strict: true, schema: { type: 'object', properties: { flashcards: { type: 'array', items: { type: 'object', properties: { question: { type: 'string' }, answer: { type: 'string' }, source: { type: 'string' } }, required: ['question','answer'] } } }, required: ['flashcards'] } } }

4) Przykład wyboru nazwy modelu i parametrów:

- 4.1 Model: "gpt-4o-mini" (domyślny)
- 4.2 Per-request override:

  model: 'gpt-4o-mini',
  modelParams: { temperature: 0.1, max_tokens: 600 }

5) Przykład walidacji odpowiedzi:

- Po otrzymaniu odpowiedzi JSON parsuj ją i użyj `ajv` do walidacji względem `json_schema.schema`. Jeśli `ajv.validate` zwraca false, włącz poniższe dane w error.details: ajv.errors oraz surowy fragment odpowiedzi.

---

## Dodatkowe wskazówki i dobre praktyki

- Utrzymuj krótkie system messages i deleguj logikę do kodu (np. jeśli chcesz, by model zawsze zwracał listę kart, buduj prompt + response_format).
- Zawsze waliduj wynik — modele bywają nieprzewidywalne; response_format to jedynie preferencja modelu.
- Dla kosztów: preferuj niższą temperaturę oraz mniejsze `max_tokens` dla generacji strukturalnej.
- Ustaw per-user rate-limits na serwerze, nie polegaj jedynie na rate-limit dostawcy.

---

## Słowniczek (krótkie definicje)

- response_format — mechanizm OpenRouter pozwalający wymusić format odpowiedzi (np. JSON Schema). Representowany jako obiekt z typem `json_schema` i zagnieżdżonym `schema`.
- systemMessage — wiadomość, która kieruje zachowaniem modelu.
- userMessage — aktywna wiadomość użytkownika/skryptu skierowana do modelu.

---

Plik zapisany: `.ai/openrouter-service-implementation-plan.md`

Powodzenia przy implementacji — jeśli chcesz, mogę od razu stworzyć szkic pliku `src/lib/openrouter.service.ts` z minimalną implementacją i testami jednostkowymi.
