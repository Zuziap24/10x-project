<authentication_analysis>
1. **Przepływy autentykacji**:
   - **Rejestracja**: Użytkownik tworzy konto przez formularz `RegisterForm` -> `POST /api/auth/register` -> `Supabase Auth`.
   - **Logowanie**: Użytkownik loguje się przez `LoginForm` -> `POST /api/auth/signin` -> `Supabase Auth` zwraca sesję -> Serwer ustawia ciasteczka HttpOnly.
   - **Dostęp do stron chronionych**: Middleware przechwytuje żądanie -> Weryfikuje token (SSR) -> Odświeża token w razie potrzeby -> `context.locals`.
   - **Wylogowanie**: Wywołanie `/api/auth/signout` -> Usunięcie sesji w Supabase i wyczyszczenie ciasteczek.
   - **Reset hasła**: Inicjacja resetu -> Link magiczny -> Ustawienie nowego hasła.

2. **Aktorzy i interakcje**:
   - **Przeglądarka**: Klient użytkownika, przechowuje ciasteczka sesyjne.
   - **Middleware**: Pierwsza warstwa obrony na serwerze Astro (SSR). Zarządza klientem Supabase i weryfikuje użytkownika.
   - **Astro API**: Endpointy serwerowe (`src/pages/api/auth/*`) realizujące logikę biznesową.
   - **Supabase Auth**: Zewnętrzny serwis autentykacji i bazy danych.

3. **Procesy weryfikacji i odświeżania**:
   - **Weryfikacja**: Odbywa się przy każdym żądaniu w Middleware przy użyciu `supabase.auth.getUser()`, co zapewnia bezpieczeństwo po stronie serwera.
   - **Odświeżanie tokena**: Biblioteka `@supabase/ssr` automatycznie obsługuje odświeżanie tokena (`refresh_token`) w Middleware, aktualizując ciasteczko w odpowiedzi (`Set-Cookie`), jeśli token dostępu wygasł.

4. **Kroki autentykacji** (skrót):
   - Żądanie strony -> Middleware sprawdza ciasteczka -> Jeśli brak/błąd -> Przekierowanie do `/signin`.
   - Logowanie -> API weryfikuje dane w Supabase -> Zwraca ciasteczka sesyjne.
   - Sesja aktywna -> Middleware wpuszcza żądanie -> Aplikacja ma dostęp do `user` w `context.locals`.
</authentication_analysis>

<mermaid_diagram>
```mermaid
sequenceDiagram
    autonumber
    participant Browser as Przeglądarka
    participant MW as Middleware SSR
    participant API as Astro API Auth
    participant Supabase as Supabase Auth

    Note over Browser, Supabase: Proces Rejestracji i Logowania

    activate Browser
    Browser->>API: POST /api/auth/register (email, password)
    activate API
    API->>Supabase: supabase.auth.signUp()
    activate Supabase
    Supabase-->>API: User Created / Confirmation Needed
    deactivate Supabase
    
    alt Rejestracja udana
        API-->>Browser: 200 OK (Możliwe auto-logowanie lub info o mailu)
    else Błąd rejestracji
        API-->>Browser: 400 Bad Request (np. email zajęty)
    end
    deactivate API
    deactivate Browser

    Browser->>Browser: Użytkownik przechodzi na /signin

    activate Browser
    Browser->>API: POST /api/auth/signin (email, password)
    activate API
    API->>Supabase: supabase.auth.signInWithPassword()
    activate Supabase
    
    alt Dane poprawne
        Supabase-->>API: Session (Access Token, Refresh Token)
        API->>API: Ustawienie ciasteczek sesyjnych (HttpOnly)
        API-->>Browser: 200 OK / Redirect to Dashboard (/)
        Note right of Browser: Ciasteczka zapisane w przeglądarce
    else Dane niepoprawne
        Supabase-->>API: Error (Invalid Credentials)
        API-->>Browser: 401 Unauthorized
    end
    deactivate Supabase
    deactivate API
    deactivate Browser

    Note over Browser, Supabase: Cykl życia żądania do strony chronionej (np. /profile)

    activate Browser
    Browser->>MW: GET /profile (Ciasteczka sesyjne)
    activate MW
    MW->>MW: createServerClient(cookies)
    MW->>Supabase: supabase.auth.getUser()
    activate Supabase

    alt Token ważny
        Supabase-->>MW: User Object
    else Token wygasł (Refresh Flow)
        Supabase-->>MW: Token Expired error
        MW->>Supabase: Wymiana Refresh Token na nowy Access Token
        Supabase-->>MW: New Session
        MW->>MW: Aktualizacja ciasteczka (Set-Cookie)
    end
    deactivate Supabase

    alt Użytkownik zweryfikowany
        MW->>MW: locals.user = user
        MW-->>Browser: Render (200 OK) + ew. Set-Cookie
        Note left of MW: Strona renderowana z kontekstem użytkownika
    else Brak autoryzacji / Błąd sesji
        MW->>MW: locals.user = null
        MW-->>Browser: 302 Redirect -> /signin
    end
    deactivate MW
    deactivate Browser

    Note over Browser, Supabase: Proces Wylogowania

    activate Browser
    Browser->>API: POST /GET /api/auth/signout
    activate API
    API->>Supabase: supabase.auth.signOut()
    activate Supabase
    Supabase-->>API: Success
    deactivate Supabase
    API->>API: Usunięcie ciasteczek sesyjnych
    API-->>Browser: Redirect -> /signin
    deactivate API
    deactivate Browser
```
</mermaid_diagram>
