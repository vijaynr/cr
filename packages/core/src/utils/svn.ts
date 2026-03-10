import { logger } from "./logger.js";

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, "");
}

function assertHttpUrl(url: string): void {
  if (!/^https?:\/\//i.test(url)) {
    throw new Error("SVN guideline fetch only supports HTTP(S) URLs in Phase 1.");
  }
}

function buildAuthHeaders(username?: string, password?: string): HeadersInit {
  if (!username) {
    return {};
  }

  const encoded = Buffer.from(`${username}:${password ?? ""}`, "utf-8").toString("base64");
  return {
    Authorization: `Basic ${encoded}`,
  };
}

export async function svnGetFile(
  url: string,
  auth?: { username?: string; password?: string }
): Promise<string | null> {
  assertHttpUrl(url);
  logger.debug("svn", `GET ${url}`);

  const response = await fetch(url, {
    headers: {
      ...buildAuthHeaders(auth?.username, auth?.password),
    },
  });

  if (response.status === 404) {
    logger.trace("svn", `GET ${url} -> 404`);
    return null;
  }

  if (!response.ok) {
    const body = await response.text();
    logger.error("svn", `GET ${url} -> ${response.status}`, { body });
    throw new Error(`SVN HTTP ${response.status}: ${body}`);
  }

  logger.trace("svn", `GET ${url} -> ${response.status}`);
  return response.text();
}

export function resolveSvnFileUrl(baseUrl: string, filePath: string): string {
  assertHttpUrl(baseUrl);
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
  const trimmedFilePath = filePath.replace(/^\/+/, "");
  return `${normalizedBaseUrl}/${trimmedFilePath}`;
}
