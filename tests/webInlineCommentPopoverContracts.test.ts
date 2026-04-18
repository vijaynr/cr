import { describe, expect, it } from "bun:test";
import { inlineCommentPopoverPath } from "./webContractPaths";

describe("web inline comment popover contracts", () => {
  it("positions the popover using the selected line anchor coordinates", async () => {
    const source = await Bun.file(inlineCommentPopoverPath).text();

    expect(source).toContain("popoverStyle()");
    expect(source).toContain("anchorLeft");
    expect(source).toContain("anchorTop");
    expect(source).toContain("left:");
    expect(source).toContain("top:");
    expect(source).toContain("position:fixed");
  });

  it("uses fixed positioning with computed coordinates", async () => {
    const source = await Bun.file(inlineCommentPopoverPath).text();

    expect(source).toContain("position:fixed");
    expect(source).toContain("z-index:30");
    expect(source).toContain("window.innerWidth");
  });
});
