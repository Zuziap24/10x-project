# Dokumentacja Testów - 10xCards

## Struktura Katalogów

```
10x-project/
├── src/
│   ├── __tests__/              # Testy jednostkowe i integracyjne
│   │   ├── example-validator.test.ts
│   │   └── example-component.test.tsx
│   ├── test-utils/             # Pomocnicze narzędzia testowe
│   │   ├── setup.ts           # Konfiguracja globalna testów
│   │   ├── test-helpers.tsx   # Funkcje pomocnicze (renderWithQueryClient, mocks)
│   │   └── mocks/
│   │       ├── handlers.ts    # MSW request handlers
│   │       └── server.ts      # MSW server setup
├── e2e/                        # Testy E2E (Playwright)
│   ├── auth.spec.ts
│   └── fixtures/              # Dane testowe dla E2E
├── vitest.config.ts           # Konfiguracja Vitest
└── playwright.config.ts       # Konfiguracja Playwright
```

## Dostępne Komendy

### Testy Jednostkowe (Vitest)

```bash
# Uruchomienie testów w trybie watch (rozwój)
npm test

# Jednorazowe uruchomienie wszystkich testów
npm run test:unit

# UI dla testów (wizualna nawigacja)
npm run test:ui

# Generowanie pokrycia kodu (coverage)
npm run test:coverage
```

### Testy E2E (Playwright)

```bash
# Uruchomienie testów E2E
npm run test:e2e

# UI Playwright (interaktywne debugowanie)
npm run test:e2e:ui

# Debug mode (krok po kroku)
npm run test:e2e:debug
```

## Pisanie Testów Jednostkowych

### Przykład testu walidatora (Zod)

```typescript
import { describe, it, expect } from "vitest";
import { MySchema } from "@/lib/validators/my-schema";

describe("MySchema Validator", () => {
  it("should validate correct data", () => {
    const result = MySchema.safeParse({ email: "test@example.com" });
    expect(result.success).toBe(true);
  });
});
```

### Przykład testu komponentu React

```typescript
import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithQueryClient } from "@/test-utils/test-helpers";
import { MyComponent } from "./MyComponent";

describe("MyComponent", () => {
  it("should render correctly", () => {
    renderWithQueryClient(<MyComponent />);
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });
});
```

### Mockowanie Supabase Client

```typescript
import { vi } from "vitest";
import { createMockSupabaseClient } from "@/test-utils/test-helpers";

// W pliku testowym
vi.mock("@/db/supabase.client", () => ({
  supabaseClient: createMockSupabaseClient(),
}));
```

### Mockowanie API z MSW

Dodaj handler w `src/test-utils/mocks/handlers.ts`:

```typescript
http.get(`${BASE_URL}/api/my-endpoint`, () => {
  return HttpResponse.json({ data: "mock data" });
});
```

## Pisanie Testów E2E

### Przykład testu E2E

```typescript
import { test, expect } from "@playwright/test";

test("should navigate to dashboard", async ({ page }) => {
  await page.goto("/");
  await page.click('a[href="/dashboard"]');
  await expect(page).toHaveURL(/.*dashboard/);
});
```

### Page Object Model (zalecane)

```typescript
// e2e/fixtures/login.page.ts
export class LoginPage {
  constructor(private page: Page) {}

  async login(email: string, password: string) {
    await this.page.fill('input[type="email"]', email);
    await this.page.fill('input[type="password"]', password);
    await this.page.click('button[type="submit"]');
  }
}
```

## Konfiguracja Coverage

Progi pokrycia kodu (zgodnie z planem testów):
- Lines: 80%
- Functions: 80%
- Branches: 75%
- Statements: 80%

Coverage jest generowany w katalogu `coverage/` i można go przeglądać w HTML.

## MSW (Mock Service Worker)

MSW interceptuje zapytania HTTP i zwraca zamockowane odpowiedzi. Konfiguracja:

1. Handlery API: `src/test-utils/mocks/handlers.ts`
2. Server setup: `src/test-utils/mocks/server.ts`
3. Automatyczne włączanie: `src/test-utils/setup.ts`

## Best Practices

### Testy Jednostkowe
- Używaj `describe` do grupowania powiązanych testów
- Stosuj pattern Arrange-Act-Assert
- Testuj przypadki brzegowe i obsługę błędów
- Używaj `vi.mock()` dla zależności zewnętrznych

### Testy E2E
- Używaj data-testid dla stabilnych selektorów
- Implementuj Page Object Model dla złożonych flow
- Testuj krytyczne ścieżki użytkownika
- Używaj `page.waitFor*` zamiast arbitrary timeouts

### Ogólne
- Nie testuj implementacji, testuj zachowanie
- Każdy test powinien być niezależny
- Unikaj testów flaky (niestabilnych)
- Używaj inline snapshots dla złożonych obiektów

## Integracja z CI/CD

GitHub Actions uruchamia automatycznie:
- Testy jednostkowe przy każdym PR
- Linting i formatowanie
- (Opcjonalnie) Testy E2E dla krytycznych branch'y

## Troubleshooting

### "Cannot find module" w testach
Sprawdź aliasy w `vitest.config.ts` - muszą być zgodne z `tsconfig.json`.

### MSW nie interceptuje requestów
Upewnij się, że `server.listen()` jest wywołany w `beforeAll` w `setup.ts`.

### Testy E2E timeoutują
Zwiększ timeout w `playwright.config.ts` lub sprawdź czy dev server działa.

## Dodatkowe Zasoby

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Playwright Documentation](https://playwright.dev/)
- [MSW Documentation](https://mswjs.io/)
