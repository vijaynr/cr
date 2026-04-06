/**
 * Shared HTTP client foundation for VCS provider adapters.
 *
 * Provides a base error class, common request options, and an abstract
 * HTTP client with convenience methods (get/post/put/patch/delete).
 * Each provider extends `VcsHttpClient` and supplies its own auth headers,
 * default headers, and any provider-specific request behaviour.
 */

// ---------------------------------------------------------------------------
// Shared error base
// ---------------------------------------------------------------------------

export class VcsApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly endpoint: string,
    public readonly responseBody: string,
    providerLabel: string
  ) {
    super(`${providerLabel} API ${status} on ${endpoint}: ${responseBody}`);
    this.name = `${providerLabel}ApiError`;
  }
}

// ---------------------------------------------------------------------------
// Shared request options
// ---------------------------------------------------------------------------

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface VcsRequestOptions {
  method?: HttpMethod;
  body?: unknown;
  headers?: Record<string, string>;
  /** When true, a 404 response returns null instead of throwing. */
  notFoundReturnsNull?: boolean;
  /** When true, non-2xx is logged at trace level instead of error. */
  silent?: boolean;
}

// ---------------------------------------------------------------------------
// Abstract HTTP client
// ---------------------------------------------------------------------------

export interface VcsHttpClientConfig {
  baseUrl: string;
  /** Short lowercase label used in log output and error messages (e.g. "github"). */
  label: string;
}

export abstract class VcsHttpClient {
  protected readonly baseUrl: string;
  protected readonly label: string;

  constructor(config: VcsHttpClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, "");
    this.label = config.label;
  }

  /** Returns headers that authenticate the request (e.g. Authorization). */
  protected abstract authHeaders(): Record<string, string>;

  /** Returns extra default headers merged into every request. */
  protected defaultHeaders(): Record<string, string> {
    return { "Content-Type": "application/json" };
  }

  /** Constructs a `VcsApiError` (or a provider-specific subclass). */
  protected createError(status: number, endpoint: string, body: string): VcsApiError {
    return new VcsApiError(status, endpoint, body, this.label);
  }

  // -------------------------------------------------------------------------
  // Core request
  // -------------------------------------------------------------------------

  /**
   * Performs an HTTP request and returns the parsed JSON response.
   *
   * When `notFoundReturnsNull` is `true` in the options, a 404 response returns
   * `null` instead of throwing — the return type reflects this as `Promise<T | null>`.
   * Without that option the return type is `Promise<T>`.
   */
  async request<T>(
    endpoint: string,
    options: VcsRequestOptions & { notFoundReturnsNull: true }
  ): Promise<T | null>;
  async request<T>(endpoint: string, options?: VcsRequestOptions): Promise<T>;
  async request<T>(endpoint: string, options: VcsRequestOptions = {}): Promise<T | null> {
    const {
      method = "GET",
      body,
      headers = {},
      notFoundReturnsNull = false,
      silent = false,
    } = options;
    const url = `${this.baseUrl}${endpoint}`;

    this.log("debug", `${method} ${endpoint}`);

    const response = await fetch(url, {
      method,
      headers: {
        ...this.authHeaders(),
        ...this.defaultHeaders(),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (response.status === 404 && notFoundReturnsNull) {
      return null;
    }

    if (!response.ok) {
      const responseBody = await response.text();
      if (silent) {
        this.log("trace", `${method} ${endpoint} → ${response.status} (silent)`);
      } else {
        this.log("error", `${method} ${endpoint} → ${response.status}: ${responseBody}`);
      }
      throw this.createError(response.status, endpoint, responseBody);
    }

    this.log("trace", `${method} ${endpoint} → ${response.status}`);

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  }

  /**
   * Fetches a plain-text response. Returns `null` on 404.
   * Subclasses may override to customize Accept headers.
   */
  async requestText(
    endpoint: string,
    options: Omit<VcsRequestOptions, "body"> = {}
  ): Promise<string | null> {
    const { method = "GET", headers = {}, silent = false } = options;
    const url = `${this.baseUrl}${endpoint}`;

    this.log("debug", `${method} ${endpoint} (text)`);

    const response = await fetch(url, {
      method,
      headers: {
        ...this.authHeaders(),
        ...headers,
      },
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      const responseBody = await response.text();
      if (silent) {
        this.log("trace", `${method} ${endpoint} → ${response.status} (silent)`);
      } else {
        this.log("error", `${method} ${endpoint} → ${response.status}: ${responseBody}`);
      }
      throw this.createError(response.status, endpoint, responseBody);
    }

    return response.text();
  }

  // -------------------------------------------------------------------------
  // Convenience methods
  // -------------------------------------------------------------------------

  get<T>(
    endpoint: string,
    options: Omit<VcsRequestOptions, "method" | "body"> & { notFoundReturnsNull: true }
  ): Promise<T | null>;
  get<T>(endpoint: string, options?: Omit<VcsRequestOptions, "method" | "body">): Promise<T>;
  get<T>(
    endpoint: string,
    options?: Omit<VcsRequestOptions, "method" | "body">
  ): Promise<T | null> {
    return this.request<T>(endpoint, { ...options, method: "GET" } as VcsRequestOptions);
  }

  post<T>(
    endpoint: string,
    body?: unknown,
    options?: Omit<VcsRequestOptions, "method" | "body">
  ): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "POST", body });
  }

  put<T>(
    endpoint: string,
    body?: unknown,
    options?: Omit<VcsRequestOptions, "method" | "body">
  ): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "PUT", body });
  }

  patch<T>(
    endpoint: string,
    body?: unknown,
    options?: Omit<VcsRequestOptions, "method" | "body">
  ): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "PATCH", body });
  }

  delete<T>(endpoint: string, options?: Omit<VcsRequestOptions, "method" | "body">): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "DELETE" });
  }

  // -------------------------------------------------------------------------
  // Logging
  // -------------------------------------------------------------------------

  protected log(level: "debug" | "trace" | "error", message: string): void {
    if (level === "error") {
      console.error(`[${this.label}] ${message}`);
    } else if (level === "debug" && process.env.DEBUG) {
      console.debug(`[${this.label}] ${message}`);
    }
  }
}
