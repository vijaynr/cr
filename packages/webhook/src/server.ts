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
  }
) {
  const runtime = await loadWorkflowRuntime();
  
  // Override runtime config with CLI options if provided
  if (options?.webhookConcurrency) runtime.webhookConcurrency = options.webhookConcurrency;
  if (options?.webhookQueueLimit) runtime.webhookQueueLimit = options.webhookQueueLimit;
  if (options?.webhookJobTimeoutMs) runtime.webhookJobTimeoutMs = options.webhookJobTimeoutMs;

  const gitlabKey = envOrConfig("GITLAB_KEY", runtime.gitlabKey, "");
  const webhookSecret = envOrConfig("GITLAB_WEBHOOK_SECRET", runtime.gitlabWebhookSecret, "");
  
  const sslCertPath = options?.sslCertPath || envOrConfig("SSL_CERT_PATH", runtime.sslCertPath, "");
  const sslKeyPath = options?.sslKeyPath || envOrConfig("SSL_KEY_PATH", runtime.sslKeyPath, "");
  const sslCaPath = options?.sslCaPath || envOrConfig("SSL_CA_PATH", runtime.sslCaPath, "");

  if (!runtime.gitlabUrl || !gitlabKey) {
    throw new Error("Missing GitLab configuration. Run `cr init` or set GITLAB_URL/GITLAB_KEY.");
  }

  const workQueue = new WorkQueue(runtime, gitlabKey);

  // Define the main handler logic
  const requestListener = async (req: IncomingMessage, res: ServerResponse) => {
    console.log(`[WEBHOOK] Incoming ${req.method} request to ${req.url}`);

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

    // Verify secret if set
    if (webhookSecret) {
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

        const event = JSON.parse(body);
        const objectKind = event.object_kind;

        if (objectKind !== "merge_request") {
          console.log(`[WEBHOOK] Ignored event: ${objectKind}`);
          res.statusCode = 200;
          res.end("Ignored non-merge-request event");
          return;
        }

        const mrAttributes = event.object_attributes;
        const action = mrAttributes?.action;

        // Trigger on open or update (new commits)
        if (action !== "open" && action !== "update" && action !== "reopen") {
          console.log(`[WEBHOOK] Ignored MR action: ${action}`);
          res.statusCode = 200;
          res.end(`Ignored merge request action: ${action}`);
          return;
        }

        // For "update" actions, check if commits were added
        if (action === "update" && !mrAttributes.oldrev) {
          console.log("[WEBHOOK] Ignored update without new commits (metadata only change)");
          res.statusCode = 200;
          res.end("Ignored update without new commits");
          return;
        }

        const projectId = event.project?.id;
        const mrIid = mrAttributes?.iid;

        if (!projectId || !mrIid) {
          console.error("[WEBHOOK] Bad Request: Missing project ID or MR IID");
          res.statusCode = 400;
          res.end("Missing project ID or MR IID");
          return;
        }

        const jobId = workQueue.enqueue(projectId, mrIid);

        if (!jobId) {
          console.error(`[WEBHOOK] Rejected: Queue is full`);
          res.statusCode = 503;
          res.end(JSON.stringify({ status: "error", message: "Queue at capacity" }));
          return;
        }

        console.log(`[WEBHOOK] Accepted MR !${mrIid} from project ${projectId}. Job ID: ${jobId}`);
        
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
