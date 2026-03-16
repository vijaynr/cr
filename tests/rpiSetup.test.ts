import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "bun:test";
import { setupRpi } from "../packages/core/src/utils/rpi.js";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

describe("setupRpi", () => {
  it("writes GitHub Copilot RPI prompt files and removes legacy OpenCode files", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "cr-rpi-"));
    tempDirs.push(tempDir);

    const legacyOpenCodePath = path.join(tempDir, ".opencode/commands/rpi.research.md");
    await fs.mkdir(path.dirname(legacyOpenCodePath), { recursive: true });
    await fs.writeFile(legacyOpenCodePath, "legacy", "utf-8");

    const copied = await setupRpi(tempDir, "copilot");

    expect(copied).toContain(path.join(tempDir, ".github/prompts/rpi.research.prompt.md"));
    expect(copied).toContain(path.join(tempDir, ".github/prompts/rpi.plan.prompt.md"));
    expect(copied).toContain(path.join(tempDir, ".github/prompts/rpi.implement.prompt.md"));
    expect(copied.some((file) => file.includes(".opencode/commands"))).toBe(false);

    const copilotResearch = await fs.readFile(
      path.join(tempDir, ".github/prompts/rpi.research.prompt.md"),
      "utf-8"
    );
    const copilotPlan = await fs.readFile(
      path.join(tempDir, ".github/prompts/rpi.plan.prompt.md"),
      "utf-8"
    );
    const copilotImplement = await fs.readFile(
      path.join(tempDir, ".github/prompts/rpi.implement.prompt.md"),
      "utf-8"
    );
    const legacyOpenCodeStillExists = await fs
      .access(legacyOpenCodePath)
      .then(() => true)
      .catch(() => false);

    expect(copilotResearch).toContain("${input:topic:Short topic name like reviewboard-rb-workflow}");
    expect(copilotResearch).toContain("Next command to run: /rpi.plan");
    expect(copilotResearch).toContain(
      "Do not create `plan.md`, `implementation.md`, or any other markdown file during `/rpi.research`."
    );
    expect(copilotPlan).toContain(
      "Do not create `research.md`, `implementation.md`, or any other markdown file during `/rpi.plan`."
    );
    expect(copilotImplement).toContain(
      "Do not create `research.md`, `plan.md`, or any other markdown file during `/rpi.implement`."
    );
    expect(legacyOpenCodeStillExists).toBe(false);
  });
});
