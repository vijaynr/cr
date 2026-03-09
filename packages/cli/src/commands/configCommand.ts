import { loadCRConfig, saveCRConfig, CR_CONF_PATH } from "@cr/core";
import { printSuccess, printWarning, printDivider, promptWithFrame, createSpinner } from "@cr/ui";
import { defaultConfig } from "@cr/core";
import { COLORS, DOT } from "@cr/ui";

export async function runConfigCommand(): Promise<void> {
  createSpinner("Loading settings...").start().stopAndPersist({
    symbol: COLORS.cyan + DOT + COLORS.reset,
    text: "View and edit the configuration",
  });

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

  // If critical fields are missing, assume cancel (or at least don't save broken config)
  if (!answers.openaiApiUrl || !answers.openaiModel || !answers.gitlabUrl) {
    printWarning("Configuration update cancelled.");
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
    rbUrl: answers.rbUrl || undefined,
    rbToken: answers.rbToken || undefined,
    gitlabWebhookSecret: answers.gitlabWebhookSecret || undefined,
    sslCertPath: answers.sslCertPath || undefined,
    sslKeyPath: answers.sslKeyPath || undefined,
    sslCaPath: answers.sslCaPath || undefined,
    webhookConcurrency: answers.webhookConcurrency,
    webhookQueueLimit: answers.webhookQueueLimit,
    webhookJobTimeoutMs: answers.webhookJobTimeoutMs,
  });

  printDivider();
  printSuccess(`Configuration updated in ${CR_CONF_PATH}`);
  printDivider();
}
