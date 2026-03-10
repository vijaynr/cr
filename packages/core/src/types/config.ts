export type CRConfig = {
  openaiApiUrl: string;
  openaiApiKey: string;
  openaiModel: string;
  useCustomStreaming: boolean; // Use custom SSE streaming instead of standard OpenAI SDK
  gitlabUrl: string;
  gitlabKey: string;
  svnRepositoryUrl?: string;
  svnUsername?: string;
  svnPassword?: string;
  rbUrl?: string;
  rbToken?: string;
  gitlabWebhookSecret?: string;
  rbWebhookSecret?: string;
  sslCertPath?: string;
  sslKeyPath?: string;
  sslCaPath?: string;
  webhookConcurrency?: number;
  webhookQueueLimit?: number;
  webhookJobTimeoutMs?: number;
  terminalTheme?: "auto" | "dark" | "light"; // Optional theme override
};

export const defaultConfig: Pick<CRConfig, "openaiApiUrl" | "openaiModel" | "gitlabUrl" | "rbUrl"> =
  {
    openaiApiUrl: "https://model-broker.aviator-model.bp.anthos.otxlab.net/v1",
    openaiModel: "llama-3.3-70b",
    gitlabUrl: "https://gitlab.otxlab.net",
    rbUrl: "https://reviews.otxlab.net",
  };

