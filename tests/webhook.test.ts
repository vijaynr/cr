import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it, mock } from "bun:test";
import { startWebhookServer } from "../packages/webhook/src/server.js";

const REVIEW_BOARD_WEBHOOK_SECRET = "rb-webhook-secret";
const runReviewWorkflowMock = mock(async () => ({
  output: "Mocked GitLab review result",
  contextLabel: "Mocked MR",
  inlineComments: [],
}));
const runReviewBoardWorkflowMock = mock(async (input: unknown) => ({
  output: "Mocked Review Board review result",
  contextLabel: "Mocked RR",
  inlineComments: [],
  rbUrl: "https://reviews.example.com",
  mrIid: typeof input === "object" && input && "mrIid" in input ? Number((input as { mrIid: number }).mrIid) : 42,
}));

const maybePostReviewBoardCommentMock = mock(async () => null);

mock.module("@cr/workflows", () => ({
  runReviewWorkflow: runReviewWorkflowMock,
  maybePostReviewComment: async () => null,
  runReviewBoardWorkflow: runReviewBoardWorkflowMock,
  maybePostReviewBoardComment: maybePostReviewBoardCommentMock,
}));

mock.module("@cr/core", () => ({
  loadWorkflowRuntime: async () => ({
    gitlabUrl: "https://gitlab.example.com",
    gitlabKey: "mock-key",
    rbUrl: "https://reviews.example.com",
    rbToken: "rb-token",
    rbWebhookSecret: REVIEW_BOARD_WEBHOOK_SECRET,
    webhookConcurrency: 1,
    webhookQueueLimit: 50,
    webhookJobTimeoutMs: 600000,
  }),
  envOrConfig: (_key: string, value: string | undefined, fallback: string) => value || fallback,
  logger: {
    info: () => {},
    success: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {},
  },
  repoRootFromModule: () => "/mock/root",
}));

const servers: Array<{ close: () => void }> = [];

afterEach(() => {
  while (servers.length > 0) {
    servers.pop()?.close();
  }
  runReviewWorkflowMock.mockClear();
  runReviewBoardWorkflowMock.mockClear();
  maybePostReviewBoardCommentMock.mockClear();
});

function buildReviewBoardHeaders(body: string, extraHeaders: Record<string, string> = {}) {
  const signature = createHmac("sha256", REVIEW_BOARD_WEBHOOK_SECRET)
    .update(body, "utf8")
    .digest("hex");

  return {
    "Content-Type": "application/json",
    "X-ReviewBoard-Signature": `sha256=${signature}`,
    ...extraHeaders,
  };
}

describe("Webhook Server", () => {
  it("should respond correctly to a valid GitLab merge request event", async () => {
    const port = 3001;
    const server = await startWebhookServer(port);
    servers.push(server);

    const payload = {
      object_kind: "merge_request",
      event_type: "merge_request",
      project: {
        id: 118153,
      },
      object_attributes: {
        action: "open",
        iid: 7,
      },
    };

    const response = await fetch(`http://localhost:${port}/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Gitlab-Token": "mock-key",
      },
      body: JSON.stringify(payload),
    });

    expect(response.status).toBe(202);
    const json = await response.json();
    expect(json.status).toBe("accepted");
    expect(json.message).toBe("Review queued for processing");
  });

  it("should ignore non-merge-request events", async () => {
    const port = 3002;
    const server = await startWebhookServer(port);
    servers.push(server);

    const response = await fetch(`http://localhost:${port}/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Gitlab-Token": "mock-key",
      },
      body: JSON.stringify({ object_kind: "push" }),
    });

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("Ignored non-merge-request event");
  });

  it("should accept a signed Review Board review_request_published event without requesting inline comments", async () => {
    const port = 3003;
    const server = await startWebhookServer(port, { mode: "reviewboard" });
    servers.push(server);

    const body = JSON.stringify({
      event: "review_request_published",
      review_request: {
        id: 42,
        repository: {
          name: "demo-repo",
        },
      },
    });

    const response = await fetch(`http://localhost:${port}/`, {
      method: "POST",
      headers: buildReviewBoardHeaders(body),
      body,
    });

    expect(response.status).toBe(202);
    const json = await response.json();
    expect(json.status).toBe("accepted");
    expect(runReviewBoardWorkflowMock).toHaveBeenCalledTimes(1);
    expect(runReviewBoardWorkflowMock.mock.calls[0]?.[0]).toMatchObject({
      inlineComments: false,
      provider: "reviewboard",
    });
    expect(maybePostReviewBoardCommentMock).toHaveBeenCalledTimes(1);
    expect(maybePostReviewBoardCommentMock.mock.calls[0]?.[0]).toMatchObject({
      inlineComments: [],
      mrIid: 42,
    });
  });

  it("should reject Review Board events with an invalid signature", async () => {
    const port = 3004;
    const server = await startWebhookServer(port, { mode: "reviewboard" });
    servers.push(server);

    const body = JSON.stringify({
      event: "review_request_published",
      review_request: {
        id: 42,
        repository: {
          name: "demo-repo",
        },
      },
    });

    const response = await fetch(`http://localhost:${port}/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-ReviewBoard-Signature": "sha256=deadbeef",
      },
      body,
    });

    expect(response.status).toBe(403);
    expect(await response.text()).toBe("Forbidden");
  });

  it("should reject Review Board events when the signature is missing", async () => {
    const port = 3005;
    const server = await startWebhookServer(port, { mode: "reviewboard" });
    servers.push(server);

    const body = JSON.stringify({
      event: "review_request_published",
      review_request: {
        id: 42,
        repository: {
          name: "demo-repo",
        },
      },
    });

    const response = await fetch(`http://localhost:${port}/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body,
    });

    expect(response.status).toBe(403);
    expect(await response.text()).toBe("Forbidden");
  });

  it("should ignore signed Review Board review_published events to avoid loops", async () => {
    const port = 3006;
    const server = await startWebhookServer(port, { mode: "reviewboard" });
    servers.push(server);

    const body = JSON.stringify({
      event: "review_published",
      review_request: {
        id: 42,
        repository: {
          name: "demo-repo",
        },
      },
    });

    const response = await fetch(`http://localhost:${port}/`, {
      method: "POST",
      headers: buildReviewBoardHeaders(body),
      body,
    });

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("Ignored Review Board event: review_published");
    expect(runReviewBoardWorkflowMock).not.toHaveBeenCalled();
  });

  it("should parse signed form-encoded Review Board events without a payload wrapper", async () => {
    const port = 3007;
    const server = await startWebhookServer(port, { mode: "reviewboard" });
    servers.push(server);

    const formBody = new URLSearchParams({
      event: "review_request_published",
      "review_request.id": "77",
      "review_request.repository.name": "demo-repo",
    }).toString();

    const response = await fetch(`http://localhost:${port}/`, {
      method: "POST",
      headers: buildReviewBoardHeaders(formBody, {
        "Content-Type": "application/x-www-form-urlencoded",
      }),
      body: formBody,
    });

    expect(response.status).toBe(202);
    const json = await response.json();
    expect(json.status).toBe("accepted");
  });

  it("should return 405 for non-POST requests", async () => {
    const port = 3008;
    const server = await startWebhookServer(port);
    servers.push(server);

    const response = await fetch(`http://localhost:${port}/`, {
      method: "GET",
    });

    expect(response.status).toBe(405);
  });
});


