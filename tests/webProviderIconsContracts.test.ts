import { describe, expect, it } from "bun:test";
import { providerIconPath } from "./webContractPaths";

describe("web provider icon contracts", () => {
  it("defines brand-aware provider icons for GitLab, GitHub, and Review Board", async () => {
    const source = await Bun.file(providerIconPath).text();

    expect(source).toContain("gitlab");
    expect(source).toContain("github");
    expect(source).toContain("Diff");
    expect(source).toContain("cr-icon");
  });
});
