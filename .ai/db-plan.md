# Plan Schematu Bazy Danych - 10x-cards (Merged v2)

Ten schemat łączy wymagania funkcjonalne MVP (Talie, Spaced Repetition) z zaawansowaną analityką generowania treści przez AI.

## 1. Tabele

### 1.1 `decks`

Przechowuje talie fiszek. Jest to główna jednostka organizacyjna dla materiału użytkownika.

| Kolumna       | Typ Danych    | Ograniczenia                                              | Opis                         |
| :------------ | :------------ | :-------------------------------------------------------- | :--------------------------- |
| `id`          | `UUID`        | `PRIMARY KEY`, `DEFAULT gen_random_uuid()`                | Unikalny identyfikator talii |
| `user_id`     | `UUID`        | `NOT NULL`, `REFERENCES auth.users(id) ON DELETE CASCADE` | Właściciel talii             |
| `name`        | `TEXT`        | `NOT NULL`                                                | Nazwa talii                  |
| `description` | `TEXT`        | `NULL`                                                    | Opcjonalny opis              |
| `created_at`  | `TIMESTAMPTZ` | `NOT NULL`, `DEFAULT now()`                               | Data utworzenia              |
| `updated_at`  | `TIMESTAMPTZ` | `NOT NULL`, `DEFAULT now()`                               | Data modyfikacji             |

### 1.2 `generations`

Rejestr operacji generowania fiszek przez AI. Pozwala na audyt kosztów, jakości i używanych modeli.

| Kolumna               | Typ Danych    | Ograniczenia                                               | Opis                                              |
| :-------------------- | :------------ | :--------------------------------------------------------- | :------------------------------------------------ |
| `id`                  | `UUID`        | `PRIMARY KEY`, `DEFAULT gen_random_uuid()`                 | Unikalny identyfikator generacji                  |
| `user_id`             | `UUID`        | `NOT NULL`, `REFERENCES auth.users(id)`                    | Użytkownik zlecający                              |
| `model`               | `VARCHAR`     | `NOT NULL`                                                 | Nazwa modelu (np. 'gpt-4o', 'claude-3')           |
| `source_text_hash`    | `VARCHAR`     | `NOT NULL`                                                 | Hash tekstu źródłowego (do wykrywania duplikatów) |
| `source_text_length`  | `INTEGER`     | `NOT NULL CHECK (source_text_length BETWEEN 10 AND 50000)` | Długość tekstu wejściowego                        |
| `generated_count`     | `INTEGER`     | `NOT NULL`                                                 | Liczba wygenerowanych propozycji                  |
| `generation_duration` | `INTEGER`     | `NOT NULL`                                                 | Czas trwania generowania (ms)                     |
| `created_at`          | `TIMESTAMPTZ` | `NOT NULL`, `DEFAULT now()`                                | Data operacji                                     |

### 1.3 `flashcards`

Główna tabela przechowująca wiedzę. Łączy treść, metadane algorytmu nauki oraz historię pochodzenia (AI vs Manual).

| Kolumna          | Typ Danych    | Ograniczenia                                                     | Opis                                           |
| :--------------- | :------------ | :--------------------------------------------------------------- | :--------------------------------------------- |
| `id`             | `UUID`        | `PRIMARY KEY`, `DEFAULT gen_random_uuid()`                       | Unikalny identyfikator fiszki                  |
| `deck_id`        | `UUID`        | `NOT NULL`, `REFERENCES public.decks(id) ON DELETE CASCADE`      | Przypisanie do talii                           |
| `user_id`        | `UUID`        | `NOT NULL`, `REFERENCES auth.users(id)`                          | Denormalizacja dla wydajności RLS i zapytań    |
| `generation_id`  | `UUID`        | `NULL`, `REFERENCES public.generations(id) ON DELETE SET NULL`   | Powiązanie z sesją generowania (jeśli dotyczy) |
| `front`          | `TEXT`        | `NOT NULL`                                                       | Treść pytania                                  |
| `back`           | `TEXT`        | `NOT NULL`                                                       | Treść odpowiedzi                               |
| `source`         | `VARCHAR`     | `NOT NULL. CHECK (source IN ('ai-full', 'ai-edited', 'manual'))` | Źródło pochodzenia fiszki                      |
| **Pola SR**      |               |                                                                  | **Algorytm Spaced Repetition**                 |
| `next_review_at` | `TIMESTAMPTZ` | `NOT NULL`, `DEFAULT now()`                                      | Harmonogram: Kiedy kolejna powtórka?           |
| `interval`       | `INTEGER`     | `NOT NULL`, `DEFAULT 0`                                          | Interwał w dniach                              |
| `ease_factor`    | `REAL`        | `NOT NULL`, `DEFAULT 2.5`                                        | Trudność materiału                             |
| `repetitions`    | `INTEGER`     | `NOT NULL`, `DEFAULT 0`                                          | Liczba powtórzeń z rzędu                       |
| **Meta**         |               |                                                                  |                                                |
| `created_at`     | `TIMESTAMPTZ` | `NOT NULL`, `DEFAULT now()`                                      | Data utworzenia                                |
| `updated_at`     | `TIMESTAMPTZ` | `NOT NULL`, `DEFAULT now()`                                      | Data modyfikacji                               |

### 1.4 `generation_error_logs`

Logi błędów procesu generowania AI, oddzielone od głównej logiki biznesowej.

| Kolumna         | Typ Danych     | Ograniczenia                               | Opis                            |
| :-------------- | :------------- | :----------------------------------------- | :------------------------------ |
| `id`            | `UUID`         | `PRIMARY KEY`, `DEFAULT gen_random_uuid()` | Unikalny identyfikator błędu    |
| `user_id`       | `UUID`         | `NOT NULL`, `REFERENCES auth.users(id)`    | Użytkownik                      |
| `model`         | `VARCHAR`      | `NOT NULL`                                 | Model, który zwrócił błąd       |
| `error_code`    | `VARCHAR(100)` | `NOT NULL`                                 | Kod błędu (np. z API providera) |
| `error_message` | `TEXT`         | `NOT NULL`                                 | Pełna treść błędu               |
| `created_at`    | `TIMESTAMPTZ`  | `NOT NULL`, `DEFAULT now()`                | Czas wystąpienia                |

## 2. Relacje i Kardynalność

1.  **Users -> Decks (1:N)**
    - Użytkownik posiada wiele talii.
2.  **Users -> Generations (1:N)**
    - Użytkownik zleca wiele generowań.
3.  **Decks -> Flashcards (1:N)**
    - Talia zawiera wiele fiszek.
    - `ON DELETE CASCADE`: Usunięcie talii usuwa fiszki.
4.  **Generations -> Flashcards (1:N)**
    - Jedna sesja generowania może stworzyć wiele fiszek.
    - `ON DELETE SET NULL`: Usunięcie logu generowania nie usuwa fiszek (one są już własnością użytkownika).

## 3. Indeksy

Zoptymalizowane pod kątem widoków aplikacji (Dashboard, Nauka) oraz analityki.

| Tabela        | Kolumny                     | Cel                                              |
| :------------ | :-------------------------- | :----------------------------------------------- |
| `decks`       | `(user_id)`                 | Pobieranie listy talii użytkownika.              |
| `flashcards`  | `(deck_id)`                 | Pobieranie całej talii.                          |
| `flashcards`  | `(deck_id, next_review_at)` | Pobieranie fiszek "na dziś" w konkretnej talii.  |
| `flashcards`  | `(user_id)`                 | Szybkie statystyki globalne dla użytkownika.     |
| `flashcards`  | `(generation_id)`           | Analiza: które fiszki pochodzą z danej sesji AI. |
| `generations` | `(user_id, created_at)`     | Historia generowań użytkownika (sortowana).      |

## 4. Polityki RLS (Row Level Security)

Każda tabela posiada polityki izolujące dane na poziomie `user_id`.

- **decks**: Dostęp tylko gdy `auth.uid() = user_id`.
- **generations**: Dostęp tylko gdy `auth.uid() = user_id`.
- **generation_error_logs**: Dostęp (zazwyczaj tylko INSERT/SELECT) gdy `auth.uid() = user_id`.
- **flashcards**:
  - Przy wstawianiu/edycji: Sprawdzenie czy `deck_id` należy do użytkownika LUB czy `user_id` w rekordzie zgadza się z `auth.uid()`.
  - Ze względu na dodanie kolumny `user_id` do tabeli `flashcards` (denormalizacja), polityka RLS jest prostsza i szybsza: `auth.uid() = user_id`.

## 5. Uwagi do implementacji

- **Spójność typów**: Zmieniono `BIGSERIAL` na `UUID` we wszystkich tabelach, aby zachować spójność z systemem `auth.users` Supabase oraz umożliwić łatwe generowanie ID po stronie klienta (optymistyczne UI).
- **Trigger updated_at**: Tabela `decks` i `flashcards` wymaga triggera aktualizującego pole `updated_at` przy zmianie.
- **Audyt AI**: Pola w `generations` (`accepted_unedited_count` itp.) mogą być aktualizowane asynchronicznie po zapisaniu fiszek przez użytkownika, co daje cenny wgląd w jakość modelu.
