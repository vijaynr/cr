import { Hono } from "hono";
import {
  addDiffComment,
  addGitHubInlinePullRequestComment,
  addGitHubPullRequestComment,
  addInlineMergeRequestComment,
  addMergeRequestComment,
  createReview,
  createReviewRequest,
  defaultConfig,
  getFileDiffData,
  getFileDiffs,
  getGitHubPullRequest,
  getGitHubPullRequestCommits,
  getGitHubPullRequestFiles,
  getLatestDiffSet,
  getMergeRequest,
  getMergeRequestChanges,
  getMergeRequestCommits,
  getOriginRemoteUrl,
  getReviewRequest,
  listGitHubPullRequests,
  listMergeRequests,
  listRepositories,
  listReviewRequests,
  loadCRConfig,
  publishReview,
  publishReviewRequest,
  remoteToGitHubRepoPath,
  remoteToProjectPath,
  saveCRConfig,
  updateReviewRequestDraft,
  uploadReviewRequestDiff,
} from "@cr/core";
import type { CRConfig } from "@cr/core";
import type { ServerContext } from "../types.js";

const API_PREFIX = "/api";

type ProviderName = "gitlab" | "github" | "reviewboard";

function getBaseConfig(existing: Partial<CRConfig>): CRConfig {
  return {
    openaiApiUrl: existing.openaiApiUrl || defaultConfig.openaiApiUrl,
    openaiApiKey: existing.openaiApiKey || "",
    openaiModel: existing.openaiModel || defaultConfig.openaiModel,
    useCustomStreaming: existing.useCustomStreaming ?? false,
    defaultReviewAgents: existing.defaultReviewAgents,
    gitlabUrl: existing.gitlabUrl || defaultConfig.gitlabUrl,
    gitlabKey: existing.gitlabKey || "",
    githubToken: existing.githubToken,
    svnRepositoryUrl: existing.svnRepositoryUrl,
    svnUsername: existing.svnUsername,
    svnPassword: existing.svnPassword,
    rbUrl: existing.rbUrl || defaultConfig.rbUrl,
    rbToken: existing.rbToken,
    gitlabWebhookSecret: existing.gitlabWebhookSecret,
    githubWebhookSecret: existing.githubWebhookSecret,
    rbWebhookSecret: existing.rbWebhookSecret,
    sslCertPath: existing.sslCertPath,
    sslKeyPath: existing.sslKeyPath,
    sslCaPath: existing.sslCaPath,
    webhookConcurrency: existing.webhookConcurrency,
    webhookQueueLimit: existing.webhookQueueLimit,
    webhookJobTimeoutMs: existing.webhookJobTimeoutMs,
    terminalTheme: existing.terminalTheme,
  };
}

async function resolveGitLabProjectPath(repoPath: string, explicit?: string): Promise<string> {
  if (explicit) {
    return explicit;
  }

  const remoteUrl = await getOriginRemoteUrl(repoPath);
  if (!remoteUrl) {
    throw new Error("Could not infer GitLab project path from the current repository.");
  }

  return remoteToProjectPath(remoteUrl);
}

async function resolveGitHubRepoPath(repoPath: string, explicit?: string): Promise<string> {
  if (explicit) {
    return explicit;
  }

  const remoteUrl = await getOriginRemoteUrl(repoPath);
  if (!remoteUrl) {
    throw new Error("Could not infer GitHub repository path from the current repository.");
  }

  return remoteToGitHubRepoPath(remoteUrl);
}

async function requireGitLabConfig() {
  const config = await loadCRConfig();
  if (!config.gitlabUrl || !config.gitlabKey) {
    throw new Error("Missing GitLab configuration.");
  }
  return { config, baseUrl: config.gitlabUrl, token: config.gitlabKey };
}

async function requireGitHubConfig() {
  const config = await loadCRConfig();
  if (!config.githubToken) {
    throw new Error("Missing GitHub configuration.");
  }
  return { config, token: config.githubToken };
}

async function requireReviewBoardConfig() {
  const config = await loadCRConfig();
  if (!config.rbUrl || !config.rbToken) {
    throw new Error("Missing Review Board configuration.");
  }
  return { config, baseUrl: config.rbUrl, token: config.rbToken };
}

function badRequest(message: string): Response {
  return Response.json({ status: "error", message }, { status: 400 });
}

function serverError(message: string): Response {
  return Response.json({ status: "error", message }, { status: 500 });
}

function parseInteger(value: string | undefined, name: string): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid ${name}.`);
  }
  return parsed;
}

const operations = [
  {
    group: "config",
    operations: [
      { method: "GET", path: "/api/config", description: "Read persisted CR configuration." },
      { method: "PUT", path: "/api/config", description: "Update persisted CR configuration." },
    ],
  },
  {
    group: "gitlab",
    operations: [
      { method: "GET", path: "/api/gitlab/merge-requests", description: "List merge requests." },
      {
        method: "GET",
        path: "/api/gitlab/merge-requests/:iid",
        description: "Get merge request details.",
      },
      {
        method: "GET",
        path: "/api/gitlab/merge-requests/:iid/diffs",
        description: "Get merge request diffs.",
      },
      {
        method: "GET",
        path: "/api/gitlab/merge-requests/:iid/commits",
        description: "Get merge request commits.",
      },
      {
        method: "POST",
        path: "/api/gitlab/merge-requests/:iid/comments",
        description: "Add a merge request comment.",
      },
      {
        method: "POST",
        path: "/api/gitlab/merge-requests/:iid/inline-comments",
        description: "Add an inline merge request comment.",
      },
    ],
  },
  {
    group: "github",
    operations: [
      { method: "GET", path: "/api/github/pull-requests", description: "List pull requests." },
      {
        method: "GET",
        path: "/api/github/pull-requests/:number",
        description: "Get pull request details.",
      },
      {
        method: "GET",
        path: "/api/github/pull-requests/:number/diffs",
        description: "Get pull request changed files.",
      },
      {
        method: "GET",
        path: "/api/github/pull-requests/:number/commits",
        description: "Get pull request commits.",
      },
      {
        method: "POST",
        path: "/api/github/pull-requests/:number/comments",
        description: "Add a pull request comment.",
      },
      {
        method: "POST",
        path: "/api/github/pull-requests/:number/inline-comments",
        description: "Add an inline pull request comment.",
      },
    ],
  },
  {
    group: "reviewboard",
    operations: [
      { method: "GET", path: "/api/reviewboard/repositories", description: "List repositories." },
      {
        method: "GET",
        path: "/api/reviewboard/review-requests",
        description: "List review requests.",
      },
      {
        method: "GET",
        path: "/api/reviewboard/review-requests/:id",
        description: "Get review request details.",
      },
      {
        method: "GET",
        path: "/api/reviewboard/review-requests/:id/diffs",
        description: "Get latest or specific diffset and file diffs.",
      },
      {
        method: "GET",
        path: "/api/reviewboard/review-requests/:id/diffs/:diffSetId/files/:fileDiffId",
        description: "Get file diff data.",
      },
      {
        method: "POST",
        path: "/api/reviewboard/review-requests",
        description: "Create a review request.",
      },
      {
        method: "PUT",
        path: "/api/reviewboard/review-requests/:id",
        description: "Update a review request draft.",
      },
      {
        method: "POST",
        path: "/api/reviewboard/review-requests/:id/diffs",
        description: "Upload a diff to a review request.",
      },
      {
        method: "POST",
        path: "/api/reviewboard/review-requests/:id/publish",
        description: "Publish a review request draft.",
      },
      {
        method: "POST",
        path: "/api/reviewboard/review-requests/:id/reviews",
        description: "Create a review.",
      },
      {
        method: "POST",
        path: "/api/reviewboard/review-requests/:id/reviews/:reviewId/diff-comments",
        description: "Add a diff comment to a review.",
      },
      {
        method: "POST",
        path: "/api/reviewboard/review-requests/:id/reviews/:reviewId/publish",
        description: "Publish a review.",
      },
    ],
  },
];

export function createApiRoutes(context: ServerContext): Hono {
  const app = new Hono();

  app.get(`${API_PREFIX}/operations`, (c) =>
    c.json({
      groups: operations,
      repoPath: context.repoPath,
    })
  );

  app.get(`${API_PREFIX}/config`, async (c) => {
    const config = await loadCRConfig();
    return c.json(config);
  });

  app.put(`${API_PREFIX}/config`, async (c) => {
    const body = (await c.req.json()) as Partial<CRConfig>;
    const existing = await loadCRConfig();
    const nextConfig = {
      ...getBaseConfig(existing),
      ...body,
    };
    await saveCRConfig(nextConfig);
    return c.json(nextConfig);
  });

  app.get(`${API_PREFIX}/gitlab/merge-requests`, async (c) => {
    try {
      const { baseUrl, token } = await requireGitLabConfig();
      const projectPath = await resolveGitLabProjectPath(
        context.repoPath,
        c.req.query("projectPath") ?? undefined
      );
      const state = (c.req.query("state") as "opened" | "closed" | "merged" | "all") || "opened";
      return c.json(await listMergeRequests(baseUrl, token, projectPath, state));
    } catch (error) {
      return serverError(error instanceof Error ? error.message : String(error));
    }
  });

  app.get(`${API_PREFIX}/gitlab/merge-requests/:iid`, async (c) => {
    try {
      const { baseUrl, token } = await requireGitLabConfig();
      const projectPath = await resolveGitLabProjectPath(
        context.repoPath,
        c.req.query("projectPath") ?? undefined
      );
      const iid = parseInteger(c.req.param("iid"), "merge request iid");
      return c.json(await getMergeRequest(baseUrl, token, projectPath, iid));
    } catch (error) {
      return serverError(error instanceof Error ? error.message : String(error));
    }
  });

  app.get(`${API_PREFIX}/gitlab/merge-requests/:iid/diffs`, async (c) => {
    try {
      const { baseUrl, token } = await requireGitLabConfig();
      const projectPath = await resolveGitLabProjectPath(
        context.repoPath,
        c.req.query("projectPath") ?? undefined
      );
      const iid = parseInteger(c.req.param("iid"), "merge request iid");
      return c.json(await getMergeRequestChanges(baseUrl, token, projectPath, iid));
    } catch (error) {
      return serverError(error instanceof Error ? error.message : String(error));
    }
  });

  app.get(`${API_PREFIX}/gitlab/merge-requests/:iid/commits`, async (c) => {
    try {
      const { baseUrl, token } = await requireGitLabConfig();
      const projectPath = await resolveGitLabProjectPath(
        context.repoPath,
        c.req.query("projectPath") ?? undefined
      );
      const iid = parseInteger(c.req.param("iid"), "merge request iid");
      return c.json(await getMergeRequestCommits(baseUrl, token, projectPath, iid));
    } catch (error) {
      return serverError(error instanceof Error ? error.message : String(error));
    }
  });

  app.post(`${API_PREFIX}/gitlab/merge-requests/:iid/comments`, async (c) => {
    try {
      const body = (await c.req.json()) as { projectPath?: string; body?: string };
      if (!body.body) {
        return badRequest("Missing comment body.");
      }
      const { baseUrl, token } = await requireGitLabConfig();
      const projectPath = await resolveGitLabProjectPath(context.repoPath, body.projectPath);
      const iid = parseInteger(c.req.param("iid"), "merge request iid");
      const url = await addMergeRequestComment(baseUrl, token, projectPath, iid, body.body);
      return c.json({ url });
    } catch (error) {
      return serverError(error instanceof Error ? error.message : String(error));
    }
  });

  app.post(`${API_PREFIX}/gitlab/merge-requests/:iid/inline-comments`, async (c) => {
    try {
      const body = (await c.req.json()) as {
        projectPath?: string;
        body?: string;
        filePath?: string;
        line?: number;
        positionType?: "new" | "old";
      };
      if (!body.body || !body.filePath || body.line === undefined) {
        return badRequest("Missing inline comment body, filePath, or line.");
      }
      const { baseUrl, token } = await requireGitLabConfig();
      const projectPath = await resolveGitLabProjectPath(context.repoPath, body.projectPath);
      const iid = parseInteger(c.req.param("iid"), "merge request iid");
      const url = await addInlineMergeRequestComment(
        baseUrl,
        token,
        projectPath,
        iid,
        body.body,
        body.filePath,
        body.line,
        body.positionType ?? "new"
      );
      return c.json({ url });
    } catch (error) {
      return serverError(error instanceof Error ? error.message : String(error));
    }
  });

  app.get(`${API_PREFIX}/github/pull-requests`, async (c) => {
    try {
      const { token } = await requireGitHubConfig();
      const repoPath = await resolveGitHubRepoPath(
        context.repoPath,
        c.req.query("repoPath") ?? undefined
      );
      const state = (c.req.query("state") as "open" | "closed" | "all") || "open";
      return c.json(await listGitHubPullRequests(token, repoPath, state));
    } catch (error) {
      return serverError(error instanceof Error ? error.message : String(error));
    }
  });

  app.get(`${API_PREFIX}/github/pull-requests/:number`, async (c) => {
    try {
      const { token } = await requireGitHubConfig();
      const repoPath = await resolveGitHubRepoPath(
        context.repoPath,
        c.req.query("repoPath") ?? undefined
      );
      const prNumber = parseInteger(c.req.param("number"), "pull request number");
      return c.json(await getGitHubPullRequest(token, repoPath, prNumber));
    } catch (error) {
      return serverError(error instanceof Error ? error.message : String(error));
    }
  });

  app.get(`${API_PREFIX}/github/pull-requests/:number/diffs`, async (c) => {
    try {
      const { token } = await requireGitHubConfig();
      const repoPath = await resolveGitHubRepoPath(
        context.repoPath,
        c.req.query("repoPath") ?? undefined
      );
      const prNumber = parseInteger(c.req.param("number"), "pull request number");
      return c.json(await getGitHubPullRequestFiles(token, repoPath, prNumber));
    } catch (error) {
      return serverError(error instanceof Error ? error.message : String(error));
    }
  });

  app.get(`${API_PREFIX}/github/pull-requests/:number/commits`, async (c) => {
    try {
      const { token } = await requireGitHubConfig();
      const repoPath = await resolveGitHubRepoPath(
        context.repoPath,
        c.req.query("repoPath") ?? undefined
      );
      const prNumber = parseInteger(c.req.param("number"), "pull request number");
      return c.json(await getGitHubPullRequestCommits(token, repoPath, prNumber));
    } catch (error) {
      return serverError(error instanceof Error ? error.message : String(error));
    }
  });

  app.post(`${API_PREFIX}/github/pull-requests/:number/comments`, async (c) => {
    try {
      const body = (await c.req.json()) as { repoPath?: string; body?: string };
      if (!body.body) {
        return badRequest("Missing comment body.");
      }
      const { token } = await requireGitHubConfig();
      const repoPath = await resolveGitHubRepoPath(context.repoPath, body.repoPath);
      const prNumber = parseInteger(c.req.param("number"), "pull request number");
      const url = await addGitHubPullRequestComment(token, repoPath, prNumber, body.body);
      return c.json({ url });
    } catch (error) {
      return serverError(error instanceof Error ? error.message : String(error));
    }
  });

  app.post(`${API_PREFIX}/github/pull-requests/:number/inline-comments`, async (c) => {
    try {
      const body = (await c.req.json()) as {
        repoPath?: string;
        body?: string;
        filePath?: string;
        line?: number;
        side?: "LEFT" | "RIGHT";
      };
      if (!body.body || !body.filePath || body.line === undefined) {
        return badRequest("Missing inline comment body, filePath, or line.");
      }
      const { token } = await requireGitHubConfig();
      const repoPath = await resolveGitHubRepoPath(context.repoPath, body.repoPath);
      const prNumber = parseInteger(c.req.param("number"), "pull request number");
      const url = await addGitHubInlinePullRequestComment(
        token,
        repoPath,
        prNumber,
        body.body,
        body.filePath,
        body.line,
        body.side ?? "RIGHT"
      );
      return c.json({ url });
    } catch (error) {
      return serverError(error instanceof Error ? error.message : String(error));
    }
  });

  app.get(`${API_PREFIX}/reviewboard/repositories`, async (c) => {
    try {
      const { baseUrl, token } = await requireReviewBoardConfig();
      return c.json(await listRepositories(baseUrl, token));
    } catch (error) {
      return serverError(error instanceof Error ? error.message : String(error));
    }
  });

  app.get(`${API_PREFIX}/reviewboard/review-requests`, async (c) => {
    try {
      const { baseUrl, token } = await requireReviewBoardConfig();
      const status = (c.req.query("status") as "pending" | "submitted" | "all") || "pending";
      const fromUser = c.req.query("fromUser") ?? undefined;
      return c.json(await listReviewRequests(baseUrl, token, status, fromUser));
    } catch (error) {
      return serverError(error instanceof Error ? error.message : String(error));
    }
  });

  app.get(`${API_PREFIX}/reviewboard/review-requests/:id`, async (c) => {
    try {
      const { baseUrl, token } = await requireReviewBoardConfig();
      const requestId = parseInteger(c.req.param("id"), "review request id");
      return c.json(await getReviewRequest(baseUrl, token, requestId));
    } catch (error) {
      return serverError(error instanceof Error ? error.message : String(error));
    }
  });

  app.get(`${API_PREFIX}/reviewboard/review-requests/:id/diffs`, async (c) => {
    try {
      const { baseUrl, token } = await requireReviewBoardConfig();
      const requestId = parseInteger(c.req.param("id"), "review request id");
      const explicitDiffSetId = c.req.query("diffSetId");
      const latestDiffSet =
        explicitDiffSetId === undefined
          ? await getLatestDiffSet(baseUrl, token, requestId)
          : { id: parseInteger(explicitDiffSetId, "diff set id") };

      if (!latestDiffSet) {
        return c.json({ diffSet: null, files: [] });
      }

      return c.json({
        diffSet: latestDiffSet,
        files: await getFileDiffs(baseUrl, token, requestId, latestDiffSet.id),
      });
    } catch (error) {
      return serverError(error instanceof Error ? error.message : String(error));
    }
  });

  app.get(
    `${API_PREFIX}/reviewboard/review-requests/:id/diffs/:diffSetId/files/:fileDiffId`,
    async (c) => {
      try {
        const { baseUrl, token } = await requireReviewBoardConfig();
        const requestId = parseInteger(c.req.param("id"), "review request id");
        const diffSetId = parseInteger(c.req.param("diffSetId"), "diff set id");
        const fileDiffId = parseInteger(c.req.param("fileDiffId"), "file diff id");
        return c.json(await getFileDiffData(baseUrl, token, requestId, diffSetId, fileDiffId));
      } catch (error) {
        return serverError(error instanceof Error ? error.message : String(error));
      }
    }
  );

  app.post(`${API_PREFIX}/reviewboard/review-requests`, async (c) => {
    try {
      const body = (await c.req.json()) as { repositoryId?: number };
      if (body.repositoryId === undefined) {
        return badRequest("Missing repositoryId.");
      }
      const { baseUrl, token } = await requireReviewBoardConfig();
      return c.json(await createReviewRequest(baseUrl, token, body.repositoryId));
    } catch (error) {
      return serverError(error instanceof Error ? error.message : String(error));
    }
  });

  app.put(`${API_PREFIX}/reviewboard/review-requests/:id`, async (c) => {
    try {
      const body = (await c.req.json()) as { summary?: string; description?: string };
      const { baseUrl, token } = await requireReviewBoardConfig();
      const requestId = parseInteger(c.req.param("id"), "review request id");
      return c.json(await updateReviewRequestDraft(baseUrl, token, requestId, body));
    } catch (error) {
      return serverError(error instanceof Error ? error.message : String(error));
    }
  });

  app.post(`${API_PREFIX}/reviewboard/review-requests/:id/diffs`, async (c) => {
    try {
      const body = (await c.req.json()) as { diff?: string; basedir?: string };
      if (!body.diff) {
        return badRequest("Missing diff.");
      }
      const { baseUrl, token } = await requireReviewBoardConfig();
      const requestId = parseInteger(c.req.param("id"), "review request id");
      return c.json(
        await uploadReviewRequestDiff(baseUrl, token, requestId, body.diff, body.basedir)
      );
    } catch (error) {
      return serverError(error instanceof Error ? error.message : String(error));
    }
  });

  app.post(`${API_PREFIX}/reviewboard/review-requests/:id/publish`, async (c) => {
    try {
      const { baseUrl, token } = await requireReviewBoardConfig();
      const requestId = parseInteger(c.req.param("id"), "review request id");
      return c.json(await publishReviewRequest(baseUrl, token, requestId));
    } catch (error) {
      return serverError(error instanceof Error ? error.message : String(error));
    }
  });

  app.post(`${API_PREFIX}/reviewboard/review-requests/:id/reviews`, async (c) => {
    try {
      const body = (await c.req.json()) as { bodyTop?: string };
      if (body.bodyTop === undefined) {
        return badRequest("Missing bodyTop.");
      }
      const { baseUrl, token } = await requireReviewBoardConfig();
      const requestId = parseInteger(c.req.param("id"), "review request id");
      return c.json(await createReview(baseUrl, token, requestId, body.bodyTop));
    } catch (error) {
      return serverError(error instanceof Error ? error.message : String(error));
    }
  });

  app.post(
    `${API_PREFIX}/reviewboard/review-requests/:id/reviews/:reviewId/diff-comments`,
    async (c) => {
      try {
        const body = (await c.req.json()) as {
          fileDiffId?: number;
          firstLine?: number;
          numLines?: number;
          text?: string;
        };
        if (
          body.fileDiffId === undefined ||
          body.firstLine === undefined ||
          body.numLines === undefined ||
          !body.text
        ) {
          return badRequest("Missing fileDiffId, firstLine, numLines, or text.");
        }
        const { baseUrl, token } = await requireReviewBoardConfig();
        const requestId = parseInteger(c.req.param("id"), "review request id");
        const reviewId = parseInteger(c.req.param("reviewId"), "review id");
        await addDiffComment(
          baseUrl,
          token,
          requestId,
          reviewId,
          body.fileDiffId,
          body.firstLine,
          body.numLines,
          body.text
        );
        return c.json({ status: "ok" });
      } catch (error) {
        return serverError(error instanceof Error ? error.message : String(error));
      }
    }
  );

  app.post(`${API_PREFIX}/reviewboard/review-requests/:id/reviews/:reviewId/publish`, async (c) => {
    try {
      const { baseUrl, token } = await requireReviewBoardConfig();
      const requestId = parseInteger(c.req.param("id"), "review request id");
      const reviewId = parseInteger(c.req.param("reviewId"), "review id");
      await publishReview(baseUrl, token, requestId, reviewId);
      return c.json({ status: "ok" });
    } catch (error) {
      return serverError(error instanceof Error ? error.message : String(error));
    }
  });

  return app;
}
