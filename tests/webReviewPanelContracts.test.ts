import { describe, expect, it } from "bun:test";
import { reviewPanelPath } from "./webContractPaths";

describe("web review panel contracts", () => {
  it("renders review output with action buttons and agent results", async () => {
    const source = await Bun.file(reviewPanelPath).text();

    expect(source).toContain("Run review");
    expect(source).toContain("Post review");
    expect(source).toContain("run-review");
    expect(source).toContain("post-generated-review");
    expect(source).toContain("renderResult");
    expect(source).toContain("agentResults");
  });

  it("provides agent selection with inline comment toggle", async () => {
    const source = await Bun.file(reviewPanelPath).text();

    expect(source).toContain("agent-toggle");
    expect(source).toContain("inline-toggle");
    expect(source).toContain("inlineCommentsEnabled");
    expect(source).toContain("selectedAgents");
    expect(source).toContain("Checkbox");
  });
});
