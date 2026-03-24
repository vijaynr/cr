/**
 * GitLab-specific HTTP client — extends the shared VCS base.
 *
 * Adds PRIVATE-TOKEN auth and a provider-specific error subclass.
 */

import { VcsApiError, VcsHttpClient, type VcsRequestOptions } from "../http-client.js";

export type { VcsRequestOptions as RequestOptions };

export class GitLabApiError extends VcsApiError {
  constructor(status: number, endpoint: string, responseBody: string) {
    super(status, endpoint, responseBody, "GitLab");
    this.name = "GitLabApiError";
  }
}

export class GitLabHttpClient extends VcsHttpClient {
  private readonly token: string;

  constructor(baseUrl: string, token: string) {
    super({ baseUrl, label: "gitlab" });
    this.token = token;
  }

  protected authHeaders(): Record<string, string> {
    return { "PRIVATE-TOKEN": this.token };
  }

  protected createError(status: number, endpoint: string, body: string): GitLabApiError {
    return new GitLabApiError(status, endpoint, body);
  }
}
