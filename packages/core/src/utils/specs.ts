import fs from "node:fs/promises";
import path from "node:path";
import { bundledSpecTemplates } from "../resources/index.js";

export type SpecTarget = "copilot";

type TemplateConfig = {
  filename: keyof typeof bundledSpecTemplates;
  copilotDest: string;
};

const TEMPLATES: TemplateConfig[] = [
  {
    filename: "prd.md",
    copilotDest: ".github/prompts/spec.prd.prompt.md",
  },
  {
    filename: "design.md",
    copilotDest: ".github/prompts/spec.design.prompt.md",
  },
  {
    filename: "threat-model.md",
    copilotDest: ".github/prompts/spec.threat-model.prompt.md",
  },
  {
    filename: "refine.md",
    copilotDest: ".github/prompts/spec.refine.prompt.md",
  },
  {
    filename: "plan.md",
    copilotDest: ".github/prompts/spec.plan.prompt.md",
  },
  {
    filename: "doit.md",
    copilotDest: ".github/prompts/spec.doit.prompt.md",
  },
];

const LEGACY_COPILOT_FILES = [
  ".github/prompts/prd.prompt.md",
  ".github/prompts/design.prompt.md",
  ".github/prompts/threat-model.prompt.md",
  ".github/prompts/refine.prompt.md",
  ".github/prompts/plan.prompt.md",
  ".github/prompts/doit.prompt.md",
];

const LEGACY_OPENCODE_FILES = [
  ".opencode/commands/prd.md",
  ".opencode/commands/design.md",
  ".opencode/commands/threat-model.md",
  ".opencode/commands/refine.md",
  ".opencode/commands/plan.md",
  ".opencode/commands/doit.md",
];

function transformForCopilot(content: string): string {
  return content
    .replace("{{PLATFORM_HEADER}}", "")
    .replace(
      "{{INPUT_PRD}}",
      "- Feature name: ${input:feature_name:Short kebab-case name like user-auth}\n- Context: ${input:context:Problem statement, users, constraints, goals}"
    )
    .replace(
      "{{INPUT_DESIGN}}",
      "- Feature selector: ${input:feature_name:Feature name or exact folder name}\n- Extra context: ${input:context:Any additional direction}"
    )
    .replace("{{BUILD_RULE}}", "")
    .trim();
}

export async function setupSpecs(
  targetPath: string,
  _targetType: SpecTarget = "copilot"
): Promise<string[]> {
  const absoluteTargetPath = path.resolve(targetPath);
  const copiedFiles: string[] = [];
  const cleanupPaths: string[] = [...LEGACY_COPILOT_FILES, ...LEGACY_OPENCODE_FILES];

  for (const relativePath of cleanupPaths) {
    const legacyPath = path.join(absoluteTargetPath, relativePath);
    await fs.rm(legacyPath, { force: true });
  }

  for (const template of TEMPLATES) {
    const rawContent = bundledSpecTemplates[template.filename];

    const content = transformForCopilot(rawContent);
    const destPath = path.join(absoluteTargetPath, template.copilotDest);
    await fs.mkdir(path.dirname(destPath), { recursive: true });
    await fs.writeFile(destPath, content, "utf-8");
    copiedFiles.push(destPath);
  }

  return copiedFiles;
}
