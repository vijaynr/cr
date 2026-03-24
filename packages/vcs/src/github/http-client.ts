/**
 * GitHub-specific HTTP client — extends the shared VCS base.
 *
 * Adds Bearer token auth, GitHub Accept header, User-Agent, and
 * a provider-specific error subclass for instanceof checks.
 */

import { VcsApiError, VcsHttpClient, type VcsRequestOptions } from "../http-client.js";

export type { VcsRequestOptions as RequestOptions };

export class GitHubApiError extends VcsApiError {
  constructor(status: number, endpoint: string, responseBody: string) {
    super(status, endpoint, responseBody, "GitHub");
    this.name = "GitHubApiError";
  }
}

const GITHUB_API_BASE = "https://api.github.com";

export class GitHubHttpClient extends VcsHttpClient {
  private readonly token: string;

  constructor(token: string, baseUrl: string = GITHUB_API_BASE) {
    super({ baseUrl, label: "github" });
    this.token = token;
  }

  protected authHeaders(): Record<string, string> {
    return { Authorization: `Bearer ${this.token}` };
  }

  protected defaultHeaders(): Record<string, string> {
    return {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "CR-CLI",
      "Content-Type": "application/json",
    };
  }

  protected createError(status: number, endpoint: string, body: string): GitHubApiError {
    return new GitHubApiError(status, endpoint, body);
  }
}
