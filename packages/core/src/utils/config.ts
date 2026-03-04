import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import { z } from "zod";
import { CR_CONF_PATH } from "./paths.js";
import type { CRConfig } from "../types/config.js";

const configSchema = z.object({
  openaiApiUrl: z.string(),
  openaiApiKey: z.string(),
  openaiModel: z.string(),
  useCustomStreaming: z.boolean(),
  gitlabUrl: z.string(),
  gitlabKey: z.string(),
  gitlabWebhookSecret: z.string().optional(),
  sslCertPath: z.string().optional(),
  sslKeyPath: z.string().optional(),
  sslCaPath: z.string().optional(),
  webhookConcurrency: z.number().int().min(1).optional(),
  webhookQueueLimit: z.number().int().min(1).optional(),
  webhookJobTimeoutMs: z.number().int().min(1000).optional(),
  terminalTheme: z.enum(["auto", "dark", "light"]).optional(),
});

const crSection = "cr";

/**
 * Generic INI file parser that extracts [section] and key=value pairs.
 */
function parseIni(content: string): Record<string, Record<string, string>> {
  const sections: Record<string, Record<string, string>> = {};
  let current = "";
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || line.startsWith(";")) {
      continue;
    }
    if (line.startsWith("[") && line.endsWith("]")) {
      current = line.slice(1, -1).trim();
      if (!sections[current]) {
        sections[current] = {};
      }
      continue;
    }
    const idx = line.indexOf("=");
    if (idx <= 0 || !current) {
      continue;
    }
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    sections[current] ??= {};
    sections[current][key] = value;
  }
  return sections;
}

/**
 * Converts an object structure to INI format with [section] headers.
 */
function toIni(data: Record<string, Record<string, string>>): string {
  return Object.entries(data)
    .map(([section, values]) => {
      const body = Object.entries(values)
        .map(([k, v]) => `${k} = ${v}`)
        .join("\n");
      return `[${section}]\n${body}`;
    })
    .join("\n\n")
    .concat("\n");
}

/**
 * Loads CR configuration from the standard config file.
 * Returns a partial config that can be combined with environment variables.
 */
export async function loadCRConfig(): Promise<Partial<CRConfig>> {
  if (!existsSync(CR_CONF_PATH)) {
    return {};
  }

  const raw = await fs.readFile(CR_CONF_PATH, "utf-8");
  const ini = parseIni(raw);
  const section = ini[crSection] ?? {};

  const parsed = {
    openaiApiUrl: section.openai_api_url ?? "",
    openaiApiKey: section.openai_api_key ?? "",
    openaiModel: section.openai_model ?? "",
    useCustomStreaming: (section.use_custom_streaming ?? "false").toLowerCase() === "true",
    gitlabUrl: section.gitlab_url ?? "",
    gitlabKey: section.gitlab_key ?? "",
    gitlabWebhookSecret: section.gitlab_webhook_secret ?? undefined,
    sslCertPath: section.ssl_cert_path ?? undefined,
    sslKeyPath: section.ssl_key_path ?? undefined,
    sslCaPath: section.ssl_ca_path ?? undefined,
    webhookConcurrency: section.webhook_concurrency ? Number.parseInt(section.webhook_concurrency, 10) : undefined,
    webhookQueueLimit: section.webhook_queue_limit ? Number.parseInt(section.webhook_queue_limit, 10) : undefined,
    webhookJobTimeoutMs: section.webhook_job_timeout_ms ? Number.parseInt(section.webhook_job_timeout_ms, 10) : undefined,
    terminalTheme: section.terminal_theme as "auto" | "dark" | "light" | undefined,
  };

  return configSchema.partial().parse(parsed);
}

/**
 * Saves CR configuration to the standard config file in INI format.
 */
export async function saveCRConfig(config: CRConfig): Promise<void> {
  const parsed = configSchema.parse(config);

  const output = toIni({
    [crSection]: {
      openai_api_url: parsed.openaiApiUrl,
      openai_api_key: parsed.openaiApiKey,
      openai_model: parsed.openaiModel,
      use_custom_streaming: parsed.useCustomStreaming ? "true" : "false",
      gitlab_url: parsed.gitlabUrl,
      gitlab_key: parsed.gitlabKey,
      ...(parsed.gitlabWebhookSecret && { gitlab_webhook_secret: parsed.gitlabWebhookSecret }),
      ...(parsed.sslCertPath && { ssl_cert_path: parsed.sslCertPath }),
      ...(parsed.sslKeyPath && { ssl_key_path: parsed.sslKeyPath }),
      ...(parsed.sslCaPath && { ssl_ca_path: parsed.sslCaPath }),
      ...(parsed.webhookConcurrency && { webhook_concurrency: String(parsed.webhookConcurrency) }),
      ...(parsed.webhookQueueLimit && { webhook_queue_limit: String(parsed.webhookQueueLimit) }),
      ...(parsed.webhookJobTimeoutMs && { webhook_job_timeout_ms: String(parsed.webhookJobTimeoutMs) }),
      ...(parsed.terminalTheme && { terminal_theme: parsed.terminalTheme }),
    },
  });

  await fs.writeFile(CR_CONF_PATH, output, "utf-8");
}

/**
 * Returns a value from environment or config with optional fallback.
 * Environment variables take precedence.
 */
export function envOrConfig(
  envKey: string,
  configValue: string | undefined,
  fallback = ""
): string {
  const envValue = process.env[envKey];
  if (envValue !== undefined && envValue !== "") {
    return envValue;
  }
  return configValue ?? fallback;
}
