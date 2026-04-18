import { describe, expect, it } from "bun:test";
import { renderMarkdownPath, stylesPath } from "./webContractPaths";

describe("web markdown contracts", () => {
  it("uses markdown-block custom element for rendering", async () => {
    const source = await Bun.file(renderMarkdownPath).text();

    expect(source).toContain("markdown-block");
    expect(source).toContain("MarkdownBlock.js");
    expect(source).toContain("CodeBlock.js");
    expect(source).toContain(".content=${trimmed}");
  });

  it("defines a shared markdown scale and muted variant in styles", async () => {
    const source = await Bun.file(stylesPath).text();

    expect(source).toContain(".cr-markdown--muted");
    expect(source).toContain(".cr-markdown--compact");
  });
});
