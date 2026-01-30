# Diagram Architektury UI - Moduł Autentykacji

Poniższy diagram przedstawia architekturę komponentów UI oraz przepływ danych dla modułów logowania i rejestracji w aplikacji 10x-cards. Wizualizacja obejmuje podział na warstwę serwerową (Astro), kliencką (React) oraz infrastrukturę backendową.

```mermaid
flowchart TD
    %% Definicje stylów
    classDef astro fill:#e1f5fe,stroke:#01579b,stroke-width:2px;
    classDef react fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px;
    classDef ui fill:#fff3e0,stroke:#ef6c00,stroke-width:1px,stroke-dasharray: 5 5;
    classDef infra fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px;

    %% Legenda
    subgraph Legend ["Legenda Technologii"]
        direction LR
        L1[Astro Server Page]:::astro
        L2[React Client Component]:::react
        L3[UI Component / Lib]:::ui
        L4[Infra / Database]:::infra
    end

    %% Główny przepływ
    subgraph Routing ["Routing i Layout (Astro)"]
        Browser[Przeglądarka Użytkownika]
        ML[MarketingLayout.astro]:::astro
        
        subgraph AuthPages ["Strony Autentykacji"]
            PageLogin["/pages/login.astro"]:::astro
            PageReg["/pages/register.astro"]:::astro
        end
    end

    subgraph ClientLogic ["Logika Klienta (React)"]
        direction TB
        
        subgraph Forms ["Formularze Interaktywne"]
            LoginForm[LoginForm.tsx]:::react
            RegForm[RegisterForm.tsx]:::react
        end

        subgraph Validation ["Logika Biznesowa"]
            ZodSchema[["Schemat Zod (Walidacja)"]]:::ui
            RHF[["React Hook Form (Stan)"]]:::ui
        end

        subgraph UIComponents ["Shadcn UI"]
            UI_Input[Input]:::ui
            UI_Button[Button]:::ui
            UI_Card[Card / Wrapper]:::ui
            UI_Toast[Toaster / Powiadomienia]:::ui
        end
    end

    subgraph Backend ["Backend i Przekierowania"]
        SupaClient[("Supabase Client (Auth API)")]:::infra
        DB[(Supabase Auth DB)]:::infra
        Dashboard[("/dashboard")]:::astro
    end

    %% Połączenia - Struktura
    Browser -->|Żądanie URL| ML
    ML --> PageLogin
    ML --> PageReg
    
    PageLogin -->|Hydracji client:load| LoginForm
    PageReg -->|Hydracji client:load| RegForm

    %% Połączenia - Zależności Komponentów
    LoginForm --- UI_Card
    RegForm --- UI_Card
    
    UI_Card --- UI_Input
    UI_Card --- UI_Button

    LoginForm -.->|Używa| RHF
    RegForm -.->|Używa| RHF
    RHF -.->|Weryfikuje| ZodSchema

    %% Połączenia - Przepływ Danych i Akcje
    LoginForm ==>|1. Submit| SupaClient
    RegForm ==>|1. Submit| SupaClient

    SupaClient <==>|2. Weryfikacja| DB

    %% Obsługa odpowiedzi
    SupaClient --"3a. Błąd (Error)"--> UI_Toast
    SupaClient --"3b. Sukces (Session)"--> Dashboard

    %% Opisy węzłów
    ML("Marketing Layout<br/>(Statyczny szkielet)")
    PageLogin("Strona Logowania<br/>(Kontener)")
    PageReg("Strona Rejestracji<br/>(Kontener)")
    Dashboard("Panel Główny<br/>(AppLayout)")
```

## Opis komponentów

### Warstwa Layoutu (Astro)
*   **MarketingLayout.astro**: Główny szablon dla stron publicznych. Zawiera nagłówek, stopkę i style globalne (CSS). Odpowiada za initial paint.
*   **Strony logowania/rejestracji**: Pliki `.astro` działające jako kontenery. Są renderowane na serwerze i dostarczają "szkielet" strony, w który hydrowane są komponenty React.

### Warstwa Logiki Klienta (React)
*   **LoginForm / RegisterForm**: Główne komponenty "smart". Obsługują:
    *   Zarządzanie stanem formularza (inputy użytkownika).
    *   Walidację w czasie rzeczywistym i przy wysyłce (poprzez Zod).
    *   Komunikację z `supabase.client.ts`.
    *   Obsługę stanów ładowania (loading) i błędów.
*   **Shadcn UI**: Zestaw komponentów prezentacyjnych (`dumb components`), które zapewniają spójny wygląd (Input, Button, Card).

### Warstwa Infrastruktury
*   **Supabase Client**: Singleton odpowiedzialny za bezpieczną komunikację z API autentykacji Supabase.
*   **Toaster**: Globalny komponent do wyświetlania komunikatów (np. "Złe hasło", "Konto utworzone"), sterowany zdarzeniami z formularzy.
