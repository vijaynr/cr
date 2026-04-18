import { describe, expect, it } from "bun:test";
import { stylesPath } from "./webContractPaths";

describe("web diff viewer contracts", () => {
  it("uses an explicit horizontal scroll container for wide diffs", async () => {
    const source = await Bun.file(stylesPath).text();

    expect(source).toContain(".cr-diff-viewer__code-scroll");
    expect(source).toContain("overflow: scroll hidden");
  });

  it("keeps vertical scrolling inside the diff workspace", async () => {
    const source = await Bun.file(stylesPath).text();

    expect(source).toContain(".cr-diff-viewer");
    expect(source).toContain("overflow: auto");
    expect(source).toContain("min-height: 0");
  });
});
