import { initializeCRHome } from "@cr/core";
import { loadCRConfig, saveCRConfig, setupSpecs, type SpecTarget } from "@cr/core";
import { CR_CONF_PATH, repoRootFromModule } from "@cr/core";
import { printError, printSuccess, printWarning, createSpinner, printDivider, promptWithFrame, printInfo, printWorkflowOutput } from "@cr/ui";
import { defaultConfig } from "@cr/core";
import { COLORS, DOT } from "@cr/ui";
import { hasFlag, getFlag } from "../cliHelpers.js";
import path from "node:path";

export async function runInitCommand(args: string[] = []): Promise<void> {
  const isSdd = hasFlag(args, "sdd");
  const isWebhook = hasFlag(args, "webhook");

  if (isSdd) {
    await runSddSetup(args);
    return;
  }

  if (isWebhook) {
    await runWebhookSetup();
    return;
  }

  const spinner = createSpinner("Bootstrapping CR workspace...").start();

  try {
    const repoRoot = repoRootFromModule(import.meta.url);
    await initializeCRHome(repoRoot);
    spinner.stopAndPersist({ symbol: COLORS.green + DOT + COLORS.reset, text: "Workspace ready." });
  } catch (error) {
    spinner.fail("Failed to initialize workspace.");
    const message = error instanceof Error ? error.message : String(error);
    printError(message);
    process.exitCode = 1;
    return;
  }

  const existing = await loadCRConfig();

  const answers = await promptWithFrame(
    [
      {
        type: "text",
        name: "openaiApiUrl",
        message: "OpenAI API URL",
        initial: existing.openaiApiUrl ?? defaultConfig.openaiApiUrl,
      },
      {
        type: "password",
        name: "openaiApiKey",
        message: "OpenAI API Key",
        initial: existing.openaiApiKey ?? "",
      },
      {
        type: "text",
        name: "openaiModel",
        message: "OpenAI Model",
        initial: existing.openaiModel ?? defaultConfig.openaiModel,
      },
      {
        type: "toggle",
        name: "useCustomStreaming",
        message: "Use custom streaming (SSE format)",
        initial: existing.useCustomStreaming ?? false,
        active: "yes",
        inactive: "no",
      },
      {
        type: "select",
        name: "terminalTheme",
        message: "Terminal theme (for optimal colors)",
        choices: [
          { title: "Auto-detect", value: "auto" },
          { title: "Dark background", value: "dark" },
          { title: "Light background", value: "light" },
        ],
        initial: existing.terminalTheme === "light" ? 2 : existing.terminalTheme === "dark" ? 1 : 0,
      },
      {
        type: "text",
        name: "gitlabUrl",
        message: "GitLab URL",
        initial: existing.gitlabUrl ?? defaultConfig.gitlabUrl,
      },
      {
        type: "password",
        name: "gitlabKey",
        message: "GitLab Access Token (api scope)",
        initial: existing.gitlabKey ?? "",
      },
    ],
    { onCancel: () => true }
  );

  if (!answers.openaiApiUrl || !answers.openaiModel || !answers.gitlabUrl) {
    printWarning("Initialization cancelled.");
    return;
  }

  await saveCRConfig({
    openaiApiUrl: answers.openaiApiUrl,
    openaiApiKey: answers.openaiApiKey ?? "",
    openaiModel: answers.openaiModel,
    useCustomStreaming: answers.useCustomStreaming ?? false,
    terminalTheme: answers.terminalTheme ?? "auto",
    gitlabUrl: answers.gitlabUrl,
    gitlabKey: answers.gitlabKey ?? "",
  });

  printDivider();
  printSuccess(`Configuration saved to ${CR_CONF_PATH}`);
  printDivider();
}

async function runSddSetup(args: string[]): Promise<void> {
  createSpinner("Loading settings...").start().stopAndPersist({
    symbol: COLORS.cyan + DOT + COLORS.reset,
    text: "Initialize Spec-Driven Development templates",
  });

  const targetPath = path.resolve(getFlag(args, "path", ".", "-p"));
  let targetRaw = getFlag(args, "target", "");

  if (!targetRaw) {
    const answer = await promptWithFrame([
      {
        type: "select",
        name: "target",
        message: "Which command templates do you want to install?",
        choices: [
          { title: "All (Copilot & OpenCode)", value: "all" },
          { title: "GH Copilot", value: "copilot" },
          { title: "OpenCode", value: "opencode" },
        ],
        initial: 0,
      },
    ]);

    if (!answer.target) {
      printWarning("SDD setup cancelled.");
      return;
    }
    targetRaw = answer.target;
  }

  if (!["all", "copilot", "opencode"].includes(targetRaw)) {
    printError(`Unsupported SDD target: ${targetRaw}. Use all, copilot, or opencode.`);
    process.exitCode = 1;
    return;
  }

  const target = targetRaw as SpecTarget;

  printInfo(`Setting up SDD commands for ${target} at ${targetPath}...`);

  try {
    const copiedFiles = await setupSpecs(targetPath, target);

    if (copiedFiles.length === 0) {
      printInfo("No files were copied.");
    } else {
      printDivider();
      printSuccess(`Successfully setup ${copiedFiles.length} SDD files:`);
      for (const file of copiedFiles) {
        console.log(`  - ${path.relative(targetPath, file)}`);
      }

      const summary = `
### Spec-Driven Development Workflow

These slash commands are installed for **GitHub Copilot** and **OpenCode**, and are available to run inside those tools.

1.  Run **/prd** to create \`.features/<feature-name>-<id>/prd.md\`
2.  Run **/design** to create \`design.md\` from requirements + codebase
3.  Run **/threat-model** to create STRIDE threat model as \`threat-model.md\`
4.  Run **/refine** to iterate on \`design.md\` with your context
5.  Run **/plan** to create staged \`plan.md\` with goals and exit criteria
6.  Run **/doit** to execute stages from \`plan.md\` and update \`done.md\`

Use the same feature name or folder across commands so they reference the same \`.features/<feature-name>-<id>/\` directory.
      `;

      printWorkflowOutput({ title: "Spec-Driven Development Workflow", output: summary });
      printDivider();
    }
  } catch (err) {
    printError(`Failed to setup SDD: ${err instanceof Error ? err.message : String(err)}`);
    process.exitCode = 1;
  }
}

async function runWebhookSetup(): Promise<void> {
  const existing = await loadCRConfig();

  createSpinner("Loading settings...").start().stopAndPersist({
    symbol: COLORS.cyan + DOT + COLORS.reset,
    text: "Initialize Webhook and SSL configuration",
  });

  const answers = await promptWithFrame(
    [
      {
        type: "password",
        name: "gitlabWebhookSecret",
        message: "GitLab Webhook Secret (X-Gitlab-Token)",
        initial: existing.gitlabWebhookSecret ?? "",
      },
      {
        type: "text",
        name: "sslCertPath",
        message: "SSL Certificate Path (for cr serve)",
        initial: existing.sslCertPath ?? "",
      },
      {
        type: "text",
        name: "sslKeyPath",
        message: "SSL Private Key Path (for cr serve)",
        initial: existing.sslKeyPath ?? "",
      },
      {
        type: "text",
        name: "sslCaPath",
        message: "SSL CA Bundle Path (optional)",
        initial: existing.sslCaPath ?? "",
      },
      {
        type: "number",
        name: "webhookConcurrency",
        message: "Max concurrent review jobs",
        initial: existing.webhookConcurrency ?? 3,
      },
      {
        type: "number",
        name: "webhookQueueLimit",
        message: "Max jobs in queue",
        initial: existing.webhookQueueLimit ?? 50,
      },
      {
        type: "number",
        name: "webhookJobTimeoutMs",
        message: "Review job timeout (ms)",
        initial: existing.webhookJobTimeoutMs ?? 600000,
      },
    ],
    { onCancel: () => true }
  );

  // We don't have "critical" fields here as they are all technically optional
  // depending on if you want HTTP or HTTPS, but we should at least check if the prompt was cancelled.
  if (answers.webhookConcurrency === undefined) {
    printWarning("Webhook initialization cancelled.");
    return;
  }

  await saveCRConfig({
    openaiApiUrl: existing.openaiApiUrl ?? defaultConfig.openaiApiUrl,
    openaiApiKey: existing.openaiApiKey ?? "",
    openaiModel: existing.openaiModel ?? defaultConfig.openaiModel,
    useCustomStreaming: existing.useCustomStreaming ?? false,
    gitlabUrl: existing.gitlabUrl ?? defaultConfig.gitlabUrl,
    gitlabKey: existing.gitlabKey ?? "",
    terminalTheme: existing.terminalTheme ?? "auto",
    gitlabWebhookSecret: answers.gitlabWebhookSecret || undefined,
    sslCertPath: answers.sslCertPath || undefined,
    sslKeyPath: answers.sslKeyPath || undefined,
    sslCaPath: answers.sslCaPath || undefined,
    webhookConcurrency: answers.webhookConcurrency,
    webhookQueueLimit: answers.webhookQueueLimit,
    webhookJobTimeoutMs: answers.webhookJobTimeoutMs,
  });

  printDivider();
  printSuccess(`Webhook configuration updated in ${CR_CONF_PATH}`);
  printDivider();
}
