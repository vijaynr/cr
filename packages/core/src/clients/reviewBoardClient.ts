import { createReviewBoardClient as createClient } from "@cr/vcs/reviewboard";

export type { ReviewBoardClient } from "@cr/vcs/reviewboard";

/**
 * Creates a Review Board client using the standalone @cr/reviewboard package.
 */
export function createReviewBoardClient(baseUrl: string, token: string, username?: string) {
  return createClient(baseUrl, token, username);
}
