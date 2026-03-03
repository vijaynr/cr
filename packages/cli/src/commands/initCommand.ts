import { initializeCRHome } from "@cr/core";
import { loadCRConfig, saveCRConfig } from "@cr/core";
import { CR_CONF_PATH, repoRootFromModule } from "@cr/core";
import { printError, printSuccess, printWarning, createSpinner, printDivider } from "@cr/ui";
import { promptWithFrame } from "@cr/ui";
import { defaultConfig } from "@cr/core";
import { COLORS, DOT } from "@cr/ui";

export async function runInitCommand(): Promise<void> {
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
