import { createGitLabClient, type GitLabClient } from "../clients/gitlabClient.js";
import { createLlmClient, type LlmClient } from "../clients/llmClient.js";
import { createReviewBoardClient, type ReviewBoardClient } from "../clients/reviewBoardClient.js";
import { envOrConfig, loadCRConfig } from "./config.js";
import { logger } from "./logger.js";

export type WorkflowRuntime = {
  gitlabUrl: string;
  gitlabKey: string;
  rbUrl: string;
  rbToken: string;
  gitlabWebhookSecret?: string;
  sslCertPath?: string;
  sslKeyPath?: string;
  sslCaPath?: string;
  webhookConcurrency: number;
  webhookQueueLimit: number;
  webhookJobTimeoutMs: number;
  openaiApiUrl: string;
  openaiApiKey: string;
  openaiModel: string;
  useCustomStreaming: boolean;
};

export async function loadWorkflowRuntime(): Promise<WorkflowRuntime> {
  const config = await loadCRConfig();

  // Parse boolean from environment variable
  const envCustomStreaming = process.env.USE_CUSTOM_STREAMING;
  const useCustomStreaming =
    envCustomStreaming !== undefined
      ? envCustomStreaming.toLowerCase() === "true"
      : (config.useCustomStreaming ?? false);

  const runtime: WorkflowRuntime = {
    gitlabUrl: envOrConfig("GITLAB_URL", config.gitlabUrl, ""),
    gitlabKey: envOrConfig("GITLAB_KEY", config.gitlabKey, ""),
    rbUrl: envOrConfig("RB_URL", config.rbUrl, ""),
    rbToken: envOrConfig("RB_TOKEN", config.rbToken, ""),
    gitlabWebhookSecret: envOrConfig("GITLAB_WEBHOOK_SECRET", config.gitlabWebhookSecret, ""),
    sslCertPath: envOrConfig("SSL_CERT_PATH", config.sslCertPath, ""),
    sslKeyPath: envOrConfig("SSL_KEY_PATH", config.sslKeyPath, ""),
    sslCaPath: envOrConfig("SSL_CA_PATH", config.sslCaPath, ""),
    webhookConcurrency: Number.parseInt(
      envOrConfig("WEBHOOK_CONCURRENCY", config.webhookConcurrency?.toString(), "3"),
      10
    ),
    webhookQueueLimit: Number.parseInt(
      envOrConfig("WEBHOOK_QUEUE_LIMIT", config.webhookQueueLimit?.toString(), "50"),
      10
    ),
    webhookJobTimeoutMs: Number.parseInt(
      envOrConfig("WEBHOOK_JOB_TIMEOUT_MS", config.webhookJobTimeoutMs?.toString(), "600000"),
      10
    ), // 10 mins default
    openaiApiUrl: envOrConfig("OPENAI_API_URL", config.openaiApiUrl, ""),
    openaiApiKey: envOrConfig("OPENAI_API_KEY", config.openaiApiKey, ""),
    openaiModel: envOrConfig("OPENAI_MODEL", config.openaiModel, "gpt-4o"),
    useCustomStreaming,
  };

  logger.debug("runtime", "workflow runtime loaded", {
    gitlabUrl: runtime.gitlabUrl,
    gitlabKey: runtime.gitlabKey ? "***" : "(not set)",
    rbUrl: runtime.rbUrl,
    rbToken: runtime.rbToken ? "***" : "(not set)",
    openaiApiUrl: runtime.openaiApiUrl,
    openaiApiKey: runtime.openaiApiKey ? "***" : "(not set)",
    openaiModel: runtime.openaiModel,
    useCustomStreaming: runtime.useCustomStreaming,
  });

  return runtime;
}

export function createRuntimeLlmClient(runtime: WorkflowRuntime): LlmClient {
  return createLlmClient({
    apiKey: runtime.openaiApiKey,
    apiUrl: runtime.openaiApiUrl,
    model: runtime.openaiModel,
    useCustomStreaming: runtime.useCustomStreaming,
  });
}

export function createRuntimeGitLabClient(runtime: WorkflowRuntime): GitLabClient {
  return createGitLabClient(runtime.gitlabUrl, runtime.gitlabKey);
}

export function createRuntimeReviewBoardClient(runtime: WorkflowRuntime): ReviewBoardClient {
  return createReviewBoardClient(runtime.rbUrl, runtime.rbToken);
}
