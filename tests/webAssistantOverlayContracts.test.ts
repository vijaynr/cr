import { describe, expect, it } from "bun:test";
import { analysisRailPath } from "./webContractPaths";

describe("web assistant overlay contracts", () => {
  it("opens the AI Assistant from the selected review header", async () => {
    const source = await Bun.file(analysisRailPath).text();

    expect(source).toContain("close-analysis-panel");
    expect(source).toContain("analysis-tab-change");
    expect(source).toContain("AI Assistant");
  });

  it("renders the assistant as a right-side overlay with backdrop and tabs", async () => {
    const source = await Bun.file(analysisRailPath).text();

    expect(source).toContain("fixed inset-0");
    expect(source).toContain("bg-black/40");
    expect(source).toContain("translate-x-0");
    expect(source).toContain("translate-x-8");
    expect(source).toContain("border-b-2 border-primary");
    expect(source).toContain("AI Assistant");
    expect(source).toContain("review");
    expect(source).toContain("summary");
    expect(source).toContain("chat");
  });
});
