export type Environment = "local" | "integration" | "prod";
export type FeatureKey = "auth" | "collections";

// Konfiguracja flag per środowisko
const FEATURE_FLAGS: Record<Environment, Record<FeatureKey, boolean>> = {
  local: {
    auth: true,
    collections: true,
  },
  integration: {
    auth: true,
    collections: true,
  },
  prod: {
    auth: false,
    collections: false,
  },
};

/**
 * Pobiera nazwę aktualnego środowiska.
 * Obsługuje zarówno server-side jak i client-side (jeśli zmienna jest wystawiona publicznie).
 * Domyślnie zwraca 'local' jeśli zmienna nie jest zdefiniowana.
 */
function getEnvironment(): Environment {
  // Próba odczytu z import.meta.env (Astro/Vite)
  // Szukamy PUBLIC_ENV_NAME (dla klienta) lub ENV_NAME (dla serwera)
  const envName = import.meta.env.PUBLIC_ENV_NAME || import.meta.env.ENV_NAME;

  if (envName === "prod" || envName === "production") return "prod";
  if (envName === "integration") return "integration";

  return "local";
}

/**
 * Sprawdza czy dana funkcjonalność jest włączona w obecnym środowisku.
 * @param key Klucz funkcjonalności (np. 'auth', 'collections')
 * @returns boolean czy funkcja jest dostępna
 */
export function isFeatureEnabled(key: FeatureKey): boolean {
  const env = getEnvironment();
  const isEnabled = FEATURE_FLAGS[env][key];

  // eslint-disable-next-line no-console
  console.log(`[FeatureFlag] Checking flag '${key}' for env '${env}': ${isEnabled ? "ENABLED" : "DISABLED"}`);

  return isEnabled;
}

/**
 * Tworzy standardową odpowiedź API 403 dla wyłączonej funkcjonalności.
 * Używać w endpointach API gdy dana funkcja jest wyłączona przez feature flag.
 * @param featureName Nazwa funkcji do wyświetlenia w komunikacie błędu
 * @returns Response z kodem 403 i standardowym komunikatem
 */
export function featureDisabledResponse(featureName: string): Response {
  return new Response(
    JSON.stringify({
      error: {
        code: "FEATURE_DISABLED",
        message: `${featureName} feature is currently disabled`,
      },
    }),
    { status: 403, headers: { "Content-Type": "application/json" } }
  );
}
