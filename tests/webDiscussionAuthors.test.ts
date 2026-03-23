import { afterEach, describe, expect, it } from "bun:test";
import { loadReviewDiscussions } from "../packages/web/src/api";

describe("web discussion author normalization", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("prefers a visible GitLab username when the display name is masked", async () => {
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify([
          {
            id: "discussion-1",
            notes: [
              {
                id: 101,
                body: "Please update this logic.",
                author: {
                  name: "****",
                  username: "alice",
                },
                created_at: "2026-03-22T10:00:00Z",
                updated_at: "2026-03-22T10:05:00Z",
              },
            ],
          },
        ]),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      )) as typeof fetch;

    const discussions = await loadReviewDiscussions("gitlab", 42);

    expect(discussions).toHaveLength(1);
    expect(discussions[0]?.messages[0]?.author).toBe("alice");
  });
});
