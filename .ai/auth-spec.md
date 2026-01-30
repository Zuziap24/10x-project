# Specyfikacja Techniczna Modułu Autentykacji i Autoryzacji (10x-project)

## Wstęp

Niniejszy dokument definiuje architekturę techniczną dla modułu uwierzytelniania (logowanie, rejestracja, odzyskiwanie hasła) oraz autoryzacji (ochrona zasobów) w aplikacji 10xCards. Rozwiązanie opiera się na stacku technicznym: Astro 5 (SSR), React 19, Supabase Auth oraz Shadcn/ui.

Realizowane wymagania biznesowe (PRD):
- **US-001**: Rejestracja konta
- **US-002**: Logowanie do aplikacji
- **US-003, US-004**: Ochrona dostępu do talii i funkcji AI dla zalogowanych użytkowników

---

## 1. Architektura Interfejsu Użytkownika (Frontend)

Interfejs zostanie podzielony na strefę publiczną (auth) oraz prywatną (dashboard).

### 1.1 Mapowanie Stron (Astro Pages)

Należy utworzyć nowe strony w katalogu `src/pages`. Strony te będą pełnić rolę kontenerów dla interaktywnych komponentów React oraz będą obsługiwać przekierowania w przypadku wykrycia aktywnej sesji (dla stron logowania) lub jej braku (dla stron chronionych).

| Ścieżka URL | Plik Astro | Dostęp | Opis |
|---|---|---|---|
| `/signin` | `src/pages/signin.astro` | Publiczny (Guest only) | Strona logowania. Jeśli użytkownik jest zalogowany -> redirect do `/` (dashboard). |
| `/register` | `src/pages/register.astro` | Publiczny (Guest only) | Strona rejestracji. Jeśli użytkownik jest zalogowany -> redirect do `/`. |
| `/forgot-password` | `src/pages/forgot-password.astro` | Publiczny | Strona inicjowania procedury resetu hasła. |
| `/auth/callback` | `src/pages/auth/callback.ts` | Publiczny | API Route (SSR) obsługujący potwierdzenie adresu email (wymiana kodu na sesję). |

### 1.2 Layouty

*   **`AuthLayout.astro` (Nowy)**:
    *   Minimalistyczny layout dedykowany dla stron autentykacji.
    *   Brak głównej nawigacji (header/sidebar).
    *   Centralnie umieszczony kontener "karta" na formularz.
    *   Logo aplikacji i powrót do strony głównej.
*   **`Layout.astro` (Rozszerzenie)**:
    *   Modyfikacja nagłówka (`Header`):
        *   Dla niezalogowanych: Wyświetlanie przycisku "Zaloguj".
        *   Dla zalogowanych: Wyświetlanie Awatara użytkownika / Dropdown menu z opcją "Wyloguj".
    *   Stan zalogowania przekazywany z `Astro.locals` do komponentów UI.

### 1.3 Komponenty Interaktywne (React)

Formularze zostaną zaimplementowane jako komponenty React (Client Components) wykorzystujące walidację po stronie klienta i komunikację z API.

*   **`src/components/auth/LoginForm.tsx`**:
    *   Pola: Email, Hasło.
    *   Akcje: Submit -> POST do `/api/auth/signin`.
    *   Error handling: Wyświetlanie błędów z API (nieprawidłowe dane, błąd serwera) przy użyciu komponentu `Alert` lub `Toaster` (Shadcn/ui).
    *   Stan loading: Blokada przycisku podczas requestu.
*   **`src/components/auth/RegisterForm.tsx`**:
    *   Pola: Email, Hasło, Powtórz hasło.
    *   Walidacja: Zgodność haseł, siła hasła (min. 6 znaków).
    *   Akcje: Submit -> POST do `/api/auth/register`.
*   **`ui/LogoutButton.tsx`**:
    *   Obsługa wylogowania poprzez strzał do `/api/auth/signout` i przeładowanie/przekierowanie strony.

### 1.4 Walidacja (Client-side)

Wykorzystanie bibliotek:
- **Zod**: Definicja schematów walidacji (np. `LoginSchema`, `RegisterSchema`) w `src/lib/validators/auth.ts`, współdzielonych miedzy frontend a backend.
- **React Hook Form**: Zarządzanie stanem formularzy i integracja z Zod.

---

## 2. Logika Backendowa i API (Server-side)

Ze względu na tryb Astro SSR (`output: 'server'`), operacje autentykacji będą realizowane poprzez dedykowane Server Endpoints. Pozwala to na bezpieczne ustawianie ciasteczek `HttpOnly` i kontrolę nad sesją.

### 2.1 Endpointy API (`src/pages/api/auth/`)

*   **`POST /api/auth/register`**:
    *   Odbiera JSON `{ email, password }`.
    *   Waliduje dane wejściowe (Zod).
    *   Wywołuje `supabase.auth.signUp()`.
    *   *Uwaga*: Zgodnie z US-001, celem jest natychmiastowe zalogowanie. Należy skonfigurować Supabase (opcjonalnie wyłączyć potwierdzenie email dla MVP) lub obsłużyć flow, gdzie użytkownik jest informowany o konieczności potwierdzenia. W domyślnej bezpiecznej konfiguracji zwraca informację o wysłaniu emaila.
    *   Zwraca status 200 lub 400.
*   **`POST /api/auth/signin`**:
    *   Odbiera JSON `{ email, password }`.
    *   Wywołuje `supabase.auth.signInWithPassword()`.
    *   **Kluczowe**: Ustawia ciasteczka sesyjne (AccessToken, RefreshToken) w odpowiedzi, co pozwala mechanizmowi SSR Astro widzieć zalogowanego użytkownika w kolejnych żądaniach.
    *   Zwraca przekierowanie do dashboardu lub JSON z sukcesem.
*   **`GET /api/auth/signout`**:
    *   Wywołuje `supabase.auth.signOut()`.
    *   Czyści ciasteczka sesyjne.
    *   Przekierowuje na stronę główną/logowania.

### 2.2 Model Danych i Typy

*   Aktualizacja `src/types.ts` o interfejsy DTO dla Auth (`LoginRequest`, `RegisterRequest`).
*   Wykorzystanie wygenerowanych typów bazy danych (`Database`) z `src/db/database.types.ts`.

---

## 3. System Autentykacji (Integracja Supabase + Astro SSR)

To jest najbardziej krytyczny element architektury, zapewniający bezpieczeństwo i spójność sesji między serwerem a klientem.

### 3.1 Klient Supabase

Aktualna implementacja singletona w `src/db/supabase.client.ts` jest niepoprawna dla SSR. Należy ją zastąpić podejściem wykorzystującym bibliotekę `@supabase/ssr`.

*   **Helper SSR**: Funkcja tworząca klienta Supabase w oparciu o obiekt `context` Astro (Request/Response cookies). Klient ten musi mieć możliwość odczytu i zapisu ciasteczek.

### 3.2 Middleware (`src/middleware/index.ts`)

Middleware pełni rolę "Strażnika" (Guard). Zostanie rozbudowany o:

1.  **Inicjalizację Klienta**: Tworzenie instancji `SupabaseClient` przy każdym żądaniu, z przekazaniem obsługi ciasteczek (get/set/remove).
2.  **Weryfikację Sesji**: Wywołanie `supabase.auth.getUser()`.
    *   *Uwaga:* Używamy `getUser` (bezpieczne, weryfikacja po stronie serwera Auth), a nie `getSession`.
3.  **Zapis do Locals**: Obiekt `user` oraz `supabase` client są zapisywane w `context.locals`, aby były dostępne w stronach Astro i API routes.
4.  **Ochronę Routingu (Protected Routes)**:
    *   Definicja ścieżek chronionych: `/profile`, `/account`.
    *   Logika: Jeśli request dotyczy ścieżki chronionej ORAZ `user` jest `null` -> Przekierowanie (302) do `/signin`.
    *   *Uwaga*: Strony takie jak `/` (dashboard) czy `/decks` są dostępne publicznie (dla Gości), aby umożliwić tworzenie talii w trybie lokalnym (zgodnie z US-003). Dostęp do danych z bazy (API) oraz funkcji AI (US-004) będzie weryfikowany na poziomie komponentów/API.
5.  **Ochronę Stron Auth (Guest Routes)**:
    *   Definicja ścieżek dla gości: `/signin`, `/register`.
    *   Logika: Jeśli request dotyczy auth route ORAZ `user` posiada sesję -> Przekierowanie (302) do `/`.
6.  **Odświeżanie Tokena**: Middleware automatycznie obsłuży odświeżenie tokena (refresh token) i zaktualizuje ciasteczko w odpowiedzi (`set-cookie`), jeśli jest to wymagane przez pakiet `@supabase/ssr`.

### 3.3 Obsługa Błędów

*   Błędy autentykacji (401/403) w API powinny zwracać czytelne komunikaty JSON.
*   Błędy na poziomie renderowania strony powinny przekierowywać do strony błędu lub logowania z parametrem `?error=reason`.

### 3.4 Procedura Odzyskiwania Hasła

1.  Użytkownik podaje e-mail na `/forgot-password`.
2.  Backend wysyła link magiczny (konfiguracja Supabase) kierujący do `/auth/update-password`.
3.  Strona `/auth/update-password` wymusza ustawienie nowego hasła (wymaga aktywnej sesji tymczasowej utworzonej przez link).

## Podsumowanie zmian w strukturze plików

```text
src/
  components/
    auth/               # [NOWE] Komponenty Auth
      LoginForm.tsx
      RegisterForm.tsx
  layouts/
    AuthLayout.astro    # [NOWE] Layout dla logowania/rejestracji
  lib/
    utils/
      supabase/         # [MODYFIKACJA] Utilitis do tworzenia klienta (server vs client)
  middleware/
    index.ts            # [MODYFIKACJA] Zarządzanie sesją i ochrona routingu
  pages/
    api/
      auth/             # [NOWE] API Endpoints
        signin.ts
        register.ts
        signout.ts
        callback.ts
    signin.astro        # [NOWE]
    register.astro      # [NOWE]
    forgot-password.astro # [NOWE]
```
