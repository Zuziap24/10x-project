/**
 * OpenRouter Service
 *
 * Warstwa integracyjna do komunikacji z API OpenRouter.
 * Obsługuje wysyłanie zapytań konwersacyjnych, walidację odpowiedzi
 * i strukturalne response_format (JSON Schema).
 */

import type { ValidateFunction } from "ajv";
import Ajv from "ajv";

import type { Logger } from "../logger";

// ==================== Interfaces & Types ====================

/**
 * Wiadomość w konwersacji
 */
export interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * Specyfikacja formatu odpowiedzi (JSON Schema)
 */
export interface ResponseFormatSpec {
  type: "json_schema";
  json_schema: {
    name: string;
    strict: boolean;
    schema: JSONSchema;
  };
}

/**
 * JSON Schema (uproszczona reprezentacja)
 */
export interface JSONSchema {
  type: string;
  properties?: Record<string, unknown>;
  required?: string[];
  items?: JSONSchema;
  [key: string]: unknown;
}

/**
 * Parametry modelu
 */
export interface ModelParams {
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  stop?: string[];
  presence_penalty?: number;
  frequency_penalty?: number;
  [key: string]: unknown;
}

/**
 * Metryki użycia
 */
export interface UsageMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalTokens?: number;
}

/**
 * Błąd serwisu
 */
export interface ServiceError {
  code: string;
  message: string;
  details?: unknown;
}

/**
 * Odpowiedź serwisu
 */
export interface ServiceResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ServiceError;
}

/**
 * Metadata ostatniej odpowiedzi
 */
export interface ResponseMetadata {
  status?: number;
  headers?: Record<string, string>;
  latencyMs?: number;
  requestId?: string;
}

/**
 * Konfiguracja retry
 */
export interface RetryConfig {
  attempts: number;
  factor: number;
  minTimeoutMs: number;
}

/**
 * Opcje konstruktora
 */
export interface OpenRouterServiceOptions {
  apiKeyProvider: (() => Promise<string>) | (() => string);
  baseUrl?: string;
  defaultModel?: string;
  defaultParams?: ModelParams;
  timeoutMs?: number;
  retry?: RetryConfig;
  logger?: Logger;
  telemetry?: unknown; // TelemetryClient - opcjonalnie
}

/**
 * Parametry wywołania sendMessage
 */
export interface SendMessageParams {
  conversation?: Message[];
  systemMessage?: string;
  userMessage?: string;
  model?: string;
  modelParams?: ModelParams;
  responseFormat?: ResponseFormatSpec;
  stream?: boolean;
}

/**
 * Health check result
 */
export interface HealthCheckResult {
  ok: boolean;
  latencyMs?: number;
  message?: string;
}

// ==================== OpenRouter API Types ====================

interface OpenRouterRequestPayload {
  model: string;
  messages: Message[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  stop?: string[];
  presence_penalty?: number;
  frequency_penalty?: number;
  response_format?: ResponseFormatSpec;
  stream?: boolean;
  [key: string]: unknown;
}

interface OpenRouterResponse {
  id: string;
  choices: {
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  model: string;
}

/**
 * Rozszerzony Error z dodatkowymi polami dla błędów API
 */
class OpenRouterAPIError extends Error {
  constructor(
    message: string,
    public status?: number,
    public errorBody?: unknown
  ) {
    super(message);
    this.name = "OpenRouterAPIError";
  }
}

// ==================== OpenRouter Service ====================

export class OpenRouterService {
  private readonly _apiKeyProvider: (() => Promise<string>) | (() => string);
  private readonly _baseUrl: string;
  private _defaultModel: string;
  private readonly _defaultParams: ModelParams;
  private readonly _timeoutMs: number;
  private readonly _retryConfig: RetryConfig;
  private readonly _logger?: Logger;
  private readonly _telemetry?: unknown;

  // Cache dla klucza API
  private _apiKeyCache: { key?: string; expiresAt?: number } = {};

  // Metadata ostatniej odpowiedzi
  private _lastResponseMetadata: ResponseMetadata = {};

  // Liczniki użycia
  private _usageMetrics: UsageMetrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    totalTokens: 0,
  };

  // Instancja Ajv dla walidacji JSON Schema
  private readonly _ajv: Ajv;

  // Cache dla skompilowanych schematów
  private _schemaValidators = new Map<string, ValidateFunction>();

  constructor(options: OpenRouterServiceOptions) {
    // Walidacja obecności apiKeyProvider
    if (!options.apiKeyProvider) {
      throw new Error("apiKeyProvider is required");
    }

    this._apiKeyProvider = options.apiKeyProvider;
    this._baseUrl = options.baseUrl || "https://openrouter.ai/api/v1";
    this._defaultModel = options.defaultModel || "openai/gpt-5-mini";
    this._defaultParams = options.defaultParams || {};
    this._timeoutMs = options.timeoutMs || 30000; // 30s default
    this._retryConfig = options.retry || {
      attempts: 3,
      factor: 2,
      minTimeoutMs: 1000,
    };
    this._logger = options.logger;
    this._telemetry = options.telemetry;

    // Inicjalizuj Ajv
    this._ajv = new Ajv({
      strict: true,
      allErrors: true,
      verbose: true,
    });

    this._logger?.warn("OpenRouterService initialized", {
      baseUrl: this._baseUrl,
      defaultModel: this._defaultModel,
    });
  }

  // ==================== Public Methods ====================

  /**
   * Główna metoda do wysyłania zapytań konwersacyjnych
   */
  async sendMessage(params: SendMessageParams): Promise<ServiceResponse> {
    try {
      this._usageMetrics.totalRequests++;

      // Walidacja podstawowa
      if (!params.userMessage && (!params.conversation || params.conversation.length === 0)) {
        return {
          success: false,
          error: {
            code: "bad_request",
            message: "Either userMessage or conversation must be provided",
          },
        };
      }

      // Budowanie payload
      const payload = this._buildPayload(params);

      // Wywołanie API
      const response = await this._request(payload);

      // Formatowanie odpowiedzi
      const formattedResponse = this._formatResponseForClient(response, params.responseFormat);

      // Walidacja response_format jeśli podany
      if (params.responseFormat) {
        this._validateResponseFormat(formattedResponse, params.responseFormat);
      }

      this._usageMetrics.successfulRequests++;

      // Aktualizacja tokenów
      if (response.usage) {
        this._usageMetrics.totalTokens = (this._usageMetrics.totalTokens || 0) + response.usage.total_tokens;
      }

      return {
        success: true,
        data: formattedResponse,
      };
    } catch (error) {
      this._usageMetrics.failedRequests++;
      return {
        success: false,
        error: this._handleOpenRouterError(error),
      };
    }
  }

  /**
   * Niskopoziomowe wywołanie API (bez walidacji schema)
   */
  async sendRaw(requestBody: OpenRouterRequestPayload): Promise<OpenRouterResponse> {
    return await this._request(requestBody);
  }

  /**
   * Zmiana modelu domyślnego
   */
  setDefaultModel(model: string): void {
    this._defaultModel = model;
    this._logger?.warn("Default model changed", { model });
  }

  /**
   * Health check - sprawdzenie dostępności API
   */
  async healthCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    try {
      // Minimalne wywołanie do sprawdzenia dostępności
      const payload: OpenRouterRequestPayload = {
        model: this._defaultModel,
        messages: [{ role: "user", content: "ping" }],
        max_tokens: 5,
      };

      await this._request(payload);

      const latencyMs = Date.now() - startTime;

      return {
        ok: true,
        latencyMs,
        message: "OpenRouter API is accessible",
      };
    } catch (error) {
      return {
        ok: false,
        latencyMs: Date.now() - startTime,
        message: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Pobranie metryk użycia
   */
  async getUsage(): Promise<UsageMetrics> {
    return { ...this._usageMetrics };
  }

  /**
   * Getter dla baseUrl
   */
  get baseUrl(): string {
    return this._baseUrl;
  }

  /**
   * Getter dla defaultModel
   */
  get defaultModel(): string {
    return this._defaultModel;
  }

  /**
   * Getter dla lastResponseMetadata
   */
  get lastResponseMetadata(): ResponseMetadata {
    return { ...this._lastResponseMetadata };
  }

  // ==================== Private Methods ====================

  /**
   * Pobranie klucza API (z cache lub provider)
   */
  private async _resolveApiKey(): Promise<string> {
    const now = Date.now();

    // Sprawdź cache (TTL: 5 minut)
    if (this._apiKeyCache.key && this._apiKeyCache.expiresAt && this._apiKeyCache.expiresAt > now) {
      return this._apiKeyCache.key;
    }

    // Pobierz nowy klucz
    const key = await this._apiKeyProvider();

    if (!key) {
      throw new Error("API key provider returned empty key");
    }

    // Zapisz w cache
    this._apiKeyCache = {
      key,
      expiresAt: now + 5 * 60 * 1000, // 5 minut
    };

    return key;
  }

  /**
   * Budowanie payload dla OpenRouter API
   */
  private _buildPayload(params: SendMessageParams): OpenRouterRequestPayload {
    // Budowanie messages array
    const messages: Message[] = [];

    // System message (opcjonalnie)
    if (params.systemMessage) {
      messages.push({
        role: "system",
        content: params.systemMessage,
      });
    }

    // Conversation history (opcjonalnie)
    if (params.conversation && params.conversation.length > 0) {
      messages.push(...params.conversation);
    }

    // User message (aktywna wiadomość)
    if (params.userMessage) {
      messages.push({
        role: "user",
        content: params.userMessage,
      });
    }

    // Model
    const model = params.model || this._defaultModel;

    // Parametry modelu (merge default + per-request)
    const modelParams = {
      ...this._defaultParams,
      ...params.modelParams,
    };

    // Payload
    const payload: OpenRouterRequestPayload = {
      model,
      messages,
      ...modelParams,
    };

    // Response format (opcjonalnie)
    if (params.responseFormat) {
      payload.response_format = params.responseFormat;
    }

    // Stream (opcjonalnie)
    if (params.stream !== undefined) {
      payload.stream = params.stream;
    }

    return payload;
  }

  /**
   * Walidacja odpowiedzi względem JSON Schema
   */
  private _validateResponseFormat(response: unknown, responseFormatSpec: ResponseFormatSpec): void {
    const schemaName = responseFormatSpec.json_schema.name;
    const schema = responseFormatSpec.json_schema.schema;

    // Pobierz validator z cache lub skompiluj nowy
    let validator = this._schemaValidators.get(schemaName);
    if (!validator) {
      try {
        validator = this._ajv.compile(schema);
        this._schemaValidators.set(schemaName, validator);
      } catch (error) {
        throw new Error(`Invalid JSON schema: ${schemaName}`, { cause: error });
      }
    }

    // Waliduj odpowiedź
    const isValid = validator(response);

    if (!isValid) {
      const errors = validator.errors || [];
      const errorDetails = errors.map((err) => ({
        path: err.instancePath || "/",
        message: err.message,
        params: err.params,
      }));

      this._logger?.error(new Error("Response validation failed"), {
        schemaName,
        errors: errorDetails,
        response: JSON.stringify(response).substring(0, 500), // pierwsze 500 znaków
      });

      throw new Error(`Model response does not match schema: ${schemaName}. Errors: ${JSON.stringify(errorDetails)}`);
    }

    this._logger?.warn("Response validated successfully", { schemaName });
  }

  /**
   * Wywołanie HTTP z retry/backoff
   */
  private async _request(payload: OpenRouterRequestPayload): Promise<OpenRouterResponse> {
    const apiKey = await this._resolveApiKey();
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= this._retryConfig.attempts; attempt++) {
      try {
        const startTime = Date.now();

        // Użyj AbortSignal.timeout dla timeout
        const response = await fetch(`${this._baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
            "HTTP-Referer": "https://10xcards.app",
            "X-Title": "10xCards",
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(this._timeoutMs),
        });

        const latencyMs = Date.now() - startTime;

        // Zapisz metadata
        this._lastResponseMetadata = {
          status: response.status,
          headers: Object.fromEntries(response.headers.entries()),
          latencyMs,
          requestId: response.headers.get("x-request-id") || undefined,
        };

        // Obsługa błędów HTTP
        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({}));

          // Sprawdź czy błąd jest retry-able
          const shouldRetry = this._shouldRetry({ status: response.status, errorBody }, attempt);

          // Rate limit z Retry-After header
          if (response.status === 429) {
            const retryAfter = response.headers.get("Retry-After");
            if (retryAfter && shouldRetry) {
              const retryAfterMs = parseInt(retryAfter, 10) * 1000;
              this._logger?.warn("Rate limited, retrying after delay", {
                retryAfterMs,
                attempt,
              });
              await this._sleep(retryAfterMs);
              continue;
            }
          }

          // 5xx errors - retry z backoff
          if (response.status >= 500 && shouldRetry) {
            const backoffMs = this._calculateBackoff(attempt);
            this._logger?.warn("Server error, retrying with backoff", {
              status: response.status,
              backoffMs,
              attempt,
            });
            await this._sleep(backoffMs);
            continue;
          }

          // Błędy 4xx (poza 429) - nie retry
          throw new OpenRouterAPIError(
            `OpenRouter API error: ${response.status} ${response.statusText}`,
            response.status,
            errorBody
          );
        }

        // Sukces - zwróć odpowiedź
        return (await response.json()) as OpenRouterResponse;
      } catch (error) {
        lastError = error as Error;

        // Błąd timeoutu lub sieci
        const isNetworkError =
          error instanceof TypeError ||
          (error as Error).name === "AbortError" ||
          (error as Error).name === "TimeoutError";

        if (isNetworkError && attempt < this._retryConfig.attempts) {
          const backoffMs = this._calculateBackoff(attempt);
          this._logger?.warn("Network error, retrying with backoff", {
            error: (error as Error).message,
            backoffMs,
            attempt,
          });
          await this._sleep(backoffMs);
          continue;
        }

        // Jeśli błąd nie jest retry-able lub wyczerpano próby - rzuć
        if (attempt === this._retryConfig.attempts) {
          break;
        }
      }
    }

    // Wyczerpano wszystkie próby
    throw lastError || new Error("Request failed after all retry attempts");
  }

  /**
   * Obliczanie czasu backoff (exponential backoff)
   */
  private _calculateBackoff(attempt: number): number {
    const backoff = this._retryConfig.minTimeoutMs * Math.pow(this._retryConfig.factor, attempt - 1);
    // Dodaj jitter (losowe opóźnienie ±25%) aby uniknąć thundering herd
    const jitter = backoff * 0.25 * (Math.random() - 0.5);
    return Math.min(backoff + jitter, 30000); // max 30s
  }

  /**
   * Sleep utility
   */
  private _sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Mapowanie błędów OpenRouter na wewnętrzny format
   */
  private _handleOpenRouterError(error: unknown): ServiceError {
    // TODO: Pełna implementacja mapowania błędów - w kroku 7
    if (error instanceof Error) {
      this._logger?.error(error, {});
    }

    return {
      code: "unknown_error",
      message: error instanceof Error ? error.message : "Unknown error occurred",
      details: error,
    };
  }

  /**
   * Formatowanie odpowiedzi dla klienta
   */
  private _formatResponseForClient(
    openRouterResponse: OpenRouterResponse,
    responseFormatSpec?: ResponseFormatSpec
  ): unknown {
    const choice = openRouterResponse.choices[0];
    if (!choice) {
      throw new Error("No choices in OpenRouter response");
    }

    const content = choice.message.content;

    // Jeśli response_format to JSON Schema, sparsuj content jako JSON
    if (responseFormatSpec?.type === "json_schema") {
      try {
        return JSON.parse(content);
      } catch (error) {
        throw new Error("Failed to parse JSON response from model", { cause: error });
      }
    }

    // W przeciwnym razie zwróć surowy tekst
    return {
      content,
      finishReason: choice.finish_reason,
      usage: openRouterResponse.usage,
    };
  }

  /**
   * Określenie, czy ponowić wywołanie
   */
  private _shouldRetry(error: { status?: number; errorBody?: unknown }, attempt: number): boolean {
    if (attempt >= this._retryConfig.attempts) {
      return false;
    }

    // Rate limit (429) - retry
    if (error.status === 429) {
      return true;
    }

    // Server errors (5xx) - retry
    if (error.status && error.status >= 500) {
      return true;
    }

    // Client errors (4xx poza 429) - nie retry
    if (error.status && error.status >= 400 && error.status < 500) {
      return false;
    }

    // Network/timeout errors - retry
    return true;
  }
}
