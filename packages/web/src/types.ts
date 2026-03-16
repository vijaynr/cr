export type ProviderId = "gitlab" | "github" | "reviewboard";

export type DashboardRequest = {
  id: number | string;
  title: string;
  url: string;
  state?: string;
  draft?: boolean;
  author?: string;
  sourceBranch?: string;
  targetBranch?: string;
  repository?: string;
  updatedAt?: string;
};

export type ProviderDashboard = {
  configured: boolean;
  repository?: string;
  error?: string;
  items: DashboardRequest[];
};

export type DashboardData = {
  generatedAt?: string;
  repository: {
    cwd: string;
    remoteUrl?: string;
  };
  config: {
    openai: {
      model?: string;
      apiUrl?: string;
    };
    defaultReviewAgents: string[];
    webhook: {
      concurrency: number;
      queueLimit: number;
    };
  };
  providers: Record<ProviderId, ProviderDashboard>;
};

export const providerOrder: ProviderId[] = ["gitlab", "github", "reviewboard"];
