import fs from "node:fs/promises";
import path from "node:path";
import { bundledRpiTemplates } from "../resources/index.js";

export type RpiTarget = "copilot";

type TemplateConfig = {
  filename: keyof typeof bundledRpiTemplates;
  copilotDest: string;
};

const TEMPLATES: TemplateConfig[] = [
  {
    filename: "research.md",
    copilotDest: ".github/prompts/rpi.research.prompt.md",
  },
  {
    filename: "plan.md",
    copilotDest: ".github/prompts/rpi.plan.prompt.md",
  },
  {
    filename: "implement.md",
    copilotDest: ".github/prompts/rpi.implement.prompt.md",
  },
];

const LEGACY_OPENCODE_FILES = [
  ".opencode/commands/rpi.research.md",
  ".opencode/commands/rpi.plan.md",
  ".opencode/commands/rpi.implement.md",
];

function transformForCopilot(content: string): string {
  return content
    .replace("{{PLATFORM_HEADER}}", "")
    .replace(
      "{{INPUT_RESEARCH}}",
      "- Topic: ${input:topic:Short topic name like reviewboard-rb-workflow}\n- Context: ${input:context:What should be researched and why}"
    )
    .replace(
      "{{INPUT_PLAN}}",
      "- Topic selector: ${input:topic:Topic name or exact folder name}\n- Extra context: ${input:context:Constraints, decisions, or user guidance}"
    )
    .replace(
      "{{INPUT_IMPLEMENT}}",
      "- Topic selector: ${input:topic:Topic name or exact folder name}\n- Execution context: ${input:context:Approved scope, constraints, or reviewer notes}"
    )
    .replace("{{BUILD_RULE}}", "")
    .trim();
}

export async function setupRpi(
  targetPath: string,
  _targetType: RpiTarget = "copilot"
): Promise<string[]> {
  const absoluteTargetPath = path.resolve(targetPath);
  const copiedFiles: string[] = [];

  for (const relativePath of LEGACY_OPENCODE_FILES) {
    const legacyPath = path.join(absoluteTargetPath, relativePath);
    await fs.rm(legacyPath, { force: true });
  }

  for (const template of TEMPLATES) {
    const rawContent = bundledRpiTemplates[template.filename];

    const content = transformForCopilot(rawContent);
    const destPath = path.join(absoluteTargetPath, template.copilotDest);
    await fs.mkdir(path.dirname(destPath), { recursive: true });
    await fs.writeFile(destPath, content, "utf-8");
    copiedFiles.push(destPath);
  }

  return copiedFiles;
}
