import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { logger } from "./logger.js";

const execFileAsync = promisify(execFile);

async function git(args: string[], repoPath: string): Promise<string> {
  const cwd = path.resolve(repoPath);
  logger.debug("git", `run: git ${args.join(" ")}`, { cwd });
  try {
    const { stdout } = await execFileAsync("git", args, { cwd });
    const result = stdout.trim();
    logger.trace("git", `result: ${result.slice(0, 200)}`);
    return result;
  } catch (err) {
    logger.error("git", `failed: git ${args.join(" ")}`, err instanceof Error ? err : new Error(String(err)));
    throw err;
  }
}

export async function getCurrentBranch(repoPath: string): Promise<string> {
  const branch = await git(["rev-parse", "--abbrev-ref", "HEAD"], repoPath);
  if (!branch || branch === "HEAD") {
    throw new Error("Could not determine current branch from repository.");
  }
  logger.debug("git", `current branch: ${branch}`);
  return branch;
}

export async function getOriginRemoteUrl(repoPath: string): Promise<string> {
  const url = await git(["remote", "get-url", "origin"], repoPath);
  if (!url) {
    throw new Error("Remote 'origin' not found.");
  }
  logger.debug("git", `origin remote url: ${url}`);
  return url;
}
