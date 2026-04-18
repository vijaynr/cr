import { describe, expect, it } from "bun:test";
import { themeTogglePath } from "./webContractPaths";

describe("web theme toggle contracts", () => {
  it("renders the theme toggle as an icon button with Tailwind classes", async () => {
    const source = await Bun.file(themeTogglePath).text();

    expect(source).toContain("@customElement(\"cr-theme-toggle\")");
    expect(source).toContain("theme-toggle");
    expect(source).toContain("SunMedium");
    expect(source).toContain("MoonStar");
    expect(source).toContain("isDark");
  });

  it("dispatches a theme-toggle event on click", async () => {
    const source = await Bun.file(themeTogglePath).text();

    expect(source).toContain('new CustomEvent("theme-toggle"');
    expect(source).toContain("@click=${this.toggle}");
  });
});
