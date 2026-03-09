import { createReviewBoardClient, normalizeBaseUrl, reviewBoardToRequestId, rbRequest, getCurrentUser } from "@cr/reviewboard";
import type { ReviewBoardRequest, ReviewBoardDiffSet, ReviewBoardFileDiff, ReviewBoardDiffData, ReviewBoardReview } from "@cr/reviewboard";

export { normalizeBaseUrl, reviewBoardToRequestId, rbRequest, getCurrentUser };

export async function listReviewRequests(baseUrl: string, token: string, status: "pending" | "submitted" | "all", fromUser?: string): Promise<ReviewBoardRequest[]> {
  return createReviewBoardClient(baseUrl, token).listReviewRequests(status, fromUser);
}

export async function getReviewRequest(baseUrl: string, token: string, requestId: number): Promise<ReviewBoardRequest> {
  return createReviewBoardClient(baseUrl, token).getReviewRequest(requestId);
}

export async function getLatestDiffSet(baseUrl: string, token: string, requestId: number): Promise<ReviewBoardDiffSet | null> {
  return createReviewBoardClient(baseUrl, token).getLatestDiffSet(requestId);
}

export async function getFileDiffs(baseUrl: string, token: string, requestId: number, diffSetId: number): Promise<ReviewBoardFileDiff[]> {
  return createReviewBoardClient(baseUrl, token).getFileDiffs(requestId, diffSetId);
}

export async function getFileDiffData(baseUrl: string, token: string, requestId: number, diffSetId: number, fileDiffId: number): Promise<ReviewBoardDiffData> {
  return createReviewBoardClient(baseUrl, token).getFileDiffData(requestId, diffSetId, fileDiffId);
}

export async function createReview(baseUrl: string, token: string, requestId: number, bodyTop: string): Promise<ReviewBoardReview> {
  return createReviewBoardClient(baseUrl, token).createReview(requestId, bodyTop);
}

export async function addDiffComment(baseUrl: string, token: string, requestId: number, reviewId: number, fileDiffId: number, firstLine: number, numLines: number, text: string): Promise<void> {
  return createReviewBoardClient(baseUrl, token).addDiffComment(requestId, reviewId, fileDiffId, firstLine, numLines, text);
}

export async function publishReview(baseUrl: string, token: string, requestId: number, reviewId: number): Promise<void> {
  return createReviewBoardClient(baseUrl, token).publishReview(requestId, reviewId);
}

export async function getRawDiff(baseUrl: string, token: string, requestId: number, revision: number): Promise<string> {
  return createReviewBoardClient(baseUrl, token).getRawDiff(requestId, revision);
}
