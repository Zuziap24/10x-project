<analiza_projektu>

**1. Kluczowe komponenty projektu:**
*   **Frontend (UI/UX):** Hybrydowa architektura oparta na Astro (routing, SSG/SSR) oraz React (interaktywne komponenty „wyspowe”). Kluczowe elementy to system autentykacji (`components/auth`), zarządzanie taliami (`components/decks`), oraz system designu „Fluent” (`components/fluent`, `components/ui`).
*   **Backend (API Routes):** Endpointy w `src/pages/api` obsługujące logikę biznesową: autentykację, operacje CRUD na taliach i fiszkach oraz integrację z AI.
*   **Warstwa Danych:** Integracja z Supabase (PostgreSQL) poprzez klienta (`db/supabase.client.ts`). Wykorzystanie Row Level Security (RLS) po stronie bazy (implikowane przez `supabase.auth.getUser()`).
*   **AI Service:** Moduł `lib/services/ai-generation.service.ts` oraz `openrouter.service.ts` odpowiedzialny za komunikację z LLM, walidację odpowiedzi (JSON Schema) oraz parsowanie wyników.
*   **Stan i Cache:** Wykorzystanie TanStack Query (`hooks/useDeck.ts`) do zarządzania stanem serwera po stronie klienta.

**2. Specyfika stosu technologicznego a testowanie:**
*   **Astro + React:** Wymaga podejścia, które testuje zarówno statycznie renderowane strony (Astro), jak i hydrowane komponenty Reacta. Testy E2E będą tu kluczowe, aby sprawdzić integrację między tymi światami.
*   **Supabase Auth:** Testy muszą uwzględniać mockowanie sesji użytkownika oraz obsługę ciasteczek (cookies), ponieważ middleware (`middleware/index.ts`) opiera na nich ochronę tras.
*   **OpenRouter/AI:** Testowanie rzeczywistych zapytań AI jest kosztowne i niedeterministyczne. Konieczne jest silne mockowanie warstwy serwisu AI, aby testować logikę aplikacji (parsowanie, obsługa błędów, rate limiting), a nie inteligencję modelu.
*   **Zod Validator:** Walidacja jest silnie typowana. Testy jednostkowe dla `src/validators` są tanie i powinny pokrywać przypadki brzegowe.

**3. Priorytety testowe:**
1.  **AI Generation Workflow:** To „killer feature” aplikacji (`api/decks/[deckId]/generate.ts` -> `AIGenerationDialog`). Ryzyko błędów parsowania odpowiedzi AI jest wysokie.
2.  **Autentykacja i Autoryzacja:** Zabezpieczenie danych użytkownika (middleware, API routes). Błąd tutaj oznacza wyciek danych.
3.  **CRUD Operacje (Decks/Flashcards):** Podstawowa funkcjonalność aplikacji. Poprawność integracji z bazą danych.
4.  **Komponenty UI (Fluent):** Zapewnienie, że customowy system designu działa poprawnie (np. `Dialog`, `Input`, `Tabs`).

**4. Obszary ryzyka:**
*   **Obsługa błędów AI:** Co się stanie, gdy API OpenRouter zwróci 500, timeout lub niepoprawny JSON? (Obsłużone w kodzie, ale wymaga weryfikacji).
*   **Rate Limiting:** Mechanizm `src/lib/utils/rate-limit.ts` musi działać bezbłędnie, aby uniknąć nadmiernych kosztów.
*   **Spójność danych:** Synchronizacja między stanem klienta (TanStack Query) a bazą danych po operacjach mutacji (np. dodanie fiszki).
*   **Middleware:** Czy na pewno blokuje dostęp do chronionych tras (`/dashboard`, `/generate`) dla niezalogowanych użytkowników?

</analiza_projektu>

<plan_testów>

# Plan Testów dla Projektu 10xCards

## 1. Wprowadzenie
Dokument ten określa strategię testowania aplikacji **10xCards** – platformy do generowania fiszek wspomaganej przez AI. Aplikacja oparta jest na frameworku Astro, bibliotece React oraz usługach Supabase i OpenRouter. Celem testów jest zapewnienie stabilności, bezpieczeństwa danych użytkowników oraz niezawodności funkcji generowania treści przez AI.

## 2. Zakres Testów
Plan obejmuje weryfikację następujących obszarów:
*   **Frontend:** Komponenty interfejsu użytkownika (React), formularze, nawigacja i obsługa stanu (TanStack Query).
*   **Backend API:** Endpointy Astro (`src/pages/api/*`) obsługujące logikę biznesową.
*   **Integracje:** Komunikacja z Supabase (Auth, DB) oraz OpenRouter (AI).
*   **Bezpieczeństwo:** Weryfikacja middleware i uprawnień dostępu do zasobów.
*   **Logika Biznesowa:** Algorytmy walidacji danych i parsowania odpowiedzi AI.

**Wyłączenia z zakresu:**
*   Testowanie jakości merytorycznej odpowiedzi generowanych przez modele AI (OpenAI/Anthropic) – testujemy jedynie poprawność obsługi tych odpowiedzi przez aplikację.
*   Testy wydajnościowe infrastruktury Supabase.

## 3. Typy Testów

### 3.1. Testy Jednostkowe (Unit Tests)
Skupione na izolowanych fragmentach kodu.
*   **Walidatory:** `src/lib/validators/*.ts` (sprawdzenie poprawności schematów Zod).
*   **Utilities:** `src/lib/utils/rate-limit.ts`, `src/lib/utils/hash.ts`.
*   **Komponenty UI:** `src/components/fluent/*` (np. czy `Button` renderuje odpowiednie warianty).
*   **AI Service:** `src/lib/services/ai-generation.service.ts` (testowanie parsowania JSON i obsługi błędów przy użyciu mocków).

### 3.2. Testy Integracyjne (Integration Tests)
Weryfikacja współpracy modułów.
*   **API Routes:** Testowanie endpointów `api/decks/*` i `api/auth/*` z wykorzystaniem zamockowanej bazy danych lub testowej instancji Supabase.
*   **Hooks:** Testowanie `useDeck.ts` i `useFlashcards.ts` w kontekście `QueryClientProvider`.
*   **Formularze:** Integracja `react-hook-form` z walidacją Zod i wysyłką danych (np. `RegisterForm`, `LoginForm`).

### 3.3. Testy End-to-End (E2E)
Symulacja pełnych ścieżek użytkownika w przeglądarce.
*   Pełny proces: Rejestracja -> Tworzenie Talii -> Generowanie Fiszek z AI -> Nauka.

## 4. Scenariusze Testowe

### 4.1. Moduł Autentykacji (`src/components/auth`, `src/pages/api/auth`)
| ID | Nazwa Scenariusza | Oczekiwany Wynik | Priorytet |
|:---|:---|:---|:---|
| AUTH-01 | Rejestracja z poprawnymi danymi | Utworzenie konta, przekierowanie, status 200. | Wysoki |
| AUTH-02 | Rejestracja na istniejący email | Błąd walidacji, komunikat dla użytkownika. | Średni |
| AUTH-03 | Logowanie i sesja | Poprawne ustawienie ciasteczek sesyjnych, dostęp do Dashboardu. | Wysoki |
| AUTH-04 | Próba dostępu do `/dashboard` bez logowania | Przekierowanie przez Middleware do `/signin`. | Wysoki |
| AUTH-05 | Reset hasła (`ForgotPasswordForm`) | Wysłanie maila (mock), poprawna obsługa API `reset-password`. | Średni |

### 4.2. Moduł Talii i Fiszek (`src/components/decks`, `src/api/decks`)
| ID | Nazwa Scenariusza | Oczekiwany Wynik | Priorytet |
|:---|:---|:---|:---|
| DECK-01 | Tworzenie nowej talii | Talia widoczna na liście, licznik fiszek = 0. | Wysoki |
| DECK-02 | Ręczne dodawanie fiszki (`ManualFlashcardDialog`) | Fiszka dodana do bazy, lista odświeżona (inwalidacja cache). | Wysoki |
| DECK-03 | Walidacja limitu znaków fiszki | Blokada zapisu przy przekroczeniu limitu (Zod schema). | Średni |
| DECK-04 | Pobieranie listy z paginacją | Ładowanie kolejnych stron fiszek ("Load More"). | Średni |
| DECK-05 | Usuwanie fiszki | Usunięcie z widoku i bazy, aktualizacja licznika talii. | Średni |

### 4.3. Moduł AI Generation (`src/services/ai-generation`, `src/pages/api/decks/[id]/generate`)
| ID | Nazwa Scenariusza | Oczekiwany Wynik | Priorytet |
|:---|:---|:---|:---|
| AI-01 | Generowanie fiszek - Happy Path | Otrzymanie sugestii, wyświetlenie w oknie dialogowym. | Krytyczny |
| AI-02 | Obsługa błędu API OpenRouter | Wyświetlenie komunikatu o błędzie (np. timeout, błąd modelu). | Wysoki |
| AI-03 | Walidacja Rate Limit (`rate-limit.ts`) | Blokada żądania po przekroczeniu X prób/h, kod 429. | Wysoki |
| AI-04 | Zbyt krótki tekst źródłowy | Blokada wysyłki żądania (walidacja frontend + backend). | Średni |
| AI-05 | Akceptacja wygenerowanych fiszek | Zapis wybranych fiszek do bazy z flagą `source: ai-full`/`ai-edited`. | Wysoki |
| AI-06 | Edycja sugestii AI przed zapisem | Zapisana fiszka zawiera zmienioną treść i flagę `was_edited`. | Średni |

## 5. Środowisko Testowe i Dane
*   **Środowisko lokalne:** Uruchomienie `npm run dev` z podłączonym lokalnym Supabase (lub projektem dev w chmurze) oraz zmienną `USE_MOCK_AI=true` dla testowania UI bez kosztów.
*   **Środowisko CI:** Github Actions uruchamiające testy jednostkowe i lintery przy każdym Pull Requeście.
*   **Mockowanie:**
    *   **AI:** Użycie `src/lib/services/ai-generation.service.ts` w trybie mock (`generateMockFlashcards`) lub interceptorów HTTP (MSW) do symulacji odpowiedzi OpenRouter.
    *   **Baza Danych:** Wykorzystanie dedykowanej bazy testowej Supabase, resetowanej przed cyklem testów E2E.

## 6. Narzędzia
*   **Testy Jednostkowe/Integracyjne:** **Vitest** (ze względu na szybkość i kompatybilność z Vite/Astro).
*   **Testy E2E:** **Playwright** (obsługa wielu kart, łatwe testowanie autentykacji i storage state).
*   **Mockowanie API:** **MSW (Mock Service Worker)** - kluczowe do testowania `openrouter.service.ts` bez wydawania tokenów.
*   **Linting/Formatowanie:** ESLint, Prettier (skonfigurowane w projekcie).

## 7. Harmonogram Testów
1.  **Faza 0 (Natychmiast):** Konfiguracja Vitest i napisanie testów jednostkowych dla `src/lib/validators` oraz `src/lib/utils`.
2.  **Faza 1 (Backend):** Testy integracyjne endpointów API (Auth, Decks, Generate) z wykorzystaniem MSW.
3.  **Faza 2 (Frontend):** Testy komponentów krytycznych (`LoginForm`, `AIGenerationDialog`).
4.  **Faza 3 (E2E):** Implementacja scenariuszy krytycznych (Happy Path) w Playwright.

## 8. Kryteria Akceptacji (DoD - Definition of Done)
*   Wszystkie testy jednostkowe i integracyjne przechodzą (Pass).
*   Pokrycie kodu (Code Coverage) dla `src/lib` i `src/api` wynosi min. 80%.
*   Krytyczne ścieżki użytkownika są pokryte testami E2E.
*   Aplikacja poprawnie obsługuje błędy sieciowe podczas generowania AI (nie crashuje się).
*   Brak błędów "Type Error" w konsoli (TypeScript strict mode).

## 9. Procedury Raportowania Błędów
W przypadku wykrycia błędu, zgłoszenie w systemie Issue Tracker powinno zawierać:
1.  Opis kroku po kroku (Steps to Reproduce).
2.  Dane wejściowe (np. tekst użyty do generowania).
3.  Logi z konsoli przeglądarki lub serwera (z uwzględnieniem `src/lib/logger.ts`).
4.  Informację, czy błąd występuje przy `USE_MOCK_AI=true` czy `false`.

</plan_testów>