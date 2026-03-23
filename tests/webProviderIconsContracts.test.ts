import { describe, expect, it } from "bun:test";

const providerIconPath =
  "/Users/vijay/Documents/code/gh/vijaynr/cr/packages/web/src/components/cr-provider-icon.ts";
const sidebarPath =
  "/Users/vijay/Documents/code/gh/vijaynr/cr/packages/web/src/components/cr-sidebar-nav.ts";
const providerSummaryPath =
  "/Users/vijay/Documents/code/gh/vijaynr/cr/packages/web/src/components/cr-provider-summary-card.ts";

describe("web provider icon contracts", () => {
  it("defines brand-aware provider icons for GitLab, GitHub, and Review Board", async () => {
    const source = await Bun.file(providerIconPath).text();

    expect(source).toContain('import { Github, Gitlab } from "lucide";');
    expect(source).toContain('if (this.provider === "gitlab")');
    expect(source).toContain('if (this.provider === "github")');
    expect(source).toContain("return this.renderReviewBoardIcon();");
  });

  it("uses the shared provider icon component in the main sidebar and provider summary cards", async () => {
    const [sidebarSource, summarySource] = await Promise.all([
      Bun.file(sidebarPath).text(),
      Bun.file(providerSummaryPath).text(),
    ]);

    expect(sidebarSource).toContain('import "./cr-provider-icon.js";');
    expect(sidebarSource).toContain("<cr-provider-icon");
    expect(summarySource).toContain('import "./cr-provider-icon.js";');
    expect(summarySource).toContain("<cr-provider-icon");
  });
});
