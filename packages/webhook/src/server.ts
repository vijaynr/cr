import { createServer as createHttpServer, type IncomingMessage, type ServerResponse } from "node:http";
import { createServer as createHttpsServer } from "node:https";
import { readFileSync } from "node:fs";
import { 
  loadWorkflowRuntime, 
  envOrConfig, 
  logger,
} from "@cr/core";
import { WorkQueue } from "./workQueue.js";

export async function startWebhookServer(
  port = 3000,
  options?: { 
    sslCertPath?: string; 
    sslKeyPath?: string; 
    sslCaPath?: string;
    webhookConcurrency?: number;
    webhookQueueLimit?: number;
    webhookJobTimeoutMs?: number;
    mode?: string;
  }
) {
  const runtime = await loadWorkflowRuntime();
  const mode = options?.mode || "gitlab";
  
  // Override runtime config with CLI options if provided
  if (options?.webhookConcurrency) runtime.webhookConcurrency = options.webhookConcurrency;
  if (options?.webhookQueueLimit) runtime.webhookQueueLimit = options.webhookQueueLimit;
  if (options?.webhookJobTimeoutMs) runtime.webhookJobTimeoutMs = options.webhookJobTimeoutMs;

  const gitlabKey = envOrConfig("GITLAB_KEY", runtime.gitlabKey, "");
  const rbToken = envOrConfig("RB_TOKEN", runtime.rbToken, "");
  const webhookSecret = envOrConfig("GITLAB_WEBHOOK_SECRET", runtime.gitlabWebhookSecret, "");
  
  const sslCertPath = options?.sslCertPath || envOrConfig("SSL_CERT_PATH", runtime.sslCertPath, "");
  const sslKeyPath = options?.sslKeyPath || envOrConfig("SSL_KEY_PATH", runtime.sslKeyPath, "");
  const sslCaPath = options?.sslCaPath || envOrConfig("SSL_CA_PATH", runtime.sslCaPath, "");

  if (mode === "gitlab" && (!runtime.gitlabUrl || !gitlabKey)) {
    throw new Error("Missing GitLab configuration. Run `cr init` or set GITLAB_URL/GITLAB_KEY.");
  }
  if (mode === "reviewboard" && (!runtime.rbUrl || !rbToken)) {
    throw new Error("Missing Review Board configuration. Run `cr init --rb` or set RB_URL/RB_TOKEN.");
  }

  const workQueue = new WorkQueue(runtime, mode === "reviewboard" ? rbToken : gitlabKey, mode);

  // Define the main handler logic
  const requestListener = async (req: IncomingMessage, res: ServerResponse) => {
    console.log(`[WEBHOOK] Incoming ${req.method} request to ${req.url} (Mode: ${mode})`);

    // Health check or Status
    if (req.url === "/status" && req.method === "GET") {
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(workQueue.getStatus()));
      return;
    }

    if (req.method !== "POST") {
      res.statusCode = 405;
      res.end("Method Not Allowed");
      return;
    }

    // Verify secret if set (only for GitLab for now)
    if (mode === "gitlab" && webhookSecret) {
      const token = req.headers["x-gitlab-token"];
      if (token !== webhookSecret) {
        console.error("[WEBHOOK] Forbidden: Invalid GitLab token received.");
        logger.warn("webhook", "Forbidden: Invalid GitLab token");
        res.statusCode = 403;
        res.end("Forbidden");
        return;
      }
    }

    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });

    req.on("end", async () => {
      try {
        if (!body) {
          res.statusCode = 400;
          res.end("Empty body");
          return;
        }

        let event: any;
        const contentType = req.headers["content-type"] || "";
        if (contentType.includes("application/x-www-form-urlencoded")) {
          const params = new URLSearchParams(body);
          const payload = params.get("payload");
          event = payload ? JSON.parse(payload) : {};
        } else {
          event = JSON.parse(body);
        }

        let requestId: number | undefined;
        let projectId: string | number | undefined;

        if (mode === "gitlab") {
          const objectKind = event.object_kind;
          if (objectKind !== "merge_request") {
            res.statusCode = 200;
            res.end("Ignored non-merge-request event");
            return;
          }
          const mrAttributes = event.object_attributes;
          const action = mrAttributes?.action;
          if (action !== "open" && action !== "update" && action !== "reopen") {
            res.statusCode = 200;
            res.end(`Ignored merge request action: ${action}`);
            return;
          }
          requestId = mrAttributes?.iid;
          projectId = event.project?.id;
        } else if (mode === "reviewboard") {
          // Review Board webhook payload structure
          // Event: review_request_published
          const rr = event.review_request;
          if (!rr) {
            res.statusCode = 200;
            res.end("Ignored non-review-request event");
            return;
          }
          requestId = rr.id;
          projectId = rr.repository?.name || "default";
        }

        if (!requestId) {
          console.error("[WEBHOOK] Bad Request: Missing request ID");
          res.statusCode = 400;
          res.end("Missing request ID");
          return;
        }

        const jobId = workQueue.enqueue(projectId || "default", requestId);

        if (!jobId) {
          console.error(`[WEBHOOK] Rejected: Queue is full`);
          res.statusCode = 503;
          res.end(JSON.stringify({ status: "error", message: "Queue at capacity" }));
          return;
        }

        console.log(`[WEBHOOK] Accepted ${mode === "gitlab" ? "MR !" : "RR #"} ${requestId} from project ${projectId}. Job ID: ${jobId}`);
        
        // Respond early with 202 Accepted
        res.statusCode = 202;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ 
          status: "accepted", 
          jobId,
          message: "Review queued for processing",
          ...workQueue.getStatus()
        }));
      } catch (err) {
        console.error("[WEBHOOK] Error parsing request body:", err);
        logger.error("webhook", "Error parsing webhook body", err);
        res.statusCode = 400;
        res.end("Invalid JSON");
      }
    });
  };

  let server;
  let protocol = "http";

  if (sslCertPath && sslKeyPath) {
    try {
      const options: any = {
        cert: readFileSync(sslCertPath),
        key: readFileSync(sslKeyPath),
      };
      if (sslCaPath) {
        options.ca = readFileSync(sslCaPath);
      }
      server = createHttpsServer(options, requestListener);
      protocol = "https";
    } catch (err) {
      logger.error("webhook", "Failed to load SSL certificates, falling back to HTTP", err);
      console.error(`[WEBHOOK] SSL Error: ${err instanceof Error ? err.message : String(err)}`);
      server = createHttpServer(requestListener);
    }
  } else {
    server = createHttpServer(requestListener);
  }

  server.listen(port, () => {
    logger.info("webhook", `Webhook server listening on port ${port} (${protocol})`);
    console.log(`[WEBHOOK] Server listening on port ${port} (${protocol})`);
    console.log(`[WEBHOOK] Endpoint: POST ${protocol}://localhost:${port}/`);
  });

  return server;
}
