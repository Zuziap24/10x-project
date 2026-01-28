# Dokument wymagań produktu (PRD) - 10x-cards

## 1. Przegląd produktu
Projekt 10x-cards ma na celu umożliwienie użytkownikom szybkiego tworzenia i zarządzania zestawami fiszek edukacyjnych. Aplikacja wykorzystuje modele LLM (poprzez API) do generowania sugestii fiszek na podstawie dostarczonego tekstu.

## 2. Problem użytkownika
Manualne tworzenie wysokiej jakości fiszek wymaga dużych nakładów czasu i wysiłku, co zniechęca do korzystania z efektywnej metody nauki, jaką jest spaced repetition. Celem rozwiązania jest skrócenie czasu potrzebnego na tworzenie odpowiednich pytań i odpowiedzi oraz uproszczenie procesu zarządzania materiałem do nauki.

## 3. Wymagania funkcjonalne
1. Organizacja materiału:
   - System grupowania fiszek w Talie (Decks) tematyczne.
   - Możliwość tworzenia, edycji i usuwania talii.

2. Automatyczne generowanie fiszek:
   - Użytkownik wkleja dowolny tekst (np. fragment podręcznika).
   - Aplikacja wysyła tekst do modelu LLM za pośrednictwem API.
   - Model LLM proponuje zestaw fiszek (pytania i odpowiedzi).
   - Fiszki są przedstawiane użytkownikowi w formie listy z możliwością akceptacji, edycji lub odrzucenia.

3. Ręczne tworzenie i zarządzanie fiszkami:
   - Formularz do ręcznego tworzenia fiszek wewnątrz wybranej talii.
   - Opcje edycji i usuwania istniejących fiszek.

4. Podstawowy system uwierzytelniania i kont użytkowników:
   - Rejestracja i logowanie.
   - Bezpieczna separacja danych między użytkownikami.

5. Integracja z algorytmem powtórek:
   - Tryb nauki uruchamiany dla konkretnej talii.
   - Interfejs oceny trudności fiszki (np. Łatwe/Trudne), który wpływa na harmonogram powtórek.

6. Wymagania prawne i ograniczenia:
   - Dane osobowe użytkowników i fiszek przechowywane bezpiecznie.
   - Prawo do wglądu i usunięcia danych na wniosek użytkownika.

## 4. Granice produktu
1. Poza zakresem MVP:
   - Zaawansowany, autorski algorytm (korzystamy z bibliotek open-source).
   - Aplikacje mobilne (tylko wersja web RWD).
   - Import plików (PDF, DOCX) - tylko tekst kopiuj-wklej.
   - Współdzielenie talii między użytkownikami.
   - Zagnieżdżanie talii (podkategorie).

## 5. Historyjki użytkowników

ID: US-001
Tytuł: Rejestracja konta
Opis: Jako nowy użytkownik chcę się zarejestrować, aby mieć dostęp do własnych fiszek i móc korzystać z generowania przez AI.
Kryteria akceptacji:
- Formularz zawiera pola: e-mail, hasło.
- System weryfikuje poprawność danych (format email).
- Po sukcesie użytkownik jest zalogowany i przekierowany do widoku głównego.

ID: US-002
Tytuł: Logowanie do aplikacji
Opis: Jako zarejestrowany użytkownik chcę się zalogować, aby uzyskać dostęp do moich zapisanych talii.
Kryteria akceptacji:
- Logowanie wymaga podania e-maila i hasła.
- Błędne dane wyświetlają komunikaty błędów.
- Sesja użytkownika jest bezpiecznie utrzymywana.

ID: US-003
Tytuł: Zarządzanie Taliami (Decks)
Opis: Jako użytkownik chcę tworzyć tematyczne talie, aby uporządkować moją wiedzę.
Kryteria akceptacji:
- Widok główny (Dashboard) wyświetla listę talii użytkownika.
- Przycisk "Nowa talia" pozwala na utworzenie nowego zbioru przez podanie nazwy.
- Możliwość usunięcia talii (usuwa wszystkie fiszki wewnątrz).

ID: US-004
Tytuł: Generowanie fiszek przy użyciu AI
Opis: Jako zalogowany użytkownik chcę wkleić tekst do wybranej talii i wygenerować propozycje fiszek.
Kryteria akceptacji:
- W widoku talii dostępna opcja "Generuj z AI".
- Pole tekstowe przyjmuje 1000 - 10 000 znaków.
- Po kliknięciu "Generuj", system łączy się z API LLM.
- Wyświetlany jest status ładowania podczas przetwarzania.

ID: US-005
Tytuł: Weryfikacja i zapis fiszek AI
Opis: Jako użytkownik chcę przejrzeć propozycje AI przed ich dodaniem do talii.
Kryteria akceptacji:
- Lista wygenerowanych fiszek (Pytanie/Odpowiedź) jest edytowalna.
- Użytkownik może odrzucić (usunąć) nietrafione propozycje.
- Przycisk "Zapisz do talii" dodaje tylko zaakceptowane fiszki do bazy danych.

ID: US-006
Tytuł: Ręczne tworzenie i edycja fiszek
Opis: Jako użytkownik chcę ręcznie dodać lub poprawić fiszkę w talii.
Kryteria akceptacji:
- Przycisk "Dodaj fiszkę" otwiera pusty formularz (Przód/Tył).
- Kliknięcie w istniejącą fiszkę pozwala na edycję jej treści.
- Zmiany są zapisywane w bazie danych.

ID: US-007
Tytuł: Sesja nauki z oceną trudności
Opis: Jako użytkownik chcę uruchomić tryb nauki dla talii i oceniać swoją wiedzę.
Kryteria akceptacji:
- Użytkownik widzi przód fiszki (pytanie).
- Kliknięcie "Odwróć" pokazuje odpowiedź i przyciski oceny (np. "Nie wiem", "Wiem").
- Wybór oceny aktualizuje datę kolejnej powtórki wg algorytmu.
- System przechodzi do kolejnej karty.

ID: US-008
Tytuł: Bezpieczeństwo danych
Opis: Jako użytkownik chcę, aby moje talie były prywatne.
Kryteria akceptacji:
- API blokuje dostęp do fiszek nieprzypisanych do aktualnie zalogowanego użytkownika (ID użytkownika w zapytaniu musi zgadzać się z sesją).

## 6. Metryki sukcesu
1. Efektywność AI:
   - Powyżej 75% fiszek proponowanych przez AI jest akceptowanych (zapisywanych) przez użytkownika.
2. Adopcja AI:
   - Użytkownicy tworzą 75% swoich zasobów przy pomocy generatora, a nie ręcznie.
3. Retencja:
   - Monitorowanie liczby ukończonych sesji nauki w stosunku do rozpoczętych.
```````// filepath: .ai/prd.md
# Dokument wymagań produktu (PRD) - 10x-cards

## 1. Przegląd produktu
Projekt 10x-cards ma na celu umożliwienie użytkownikom szybkiego tworzenia i zarządzania zestawami fiszek edukacyjnych. Aplikacja wykorzystuje modele LLM (poprzez API) do generowania sugestii fiszek na podstawie dostarczonego tekstu.

## 2. Problem użytkownika
Manualne tworzenie wysokiej jakości fiszek wymaga dużych nakładów czasu i wysiłku, co zniechęca do korzystania z efektywnej metody nauki, jaką jest spaced repetition. Celem rozwiązania jest skrócenie czasu potrzebnego na tworzenie odpowiednich pytań i odpowiedzi oraz uproszczenie procesu zarządzania materiałem do nauki.

## 3. Wymagania funkcjonalne
1. Organizacja materiału:
   - System grupowania fiszek w Talie (Decks) tematyczne.
   - Możliwość tworzenia, edycji i usuwania talii.

2. Automatyczne generowanie fiszek:
   - Użytkownik wkleja dowolny tekst (np. fragment podręcznika).
   - Aplikacja wysyła tekst do modelu LLM za pośrednictwem API.
   - Model LLM proponuje zestaw fiszek (pytania i odpowiedzi).
   - Fiszki są przedstawiane użytkownikowi w formie listy z możliwością akceptacji, edycji lub odrzucenia.

3. Ręczne tworzenie i zarządzanie fiszkami:
   - Formularz do ręcznego tworzenia fiszek wewnątrz wybranej talii.
   - Opcje edycji i usuwania istniejących fiszek.

4. Podstawowy system uwierzytelniania i kont użytkowników:
   - Rejestracja i logowanie.
   - Bezpieczna separacja danych między użytkownikami.

5. Integracja z algorytmem powtórek:
   - Tryb nauki uruchamiany dla konkretnej talii.
   - Interfejs oceny trudności fiszki (np. Łatwe/Trudne), który wpływa na harmonogram powtórek.

6. Wymagania prawne i ograniczenia:
   - Dane osobowe użytkowników i fiszek przechowywane bezpiecznie.
   - Prawo do wglądu i usunięcia danych na wniosek użytkownika.

## 4. Granice produktu
1. Poza zakresem MVP:
   - Zaawansowany, autorski algorytm (korzystamy z bibliotek open-source).
   - Aplikacje mobilne (tylko wersja web RWD).
   - Import plików (PDF, DOCX) - tylko tekst kopiuj-wklej.
   - Współdzielenie talii między użytkownikami.
   - Zagnieżdżanie talii (podkategorie).

## 5. Historyjki użytkowników

ID: US-001
Tytuł: Rejestracja konta
Opis: Jako nowy użytkownik chcę się zarejestrować, aby mieć dostęp do własnych fiszek i móc korzystać z generowania przez AI.
Kryteria akceptacji:
- Formularz zawiera pola: e-mail, hasło.
- System weryfikuje poprawność danych (format email).
- Po sukcesie użytkownik jest zalogowany i przekierowany do widoku głównego.

ID: US-002
Tytuł: Logowanie do aplikacji
Opis: Jako zarejestrowany użytkownik chcę się zalogować, aby uzyskać dostęp do moich zapisanych talii.
Kryteria akceptacji:
- Logowanie wymaga podania e-maila i hasła.
- Błędne dane wyświetlają komunikaty błędów.
- Sesja użytkownika jest bezpiecznie utrzymywana.

ID: US-003
Tytuł: Zarządzanie Taliami (Decks)
Opis: Jako użytkownik chcę tworzyć tematyczne talie, aby uporządkować moją wiedzę.
Kryteria akceptacji:
- Widok główny (Dashboard) wyświetla listę talii użytkownika.
- Przycisk "Nowa talia" pozwala na utworzenie nowego zbioru przez podanie nazwy.
- Możliwość usunięcia talii (usuwa wszystkie fiszki wewnątrz).

ID: US-004
Tytuł: Generowanie fiszek przy użyciu AI
Opis: Jako zalogowany użytkownik chcę wkleić tekst do wybranej talii i wygenerować propozycje fiszek.
Kryteria akceptacji:
- W widoku talii dostępna opcja "Generuj z AI".
- Pole tekstowe przyjmuje 1000 - 10 000 znaków.
- Po kliknięciu "Generuj", system łączy się z API LLM.
- Wyświetlany jest status ładowania podczas przetwarzania.

ID: US-005
Tytuł: Weryfikacja i zapis fiszek AI
Opis: Jako użytkownik chcę przejrzeć propozycje AI przed ich dodaniem do talii.
Kryteria akceptacji:
- Lista wygenerowanych fiszek (Pytanie/Odpowiedź) jest edytowalna.
- Użytkownik może odrzucić (usunąć) nietrafione propozycje.
- Przycisk "Zapisz do talii" dodaje tylko zaakceptowane fiszki do bazy danych.

ID: US-006
Tytuł: Ręczne tworzenie i edycja fiszek
Opis: Jako użytkownik chcę ręcznie dodać lub poprawić fiszkę w talii.
Kryteria akceptacji:
- Przycisk "Dodaj fiszkę" otwiera pusty formularz (Przód/Tył).
- Kliknięcie w istniejącą fiszkę pozwala na edycję jej treści.
- Zmiany są zapisywane w bazie danych.

ID: US-007
Tytuł: Sesja nauki z oceną trudności
Opis: Jako użytkownik chcę uruchomić tryb nauki dla talii i oceniać swoją wiedzę.
Kryteria akceptacji:
- Użytkownik widzi przód fiszki (pytanie).
- Kliknięcie "Odwróć" pokazuje odpowiedź i przyciski oceny (np. "Nie wiem", "Wiem").
- Wybór oceny aktualizuje datę kolejnej powtórki wg algorytmu.
- System przechodzi do kolejnej karty.

ID: US-008
Tytuł: Bezpieczeństwo danych
Opis: Jako użytkownik chcę, aby moje talie były prywatne.
Kryteria akceptacji:
- API blokuje dostęp do fiszek nieprzypisanych do aktualnie zalogowanego użytkownika (ID użytkownika w zapytaniu musi zgadzać się z sesją).

## 6. Metryki sukcesu
1. Efektywność AI:
   - Powyżej 75% fiszek proponowanych przez AI jest akceptowanych (zapisywanych) przez użytkownika.
2. Adopcja AI:
   - Użytkownicy tworzą 75% swoich zasobów przy pomocy generatora, a nie ręcznie.
3. Retencja:
   - Monitorowanie liczby ukończonych sesji nauki w stosunku do rozpoczętych.