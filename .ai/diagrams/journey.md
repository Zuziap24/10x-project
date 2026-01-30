# Diagram Podróży Użytkownika - Moduł Logowania i Rejestracji

Ten diagram przedstawia pełną podróż użytkownika w aplikacji 10x-cards, obejmującą:
- Pracę bez logowania (dane lokalne)
- Proces rejestracji
- Proces logowania
- Odzyskiwanie hasła
- Zarządzanie taliami i fiszkami dla zalogowanych użytkowników

```mermaid
stateDiagram-v2
    [*] --> StronaGlowna
    
    StronaGlowna --> PracaBezLogowania: Kontynuuj bez konta
    StronaGlowna --> WyborAutentykacji: Przycisk Zaloguj/Zarejestruj
    
    state "Praca bez logowania" as PracaBezLogowania {
        [*] --> TworzeneTaliiLokalnie
        TworzeneTaliiLokalnie --> EdycjaFiszek
        EdycjaFiszek --> TworzeneTaliiLokalnie
        TworzeneTaliiLokalnie --> DecyzjaLogowanie
        
        note right of TworzeneTaliiLokalnie
            Użytkownik może tworzyć talie
            i fiszki bez konta.
            Dane przechowywane lokalnie.
        end note
    }
    
    state if_chce_zalogowac <<choice>>
    DecyzjaLogowanie --> if_chce_zalogowac
    if_chce_zalogowac --> WyborAutentykacji: Chcę zapisać dane
    if_chce_zalogowac --> TworzeneTaliiLokalnie: Kontynuuj lokalnie
    
    state "Wybór typu autentykacji" as WyborAutentykacji {
        [*] --> MenuAutentykacji
        MenuAutentykacji --> ProcesLogowania: Mam konto
        MenuAutentykacji --> ProcesRejestracji: Nowe konto
    }
    
    state "Proces Logowania" as ProcesLogowania {
        [*] --> FormularzLogowania
        FormularzLogowania --> WalidacjaLogowania
        
        note right of FormularzLogowania
            Formularz zawiera:
            - Email
            - Hasło
            - Link do odzyskiwania hasła
        end note
        
        state if_logowanie <<choice>>
        WalidacjaLogowania --> if_logowanie
        if_logowanie --> Dashboard: Dane poprawne
        if_logowanie --> BladLogowania: Błędne dane
        
        BladLogowania --> FormularzLogowania: Spróbuj ponownie
    }
    
    ProcesLogowania --> OdzyskiwanieHasla: Zapomniałem hasła
    
    state "Proces Rejestracji" as ProcesRejestracji {
        [*] --> FormularzRejestracji
        FormularzRejestracji --> WalidacjaRejestracji
        
        note right of FormularzRejestracji
            Formularz zawiera:
            - Email
            - Hasło
            - Potwierdzenie hasła
        end note
        
        state if_rejestracja <<choice>>
        WalidacjaRejestracji --> if_rejestracja
        if_rejestracja --> TworzenieKonta: Dane poprawne
        if_rejestracja --> BladRejestracji: Błąd walidacji
        
        BladRejestracji --> FormularzRejestracji: Popraw dane
        
        TworzenieKonta --> AutoLogowanie
        AutoLogowanie --> Dashboard
    }
    
    state "Odzyskiwanie Hasła" as OdzyskiwanieHasla {
        [*] --> FormularzResetHasla
        FormularzResetHasla --> WyslanieEmaila
        
        note right of FormularzResetHasla
            Użytkownik podaje adres email
            aby otrzymać link resetujący
        end note
        
        WyslanieEmaila --> KomunikatWyslano
        KomunikatWyslano --> KlikniecieLinkuEmail
        
        KlikniecieLinkuEmail --> WeryfikacjaTokena
        
        state if_token <<choice>>
        WeryfikacjaTokena --> if_token
        if_token --> FormularzNowegoHasla: Token poprawny
        if_token --> BladTokenu: Token niepoprawny lub wygasł
        
        FormularzNowegoHasla --> ZapisNowegoHasla
        ZapisNowegoHasla --> KomunikatSukcesu
        KomunikatSukcesu --> ProcesLogowania
        
        BladTokenu --> FormularzResetHasla: Wyślij ponownie
    }
    
    state "Dashboard Zalogowanego" as Dashboard {
        [*] --> ListaTalii
        ListaTalii --> TworzenieNowejTalii: Nowa talia
        ListaTalii --> EdycjaTalii: Wybór talii
        ListaTalii --> UsuwanieTalii: Usuń talię
        
        TworzenieNowejTalii --> ListaTalii
        EdycjaTalii --> ZarzadzanieFiszkami
        UsuwanieTalii --> ListaTalii
        
        note right of ListaTalii
            Zalogowany użytkownik ma dostęp do:
            - Synchronizacji danych
            - Przywracania wersji
            - Generowania fiszek AI
        end note
        
        state "Zarządzanie Fiszkami" as ZarzadzanieFiszkami {
            [*] --> WidokFiszek
            WidokFiszek --> DodawanieFiszki: Dodaj fiszkę
            WidokFiszek --> EdycjaFiszki: Edytuj fiszkę
            WidokFiszek --> UsuwanieFiszki: Usuń fiszkę
            WidokFiszek --> GenerowanieAI: Generuj z AI
            
            DodawanieFiszki --> WidokFiszek
            EdycjaFiszki --> WidokFiszek
            UsuwanieFiszki --> WidokFiszek
            GenerowanieAI --> AkceptacjaFiszekAI
            AkceptacjaFiszekAI --> WidokFiszek
        }
        
        ZarzadzanieFiszkami --> ListaTalii: Powrót do listy
    }
    
    Dashboard --> Wylogowanie: Wyloguj się
    Wylogowanie --> StronaGlowna
    
    PracaBezLogowania --> [*]: Zamknij aplikację
    Dashboard --> [*]: Zamknij aplikację
```

## Opis głównych ścieżek

### 1. Praca bez logowania (US-003)
- Użytkownik może natychmiast rozpocząć pracę bez tworzenia konta
- Talie i fiszki przechowywane lokalnie w przeglądarce
- Brak dostępu do funkcji synchronizacji i przywracania wersji
- Możliwość późniejszego zalogowania/rejestracji

### 2. Rejestracja (US-001)
- Dedykowana strona z formularzem rejestracji
- Wymagane pola: email, hasło, potwierdzenie hasła
- Walidacja formatu email i zgodności haseł
- Po sukcesie: automatyczne logowanie i przekierowanie do Dashboard

### 3. Logowanie (US-002)
- Dedykowana strona logowania
- Wymagane: email i hasło
- Link do odzyskiwania hasła
- Obsługa błędów walidacji z możliwością ponownej próby
- Po sukcesie: przekierowanie do Dashboard

### 4. Odzyskiwanie hasła (US-003)
- Formularz z polem email
- Wysyłka emaila z tokenem resetującym
- Weryfikacja tokenu (ważność czasowa)
- Formularz nowego hasła
- Po sukcesie: przekierowanie do logowania

### 5. Dashboard zalogowanego użytkownika (US-003, US-004, US-005, US-006)
- Lista wszystkich talii użytkownika
- Tworzenie, edycja, usuwanie talii
- Zarządzanie fiszkami (CRUD)
- Generowanie fiszek przy użyciu AI
- Przywracanie poprzednich wersji
- Możliwość wylogowania

## Punkty decyzyjne

1. **Zalogowany vs Niezalogowany** - różne możliwości funkcjonalne
2. **Logowanie vs Rejestracja** - wybór typu autentykacji
3. **Walidacja danych** - poprawne/niepoprawne dane formularza
4. **Token resetujący** - ważny/nieważny/wygasły
5. **Kontynuacja lokalnie** - użytkownik decyduje czy chce się zalogować

## Zabezpieczenia (US-008)

- API weryfikuje zgodność ID użytkownika z sesją
- Dane talii i fiszek są prywatne dla każdego użytkownika
- Tokeny resetowania hasła mają ograniczoną ważność czasową
- Sesje użytkownika są bezpiecznie zarządzane
