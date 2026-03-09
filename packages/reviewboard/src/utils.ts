import { URL } from "node:url";

export function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, "");
}

export function reviewBoardToRequestId(url: string): number {
  const parsed = new URL(url);
  const match = parsed.pathname.match(/\/r\/(\d+)/);
  if (!match) {
    throw new Error(`Unsupported Review Board URL: ${url}`);
  }
  return Number.parseInt(match[1], 10);
}
