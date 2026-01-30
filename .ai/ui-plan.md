# Architektura UI dla 10x-cards

## 1. Przegląd struktury UI

Architektura interfejsu opiera się na modelu hybrydowym, wykorzystującym **Astro** jako szkielet aplikacji (routing, layouty, wstępne renderowanie treści statycznych) oraz **React** do obsługi dynamicznych interakcji i zarządzania stanem.

Projekt wykorzystuje dwa główne układy (Layouts):

1.  **MarketingLayout**: Lekki, statyczny layout dla strony głównej i stron uwierzytelniania, zoptymalizowany pod kątem SEO i szybkości ładowania (First Contentful Paint).
2.  **AppLayout**: Layout aplikacyjny dla zalogowanych użytkowników, zawierający boczny pasek nawigacyjny (Sidebar), obsługę sesji użytkownika i globalny kontekst powiadomień.
3.  **ImmersiveLayout**: Minimalistyczny layout dla trybu nauki, pozbawiony nawigacji, aby maksymalizować skupienie.

Zarządzanie stanem i komunikacja z API opierają się na bibliotece **TanStack Query (React Query)**, co zapewnia buforowanie danych, obsługę stanów ładowania/błędów oraz optymistyczne aktualizacje interfejsu (kluczowe dla trybu nauki).

## 2. Lista widoków

### 2.1. Strona Lądowania (Landing Page)

- **Ścieżka:** `/`
- **Główny cel:** Konwersja odwiedzających w zarejestrowanych użytkowników.
- **Kluczowe informacje:** Value Proposition (AI Flashcards), Call to Action (Zarejestruj się), Główne funkcjonalności.
- **Layout:** `MarketingLayout` (Astro).
- **Kluczowe komponenty:** Hero Section, Feature Grid, CTA Button.
- **UX/Bezpieczeństwo:** Dostępna publicznie. Szybki czas ładowania.

### 2.2. Uwierzytelnianie (Auth Pages)

- **Ścieżki:** `/login`, `/register`
- **Główny cel:** Umożliwienie dostępu do systemu.
- **Kluczowe informacje:** Formularze logowania/rejestracji, komunikaty błędów walidacji.
- **Layout:** `MarketingLayout` (Astro).
- **Kluczowe komponenty:** `LoginForm`, `RegisterForm` (React Hook Form + Zod), Social Auth providers buttons.
- **UX/Bezpieczeństwo:** Walidacja haseł w czasie rzeczywistym, komunikaty o błędach w przypadku nieudanych prób logowania. HTTPS wymuszony.

### 2.3. Pulpit Główny (Dashboard)

- **Ścieżka:** `/dashboard`
- **Główny cel:** Centrum dowodzenia użytkownika – dostęp do wszystkich talii i szybkie tworzenie nowych.
- **Kluczowe informacje:** Lista talii użytkownika, liczba fiszek w każdej talii, liczba fiszek do powtórki (Due).
- **Layout:** `AppLayout` (Astro + React shell).
- **Kluczowe komponenty:**
  - `DeckGrid`: Siatka kart reprezentujących talie.
  - `CreateDeckDialog`: Modal do tworzenia nowej talii.
  - `StatsSummary`: Podsumowanie postępów (opcjonalnie w MVP).
- **Integracja API:** `GET /api/decks`, `POST /api/decks`.
- **UX:** Stan "Pusty" (Empty State) zachęcający do utworzenia pierwszej talii. Skeleton loaders podczas ładowania danych.

### 2.4. Szczegóły Talii (Deck View)

- **Ścieżka:** `/decks/[id]`
- **Główny cel:** Zarządzanie zawartością talii – generowanie AI, ręczna edycja, przeglądanie listy.
- **Kluczowe informacje:** Nazwa talii, lista fiszek z podziałem na strony lub "Load More", źródło fiszki (AI/Manual).
- **Layout:** `AppLayout`.
- **Kluczowe komponenty:**
  - `DeckHeader`: Nazwa, opis, przycisk "Ucz się" (Study).
  - `FlashcardList`: Wirtualizowana lista lub lista z "Load More".
  - `AIGenerationModal`: Kluczowy komponent do interakcji z LLM.
  - `ManualCardForm`: Formularz inline lub modal do ręcznego dodawania/edycji.
- **Integracja API:** `GET /api/decks/[id]`, `GET /api/decks/[id]/flashcards`, `POST .../generate`, `POST .../accept`.
- **UX:** Wyraźne oznaczenie fiszek wygenerowanych przez AI. Łatwa edycja treści fiszki.

### 2.5. Tryb Nauki (Study Mode)

- **Ścieżka:** `/decks/[id]/study`
- **Główny cel:** Efektywna nauka z wykorzystaniem algorytmu Spaced Repetition.
- **Kluczowe informacje:** Treść fiszki (Przód), po odwróceniu Tył, przyciski oceny.
- **Layout:** `ImmersiveLayout` (Brak Sidebaru, tryb pełnego skupienia).
- **Kluczowe komponenty:**
  - `StudyCard`: Interaktywna karta z animacją obrotu.
  - `RatingControls`: Przyciski oceny (0-5) zgodne z rygorem SM-2.
  - `ProgressBar`: Postęp sesji.
- **Integracja API:** `GET .../flashcards/due`, `POST .../review`.
- **UX/Dostępność:** Obsługa skrótów klawiszowych (Spacja = odwróć, 1-5 = ocena). Optymistyczne aktualizacje UI (natychmiastowe przejście do kolejnej karty).

## 3. Mapa podróży użytkownika

### Główny przepływ: "Od pomysłu do nauki z AI"

1.  **Dashboard**: Użytkownik klika "Utwórz nową talię", wpisuje nazwę (np. "Historia Polski") i zatwierdza.
2.  **Deck View**: Użytkownik zostaje przekierowany do nowej, pustej talii. Widzi wyraźny przycisk "Generuj z AI".
3.  **Generowanie (Krok 1 - Input)**:
    - Otwiera się `AIGenerationModal`.
    - Użytkownik wkleja tekst źródłowy (np. artykuł z Wikipedii) i klika "Generuj".
    - System wyświetla stan ładowania (spinner/komunikat o pracy modelu).
4.  **Generowanie (Krok 2 - Weryfikacja)**:
    - Modal wyświetla listę "Proponowanych fiszek" (Staging Area).
    - Użytkownik przegląda propozycje, odznacza te, które mu nie pasują, ewentualnie edytuje treść 'na szybko'.
    - Użytkownik klika "Zapisz wybrane do talii".
5.  **Deck View (Aktualizacja)**:
    - Modal zamyka się.
    - Lista fiszek odświeża się, pokazując nowe karty z etykietą "AI".
6.  **Nauka**:
    - Użytkownik klika "Rozpocznij naukę".
    - Przechodzi do widoku `Study Mode`.
    - Przechodzi przez sekwencję kart, oceniając stopień zapamiętania.
    - Po zakończeniu sesji widzi ekran podsumowania ("Dobra robota!") i wraca do Dashboardu.

## 4. Układ i struktura nawigacji

### Globalna (App Shell)

- **Sidebar (Desktop) / Bottom Nav lub Hamburger (Mobile)**:
  - Logo (powrót do Dashboardu).
  - Pulpit (Lista talii).
  - Profil/Ustawienia.
  - Wyloguj.

### Kontekstowa

- **Wewnątrz talii**: Breadcrumbs (`Pulpit` > `Nazwa Talii`).
- **Tryb Nauki**: Przycisk "Wyjście" (X) w rogu ekranu, prowadzący z powrotem do widoku talii.

### Obsługa błędów i stanów

- **Toasty (Powiadomienia)**: Wyskakujące komunikaty o sukcesie (np. "Talia utworzona") lub błędzie (np. "Błąd połączenia z API").
- **Modale**: Do akcji przerywających (Usuwanie talii - potwierdzenie) lub złożonych (Generowanie AI).

## 5. Kluczowe komponenty

1.  **`AIGenerationModal` (Complex Component)**
    - Zarządza wieloetapowym procesem (Input -> Loading -> Review -> Submit).
    - Obsługuje błędy walidacji tekstu wejściowego.
    - Zawiera edytowalną listę podglądu (Preview List).

2.  **`FlashcardList`**
    - Obsługuje wyświetlanie dużej liczby elementów.
    - Implementuje wzorzec "Load More" (Button) lub Infinite Scroll.
    - Zawiera opcje edycji/usuwania dla pojedynczej fiszki.

3.  **`StudyCard`**
    - Kluczowy element UX trybu nauki.
    - Musi obsługiwać stany: `front`, `back`, `flipping`.
    - Musi być dostępny (fokusowalny, czytelny dla czytników ekranu).

4.  **`CreateDeckDialog`**
    - Prosty formularz z walidacją nazwy talii.
    - Używany w Dashboardzie.

5.  **`Badge` (UI Element)**
    - Wizualny wskaźnik źródła: `AI` (np. kolor fioletowy/indigo), `Manual` (szary/slate), `AI Edited` (niebieski).

6.  **`ErrorBoundary` (Utility)**
    - Globalny i per-widok komponent łapiący błędy Reacta i API, zapobiegający "białemu ekranowi" (White Screen of Death).
