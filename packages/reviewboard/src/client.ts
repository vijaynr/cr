import type {
  ReviewBoardRequest,
  ReviewBoardRepository,
  ReviewBoardDiffSet,
  ReviewBoardFileDiff,
  ReviewBoardDiffData,
  ReviewBoardReview,
} from "./types.js";

function isFailureResponse(data: unknown): data is { stat: "fail" } {
  return Boolean(
    data &&
    typeof data === "object" &&
    "stat" in data &&
    (data as { stat?: unknown }).stat === "fail"
  );
}

export interface ReviewBoardClient {
  listReviewRequests(
    status: "pending" | "submitted" | "all",
    fromUser?: string
  ): Promise<ReviewBoardRequest[]>;
  getReviewRequest(requestId: number): Promise<ReviewBoardRequest>;
  getRepository(repositoryHref: string): Promise<ReviewBoardRepository>;
  getLatestDiffSet(requestId: number): Promise<ReviewBoardDiffSet | null>;
  getFileDiffs(requestId: number, diffSetId: number): Promise<ReviewBoardFileDiff[]>;
  getFileDiffData(
    requestId: number,
    diffSetId: number,
    fileDiffId: number
  ): Promise<ReviewBoardDiffData>;
  getRawDiff(requestId: number, revision: number): Promise<string>;
  createReview(requestId: number, bodyTop: string): Promise<ReviewBoardReview>;
  addDiffComment(
    requestId: number,
    reviewId: number,
    fileDiffId: number,
    firstLine: number,
    numLines: number,
    text: string
  ): Promise<void>;
  publishReview(requestId: number, reviewId: number): Promise<void>;
  getCurrentUser(): Promise<{ id: number; username: string; fullname: string }>;

  /**
   * Orchestrates a full review: creates it, adds comments, and publishes it.
   */
  postReview(
    requestId: number,
    summary: string,
    inlineComments?: Array<{
      fileDiffId: number;
      line: number;
      text: string;
      numLines?: number;
    }>
  ): Promise<ReviewBoardReview>;
}

export async function rbRequest<T>(
  baseUrl: string,
  token: string,
  endpoint: string,
  init?: RequestInit,
  username?: string
): Promise<T> {
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");
  const authHeader = username
    ? `Basic ${Buffer.from(`${username}:${token}`).toString("base64")}`
    : token.toLowerCase().startsWith("token ")
      ? token
      : `token ${token}`;

  const url = endpoint.startsWith("http") ? endpoint : `${normalizedBaseUrl}${endpoint}`;

  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: authHeader,
      Accept: "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Review Board API ${response.status}: ${body}`);
  }

  const data: unknown = await response.json();
  if (isFailureResponse(data)) {
    throw new Error(`Review Board API error: ${JSON.stringify(data)}`);
  }
  return data as T;
}

async function getRepository(
  baseUrl: string,
  token: string,
  repositoryHref: string,
  username?: string
): Promise<ReviewBoardRepository> {
  const response = await rbRequest<{ repository: ReviewBoardRepository }>(
    baseUrl,
    token,
    repositoryHref,
    {},
    username
  );
  return response.repository;
}

export async function getCurrentUser(
  baseUrl: string,
  token: string,
  username?: string
): Promise<{ id: number; username: string; fullname: string }> {
  const sessionResponse = await rbRequest<{
    session: {
      authenticated: boolean;
      links: { user: { href: string; title: string } };
    };
  }>(baseUrl, token, "/api/session/", {}, username);

  if (!sessionResponse.session.authenticated) {
    throw new Error("Review Board session is not authenticated. Please check your token.");
  }

  const userHref = sessionResponse.session.links.user.href;
  const userResponse = await rbRequest<{
    user: { id: number; username: string; fullname: string };
  }>(baseUrl, token, userHref, {}, username);
  return userResponse.user;
}

export function createReviewBoardClient(
  baseUrl: string,
  token: string,
  username?: string
): ReviewBoardClient {
  const client: ReviewBoardClient = {
    async listReviewRequests(status, fromUser) {
      let endpoint = `/api/review-requests/?status=${status}&counts-only=0&max-results=200&expand=submitter`;
      if (fromUser) {
        endpoint += `&from-user=${encodeURIComponent(fromUser)}`;
      }
      const response = await rbRequest<{ review_requests: ReviewBoardRequest[] }>(
        baseUrl,
        token,
        endpoint,
        {},
        username
      );
      return response.review_requests || [];
    },

    async getReviewRequest(requestId) {
      const response = await rbRequest<{ review_request: ReviewBoardRequest }>(
        baseUrl,
        token,
        `/api/review-requests/${requestId}/?expand=submitter,repository`,
        {},
        username
      );

      const request = response.review_request;
      if (!request.repository?.path && request.links.repository?.href) {
        request.repository = await getRepository(
          baseUrl,
          token,
          request.links.repository.href,
          username
        );
      }

      return request;
    },

    async getRepository(repositoryHref) {
      return getRepository(baseUrl, token, repositoryHref, username);
    },

    async getLatestDiffSet(requestId) {
      const response = await rbRequest<{ diffs: ReviewBoardDiffSet[] }>(
        baseUrl,
        token,
        `/api/review-requests/${requestId}/diffs/`,
        {},
        username
      );
      const diffs = response.diffs || [];
      return diffs.length > 0 ? diffs[diffs.length - 1] : null;
    },

    async getFileDiffs(requestId, diffSetId) {
      const response = await rbRequest<{ files: ReviewBoardFileDiff[] }>(
        baseUrl,
        token,
        `/api/review-requests/${requestId}/diffs/${diffSetId}/files/`,
        {},
        username
      );
      return response.files || [];
    },

    async getFileDiffData(requestId, diffSetId, fileDiffId) {
      const response = await rbRequest<{ diff_data: ReviewBoardDiffData }>(
        baseUrl,
        token,
        `/api/review-requests/${requestId}/diffs/${diffSetId}/files/${fileDiffId}/diff-data/`,
        {},
        username
      );
      return response.diff_data;
    },

    async getRawDiff(requestId, revision) {
      const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");
      const authHeader = username
        ? `Basic ${Buffer.from(`${username}:${token}`).toString("base64")}`
        : token.toLowerCase().startsWith("token ")
          ? token
          : `token ${token}`;

      const url = `${normalizedBaseUrl}/api/review-requests/${requestId}/diffs/${revision}/`;
      const response = await fetch(url, {
        headers: {
          Authorization: authHeader,
          Accept: "text/x-patch",
        },
      });
      if (!response.ok) {
        const body = await response.text();
        throw new Error(`Review Board API ${response.status}: ${body}`);
      }
      return response.text();
    },

    async createReview(requestId, bodyTop) {
      const response = await rbRequest<{ review: ReviewBoardReview }>(
        baseUrl,
        token,
        `/api/review-requests/${requestId}/reviews/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ body_top: bodyTop }),
        },
        username
      );
      return response.review;
    },

    async addDiffComment(requestId, reviewId, fileDiffId, firstLine, numLines, text) {
      await rbRequest(
        baseUrl,
        token,
        `/api/review-requests/${requestId}/reviews/${reviewId}/diff-comments/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            filediff_id: fileDiffId.toString(),
            first_line: firstLine.toString(),
            num_lines: numLines.toString(),
            text: text,
          }),
        },
        username
      );
    },

    async publishReview(requestId, reviewId) {
      await rbRequest(
        baseUrl,
        token,
        `/api/review-requests/${requestId}/reviews/${reviewId}/`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ public: "1" }),
        },
        username
      );
    },

    async getCurrentUser() {
      return getCurrentUser(baseUrl, token, username);
    },

    async postReview(requestId, summary, inlineComments = []) {
      const review = await this.createReview(requestId, summary);
      for (const comment of inlineComments) {
        await this.addDiffComment(
          requestId,
          review.id,
          comment.fileDiffId,
          comment.line,
          comment.numLines || 1,
          comment.text
        );
      }
      await this.publishReview(requestId, review.id);
      return review;
    },
  };

  return client;
}
