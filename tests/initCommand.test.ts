import { describe, it, expect, mock } from "bun:test";
import { runInitCommand } from "../packages/cli/src/commands/initCommand.js";
import * as ui from "@cr/ui";
import * as core from "@cr/core";

let lastQuestions: any[] = [];
let lastSavedConfig: any = null;
let mockConfig: any = {};

// Mock @cr/ui
mock.module("@cr/ui", () => ({
  promptWithFrame: mock(async (questions: any) => {
    lastQuestions = questions;
    const answers: any = {};
    for (const q of questions) {
      if (q.name === "gitlabWebhookSecret") answers[q.name] = "new-secret";
      else if (q.name === "rbUrl") answers[q.name] = "https://new-rb.com";
      else if (q.name === "rbToken") answers[q.name] = "new-token";
      else if (q.name === "webhookConcurrency") answers[q.name] = 10;
      else answers[q.name] = q.initial;
    }
    return answers;
  }),
  createSpinner: () => ({
    start: function () {
      return this;
    },
    stopAndPersist: function () {
      return this;
    },
    fail: function () {
      return this;
    },
  }),
  printError: mock(() => {}),
  printSuccess: mock(() => {}),
  printWarning: mock(() => {}),
  printInfo: mock(() => {}),
  printDivider: mock(() => {}),
  printEmptyLine: mock(() => {}),
  printWorkflowOutput: mock(() => {}),
  COLORS: { cyan: "", green: "", reset: "" },
  DOT: ".",
}));

// Mock @cr/core
mock.module("@cr/core", () => ({
  loadCRConfig: mock(async () => mockConfig),
  saveCRConfig: mock(async (config: any) => {
    lastSavedConfig = config;
  }),
  initializeCRHome: mock(async () => {}),
  repoRootFromModule: () => "/mock/root",
  CR_CONF_PATH: "/mock/cr.conf",
  defaultConfig: {
    openaiApiUrl: "https://api.openai.com/v1",
    openaiModel: "gpt-4",
    gitlabUrl: "https://gitlab.com",
    rbUrl: "https://reviews.reviewboard.org",
  },
}));

describe("initCommand - runWebhookSetup", () => {
  it("should ask for GitLab specific configs in gitlab mode", async () => {
    mockConfig = { gitlabWebhookSecret: "old-secret" };
    lastQuestions = [];
    lastSavedConfig = null;

    await runInitCommand(["--webhook", "--mode", "gitlab"]);

    expect(lastQuestions.some((q) => q.name === "gitlabWebhookSecret")).toBe(true);
    expect(lastQuestions.some((q) => q.name === "rbUrl")).toBe(false);
    expect(lastSavedConfig.gitlabWebhookSecret).toBe("new-secret");
  });

  it("should ask for Review Board specific configs in reviewboard mode", async () => {
    mockConfig = { rbUrl: "https://old-rb.com", rbToken: "old-token" };
    lastQuestions = [];
    lastSavedConfig = null;

    await runInitCommand(["--webhook", "--mode", "reviewboard"]);

    expect(lastQuestions.some((q) => q.name === "gitlabWebhookSecret")).toBe(false);
    expect(lastQuestions.some((q) => q.name === "rbUrl")).toBe(true);
    expect(lastQuestions.some((q) => q.name === "rbToken")).toBe(true);
    expect(lastSavedConfig.rbUrl).toBe("https://new-rb.com");
    expect(lastSavedConfig.rbToken).toBe("new-token");
  });

  it("should preserve existing config fields", async () => {
    mockConfig = {
      openaiApiKey: "existing-key",
      gitlabKey: "existing-gitlab-key",
    };
    lastSavedConfig = null;

    await runInitCommand(["--webhook", "--mode", "gitlab"]);

    expect(lastSavedConfig.openaiApiKey).toBe("existing-key");
    expect(lastSavedConfig.gitlabKey).toBe("existing-gitlab-key");
  });
});
