import fs from "node:fs/promises";
import path from "node:path";
import { bundledSpecTemplates } from "../resources/index.js";

export type SpecTarget = "all" | "copilot" | "opencode";

type TemplateConfig = {
  filename: keyof typeof bundledSpecTemplates;
  copilotDest: string;
  opencodeDest: string;
  description: string;
};

const TEMPLATES: TemplateConfig[] = [
  {
    filename: "prd.md",
    copilotDest: ".github/prompts/spec.prd.prompt.md",
    opencodeDest: ".opencode/commands/spec.prd.md",
    description: "Create requirements in .features/<feature-name>-<random-number>/requirements.md",
  },
  {
    filename: "design.md",
    copilotDest: ".github/prompts/spec.design.prompt.md",
    opencodeDest: ".opencode/commands/spec.design.md",
    description:
      "Create design in .features/<feature-name>-<random-number>/design.md using requirements and codebase",
  },
  {
    filename: "threat-model.md",
    copilotDest: ".github/prompts/spec.threat-model.prompt.md",
    opencodeDest: ".opencode/commands/spec.threat-model.md",
    description:
      "Create STRIDE threat model in .features/<feature-name>-<random-number>/threat-model.md",
  },
  {
    filename: "refine.md",
    copilotDest: ".github/prompts/spec.refine.prompt.md",
    opencodeDest: ".opencode/commands/spec.refine.md",
    description:
      "Refine existing design or requirements in .features/<feature-name>-<random-number>/",
  },
  {
    filename: "plan.md",
    copilotDest: ".github/prompts/spec.plan.prompt.md",
    opencodeDest: ".opencode/commands/spec.plan.md",
    description: "Create staged execution plan in .features/<feature-name>-<random-number>/plan.md",
  },
  {
    filename: "doit.md",
    copilotDest: ".github/prompts/spec.doit.prompt.md",
    opencodeDest: ".opencode/commands/spec.doit.md",
    description: "Execute implementation stages from plan",
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

function transformForOpenCode(content: string, description: string): string {
  const header = `---
description: ${description}
agent: build
---`;

  return content
    .replace("{{PLATFORM_HEADER}}", header)
    .replace("{{INPUT_PRD}}", "Feature and context: $ARGUMENTS")
    .replace("{{INPUT_DESIGN}}", "Feature and context: $ARGUMENTS")
    .replace(
      "{{BUILD_RULE}}",
      "6. Do not modify application source code or tests for this command. Only create/update spec documentation files under `.features/`."
    )
    .trim();
}

export async function setupSpecs(
  targetPath: string,
  targetType: SpecTarget = "all"
): Promise<string[]> {
  const absoluteTargetPath = path.resolve(targetPath);
  const copiedFiles: string[] = [];
  const cleanupPaths: string[] = [];

  if (targetType === "all" || targetType === "copilot") {
    cleanupPaths.push(...LEGACY_COPILOT_FILES);
  }
  if (targetType === "all" || targetType === "opencode") {
    cleanupPaths.push(...LEGACY_OPENCODE_FILES);
  }

  for (const relativePath of cleanupPaths) {
    const legacyPath = path.join(absoluteTargetPath, relativePath);
    await fs.rm(legacyPath, { force: true });
  }

  for (const template of TEMPLATES) {
    const rawContent = bundledSpecTemplates[template.filename];

    // Setup Copilot
    if (targetType === "all" || targetType === "copilot") {
      const content = transformForCopilot(rawContent);
      const destPath = path.join(absoluteTargetPath, template.copilotDest);
      await fs.mkdir(path.dirname(destPath), { recursive: true });
      await fs.writeFile(destPath, content, "utf-8");
      copiedFiles.push(destPath);
    }

    // Setup OpenCode
    if (targetType === "all" || targetType === "opencode") {
      const content = transformForOpenCode(rawContent, template.description);
      const destPath = path.join(absoluteTargetPath, template.opencodeDest);
      await fs.mkdir(path.dirname(destPath), { recursive: true });
      await fs.writeFile(destPath, content, "utf-8");
      copiedFiles.push(destPath);
    }
  }

  return copiedFiles;
}
