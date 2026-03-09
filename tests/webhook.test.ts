import { describe, it, expect, mock } from "bun:test";
import { startWebhookServer } from "../packages/webhook/src/server.js";

// Mock the workflows to avoid real network/LLM calls
mock.module("@cr/workflows", () => ({
  runReviewWorkflow: async () => ({
    output: "Mocked review result",
    contextLabel: "Mocked MR",
    inlineComments: [],
  }),
  maybePostReviewComment: async () => null,
}));

// Mock the core runtime and logger
mock.module("@cr/core", () => ({
  loadWorkflowRuntime: async () => ({
    gitlabUrl: "https://gitlab.otxlab.net",
    gitlabKey: "mock-key",
  }),
  envOrConfig: (key: string, _val: string, fallback: string) => fallback || "mock-key",
  logger: {
    info: () => {},
    success: () => {},
    warn: () => {},
    error: () => {},
  },
  repoRootFromModule: () => "/mock/root",
}));

describe("Webhook Server", () => {
  it("should respond correctly to a valid GitLab merge request event", async () => {
    const port = 3001;
    const server = await startWebhookServer(port);

    const payload = {
      object_kind: "merge_request",
      event_type: "merge_request",
      user: {
        name: "Test User",
        username: "testuser",
      },
      project: {
        id: 118153,
        name: "project-118153",
        path_with_namespace: "org/project-118153",
        web_url: "https://gitlab.otxlab.net/org/project-118153",
      },
      object_attributes: {
        action: "open",
        iid: 7,
        title: "Test Merge Request",
        state: "opened",
        url: "https://gitlab.otxlab.net/org/project-118153/-/merge_requests/7",
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

    server.close();
  });

  it("should ignore non-merge-request events", async () => {
    const port = 3002;
    const server = await startWebhookServer(port);

    const payload = {
      object_kind: "push",
    };

    const response = await fetch(`http://localhost:${port}/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Gitlab-Token": "mock-key",
      },
      body: JSON.stringify(payload),
    });

    expect(response.status).toBe(200);
    const text = await response.text();
    expect(text).toBe("Ignored non-merge-request event");

    server.close();
  });

  it("should return 405 for non-POST requests", async () => {
    const port = 3003;
    const server = await startWebhookServer(port);

    const response = await fetch(`http://localhost:${port}/`, {
      method: "GET",
    });

    expect(response.status).toBe(405);
    server.close();
  });
});
