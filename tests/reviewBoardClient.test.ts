import { describe, expect, it, mock } from "bun:test";
import { createReviewBoardClient } from "../packages/reviewboard/src/client.js";

describe("reviewboard client", () => {
  it("hydrates repository.path from the linked repository resource", async () => {
    const fetchMock = mock(async (url: string) => {
      if (url.endsWith("/api/review-requests/123/?expand=submitter,repository")) {
        return new Response(
          JSON.stringify({
            review_request: {
              id: 123,
              summary: "SVN review",
              description: "desc",
              status: "pending",
              absolute_url: "https://reviews.example.com/r/123/",
              submitter: { username: "alice", title: "Alice" },
              repository: { title: "Project SVN", name: "project-svn" },
              links: {
                diffs: { href: "/api/review-requests/123/diffs/" },
                reviews: { href: "/api/review-requests/123/reviews/" },
                repository: { href: "/api/repositories/9/" },
              },
            },
          }),
          { status: 200 }
        );
      }

      if (url.endsWith("/api/repositories/9/")) {
        return new Response(
          JSON.stringify({
            repository: {
              title: "Project SVN",
              name: "project-svn",
              path: "https://svn.example.com/repos/project",
            },
          }),
          { status: 200 }
        );
      }

      return new Response("not found", { status: 404 });
    });

    const originalFetch = globalThis.fetch;
    globalThis.fetch = fetchMock as typeof fetch;

    try {
      const client = createReviewBoardClient("https://reviews.example.com", "token-123");
      const request = await client.getReviewRequest(123);

      expect(request.repository?.path).toBe("https://svn.example.com/repos/project");
      expect(fetchMock.mock.calls).toHaveLength(2);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
