import { initializeCRHome } from "@cr/core";
import { loadCRConfig, saveCRConfig, setupSpecs, type SpecTarget } from "@cr/core";
import { CR_CONF_PATH, repoRootFromModule } from "@cr/core";
import {
  printError,
  printSuccess,
  printWarning,
  createSpinner,
  printDivider,
  promptWithFrame,
  printInfo,
  printWorkflowOutput,
  printEmptyLine,
} from "@cr/ui";
import { defaultConfig } from "@cr/core";
import { COLORS, DOT } from "@cr/ui";
import { hasFlag, getFlag } from "../cliHelpers.js";
import path from "node:path";

export async function runInitCommand(args: string[] = []): Promise<void> {
  const isSdd = hasFlag(args, "sdd");
  const isWebhook = hasFlag(args, "webhook");
  const isRb = hasFlag(args, "rb");
  const isGitlab = hasFlag(args, "gitlab");

  if (isSdd) {
    await runSddSetup(args);
    return;
  }

  if (isWebhook) {
    await runWebhookSetup(args);
    return;
  }

  if (isRb) {
    await runRbSetup(args);
    return;
  }

  if (isGitlab) {
    await runGitLabSetup(args);
    return;
  }

  await bootstrap(args);
}

async function bootstrap(args: string[] = []): Promise<void> {
  const spinner = createSpinner("Bootstrapping application...").start();
  try {
    const repoRoot = repoRootFromModule(import.meta.url);
    await initializeCRHome(repoRoot);
    spinner.stopAndPersist({
      symbol: COLORS.green + DOT + COLORS.reset,
      text: "Application ready.",
    });
  } catch (error) {
    spinner.fail("Failed to initialize application.");
    const message = error instanceof Error ? error.message : String(error);
    printError(message);
    process.exitCode = 1;
    return;
  }
}

async function runSddSetup(args: string[] = []): Promise<void> {
  createSpinner("Loading settings...")
    .start()
    .stopAndPersist({
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

1.  Run **/spec.prd** to create \`.features/<feature-name>-<id>/prd.md\`
2.  Run **/spec.design** to create \`design.md\` from requirements + codebase
3.  Run **/spec.threat-model** to create STRIDE threat model as \`threat-model.md\`
4.  Run **/spec.refine** to iterate on \`design.md\` with your context
5.  Run **/spec.plan** to create staged \`plan.md\` with goals and exit criteria
6.  Run **/spec.doit** to execute stages from \`plan.md\` and update \`done.md\`

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

async function runWebhookSetup(args: string[] = []): Promise<void> {
  const existing = await loadCRConfig();

  createSpinner("Loading settings...")
    .start()
    .stopAndPersist({
      symbol: COLORS.cyan + DOT + COLORS.reset,
      text: "Initialize Webhook and SSL configuration",
    });

  const mode = getFlag(args, "mode", "gitlab");

  if (mode !== "gitlab" && mode !== "reviewboard") {
    printError(`Unsupported mode '${mode}'. Currently 'gitlab' and 'reviewboard' are supported.`);
    process.exitCode = 1;
    return;
  }

  const isRb = mode === "reviewboard";

  if (isRb) {
    printEmptyLine();
    printWarning(
      "Review Board integration is in early preview. Please report any issues you encounter."
    );
  } else {
    printEmptyLine();
    printInfo(
      "GitLab mode selected. This will set up the webhook secret and optional SSL configuration for the 'cr serve' command."
    );
  }

  const prompts = [];

  if (isRb) {
    prompts.push(
      {
        type: "text",
        name: "rbUrl",
        message: "Review Board URL",
        initial: existing.rbUrl ?? defaultConfig.rbUrl,
      },
      {
        type: "password",
        name: "rbToken",
        message: "Review Board API Token",
        initial: existing.rbToken ?? "",
      }
    );
  } else {
    
    prompts.push(
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
      {
        type: "password",
        name: "gitlabWebhookSecret",
        message: "GitLab Webhook Secret (X-Gitlab-Token)",
        initial: existing.gitlabWebhookSecret ?? "",
      });
  }

  prompts.push(
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
    }
  );

  const answers = await promptWithFrame(prompts as any, { onCancel: () => true });

  if (answers.webhookConcurrency === undefined) {
    printWarning("Webhook initialization cancelled.");
    return;
  }

  await saveCRConfig({
    ...existing,
    ...(isRb
      ? { 
          rbUrl: answers.rbUrl || undefined, 
          rbToken: answers.rbToken || undefined 
        }
      : { 
          gitlabUrl: answers.gitlabUrl || existing.gitlabUrl || defaultConfig.gitlabUrl,
          gitlabKey: answers.gitlabKey || existing.gitlabKey || "",
          gitlabWebhookSecret: answers.gitlabWebhookSecret || undefined 
        }),
    sslCertPath: answers.sslCertPath || undefined,
    sslKeyPath: answers.sslKeyPath || undefined,
    sslCaPath: answers.sslCaPath || undefined,
    webhookConcurrency: answers.webhookConcurrency,
    webhookQueueLimit: answers.webhookQueueLimit,
    webhookJobTimeoutMs: answers.webhookJobTimeoutMs,
  } as any);

  printDivider();
  printSuccess(`Webhook configuration updated in ${CR_CONF_PATH}`);
  printDivider();
}

async function runGitLabSetup(args: string[] = []): Promise<void> {
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
    ...existing,
    openaiApiUrl: answers.openaiApiUrl,
    openaiApiKey: answers.openaiApiKey ?? "",
    openaiModel: answers.openaiModel,
    useCustomStreaming: answers.useCustomStreaming ?? false,
    gitlabUrl: answers.gitlabUrl,
    gitlabKey: answers.gitlabKey ?? "",
  } as any);

  printDivider();
  printSuccess(`Configuration saved to ${CR_CONF_PATH}`);
}

async function runRbSetup(args: string[] = []): Promise<void> {
  const existing = await loadCRConfig();

  createSpinner("Loading settings...")
    .start()
    .stopAndPersist({
      symbol: COLORS.cyan + DOT + COLORS.reset,
      text: "Initialize Review Board configuration",
    });

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
        name: "rbUrl",
        message: "Review Board URL",
        initial: existing.rbUrl ?? defaultConfig.rbUrl,
      },
      {
        type: "password",
        name: "rbToken",
        message: "Review Board API Token",
        initial: existing.rbToken ?? "",
      },
    ],
    { onCancel: () => true }
  );

  if (!answers.rbUrl || !answers.openaiApiUrl) {
    printWarning("Review Board initialization cancelled.");
    return;
  }

  await saveCRConfig({
    ...existing,
    rbUrl: answers.rbUrl,
    rbToken: answers.rbToken ?? "",
    openaiApiUrl: answers.openaiApiUrl,
    openaiApiKey: answers.openaiApiKey ?? "",
  } as any);

  printDivider();
  printSuccess(`Review Board configuration updated in ${CR_CONF_PATH}`);
  printDivider();
}
