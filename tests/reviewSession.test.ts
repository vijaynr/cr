import { describe, expect, it, mock } from "bun:test";

const loadCRConfigMock = mock(async () => ({ defaultReviewAgents: ["general", "security"] }));
const listBundledReviewAgentNamesMock = mock(() => ["general", "security", "clean-code"]);
const normalizeReviewAgentNamesMock = mock((agentNames?: string[]) => {
  const values = (agentNames ?? ["general"]).map((name) => name.trim().toLowerCase());
  return Array.from(new Set(values.filter(Boolean)));
});
const runInteractiveReviewWorkflowMock = mock((input: any) =>
  (async function* () {
    return {
      output: "review output",
      contextLabel: input.local ? "local diff" : "MR !1 (demo)",
      inlineComments: [],
      selectedAgents: input.agentNames,
      aggregated: (input.agentNames?.length ?? 0) > 1,
    };
  })()
);

mock.module("@cr/core", () => ({
  envOrConfig: (_key: string, value: string | undefined, fallback: string) => value || fallback,
  getCurrentUser: async () => ({ username: "demo" }),
  getOriginRemoteUrl: async () => "https://gitlab.example.com/group/project.git",
  listMergeRequests: async () => [],
  listReviewRequests: async () => [],
  loadCRConfig: loadCRConfigMock,
  rbRequest: async () => ({ review_requests: [] }),
  remoteToProjectPath: () => "group/project",
  listBundledReviewAgentNames: listBundledReviewAgentNamesMock,
  normalizeReviewAgentNames: normalizeReviewAgentNamesMock,
}));

mock.module("../packages/workflows/src/reviewWorkflow.js", () => ({
  runInteractiveReviewWorkflow: runInteractiveReviewWorkflowMock,
}));
mock.module("../packages/workflows/src/reviewBoardWorkflow.js", () => ({
  runInteractiveReviewBoardWorkflow: runInteractiveReviewWorkflowMock,
}));
mock.module("../packages/workflows/src/reviewChatWorkflow.js", () => ({
  answerReviewChatQuestion: async () => ({ answer: "", history: [] }),
  runReviewChatWorkflow: async () => ({
    contextLabel: "chat",
    mrContent: "",
    mrChanges: "",
    mrCommits: "",
    summary: "",
  }),
}));
mock.module("../packages/workflows/src/reviewSummarizeWorkflow.js", () => ({
  runReviewSummarizeWorkflow: async () => ({
    output: "summary",
    contextLabel: "summary",
    inlineComments: [],
    selectedAgents: [],
    aggregated: false,
  }),
}));

const { runInteractiveReviewSession } = await import("../packages/workflows/src/reviewSession.js");

describe("review session agent selection", () => {
  it("prompts for review agents in interactive review mode and passes them through", async () => {
    const session = runInteractiveReviewSession({
      repoPath: ".",
      repoRoot: ".",
      mode: "interactive",
      workflow: "review",
      local: true,
      state: "opened",
      provider: "gitlab",
    });

    const firstStep = await session.next();
    expect(firstStep.done).toBe(false);
    expect(firstStep.value).toMatchObject({
      type: "select_review_agents",
    });

    const secondStep = await session.next({
      type: "review_agents_selected",
      agentNames: ["security", "clean-code"],
    });

    expect(secondStep.done).toBe(true);
    expect(secondStep.value).toMatchObject({
      action: "review",
      result: {
        selectedAgents: ["security", "clean-code"],
        aggregated: true,
      },
    });
    expect(runInteractiveReviewWorkflowMock.mock.calls[0]?.[0]).toMatchObject({
      agentNames: ["security", "clean-code"],
      agentMode: "multi",
    });
  });

  it("uses configured default review agents in ci mode", async () => {
    const session = runInteractiveReviewSession({
      repoPath: ".",
      repoRoot: ".",
      mode: "ci",
      workflow: "review",
      local: true,
      state: "opened",
      provider: "gitlab",
    });

    const result = await session.next();
    expect(result.done).toBe(true);
    expect(result.value).toMatchObject({
      action: "review",
      result: {
        selectedAgents: ["general", "security"],
        aggregated: true,
      },
    });
    expect(runInteractiveReviewWorkflowMock.mock.calls[1]?.[0]).toMatchObject({
      agentNames: ["general", "security"],
      agentMode: "multi",
    });
  });
});
