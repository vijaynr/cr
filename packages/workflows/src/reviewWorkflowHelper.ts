import type { ReviewChatContext, ReviewChatHistoryEntry } from "@pv/core";

export { type DiffHunk, parseDiffHunks } from "./diffUtils.js";
export { buildInlineReviewPrompt, resolveInlinePosition } from "./reviewWorkflowInlineHelper.js";

/**
 * Extracts a plain JavaScript object from an LLM text response.
 *
 * Attempts three strategies in order:
 * 1. Direct JSON parse of the full trimmed text.
 * 2. Extraction from a fenced `\`\`\`json … \`\`\`` block.
 * 3. Extraction of the first `{…}` substring from the text.
 *
 * Returns an empty object `{}` when no valid object can be found.
 *
 * @param text - Raw LLM output that may contain a JSON object.
 * @returns The parsed object, or `{}` on failure.
 */
export function extractJsonObject(text: string): Record<string, unknown> {
  const trimmed = text.trim();
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // continue
  }

  const fenced = trimmed.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/i);
  if (fenced?.[1]) {
    try {
      const parsed = JSON.parse(fenced[1]);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      // continue
    }
  }

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    const candidate = trimmed.slice(firstBrace, lastBrace + 1);
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      // continue
    }
  }

  return {};
}

/**
 * Injects merge request context values into a review prompt template.
 *
 * If the template contains `{mr_content}`, `{mr_changes}`, `{mr_commits}`,
 * or `{repo_guidelines}` placeholders, they are substituted in a single pass.
 * When no placeholders are found the context is appended as labelled sections.
 *
 * @param template - The prompt template string (may contain named placeholders).
 * @param context - The MR content, diff, commits, and optional repo guidelines.
 * @returns The fully resolved prompt string ready to send to the LLM.
 */
export function injectMergeRequestContextIntoTemplate(
  template: string,
  context: {
    mrContent: string;
    mrChanges: string;
    mrCommits: string;
    guidelines?: string;
  }
): string {
  const hasPlaceholders =
    template.includes("{mr_content}") ||
    template.includes("{mr_changes}") ||
    template.includes("{mr_commits}") ||
    template.includes("{repo_guidelines}");

  if (hasPlaceholders) {
    const substitutions: Record<string, string> = {
      "{mr_content}": context.mrContent,
      "{mr_changes}": context.mrChanges,
      "{mr_commits}": context.mrCommits,
      "{repo_guidelines}": context.guidelines ?? "(None provided)",
    };
    return template.replace(
      /\{mr_content\}|\{mr_changes\}|\{mr_commits\}|\{repo_guidelines\}/g,
      (match) => substitutions[match] ?? match
    );
  }

  const sections = [
    template.trim(),
    "",
    "Merge request details:",
    context.mrContent,
    "",
    "Merge request changes:",
    context.mrChanges,
    "",
    "Merge request commits:",
    context.mrCommits,
  ];

  if (context.guidelines) {
    sections.push("");
    sections.push("Repository specific guidelines (PRIORITIZE THESE):");
    sections.push(context.guidelines);
  }

  return sections.join("\n");
}

// Backward-compatible alias; prefer injectMergeRequestContextIntoTemplate.
export const applyReviewTemplate = injectMergeRequestContextIntoTemplate;

/**
 * Builds the GitLab base URL from the configured URL and optional runtime input.
 *
 * When the input specifies `provider: "gitlab"` with a valid HTTPS/HTTP `url`,
 * the origin of that URL is returned so that self-hosted GitLab instances are
 * handled automatically. Falls back to `configuredGitLabUrl` in all other cases.
 *
 * @param configuredGitLabUrl - The GitLab base URL from the user's config.
 * @param input - Optional provider/url hint, typically from CLI flags or a webhook payload.
 * @returns The resolved GitLab origin URL.
 */
export function resolveGitLabBaseUrl(
  configuredGitLabUrl: string,
  input: { provider?: string; url?: string }
): string {
  if (input.provider !== "gitlab" || !input.url) {
    return configuredGitLabUrl;
  }

  try {
    const parsed = new URL(input.url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return configuredGitLabUrl;
    }
    return parsed.origin;
  } catch {
    return configuredGitLabUrl;
  }
}

function formatChatHistory(history: ReviewChatHistoryEntry[]): string {
  return history.map((entry) => `Q: ${entry.question}\nA: ${entry.answer}`).join("\n\n");
}

/**
 * Builds the full chat prompt combining the user question, conversation history,
 * review context, and an optional custom chat template.
 *
 * @param args.question - The user's current question.
 * @param args.history - Prior Q&A turns for multi-turn conversations.
 * @param args.context - The MR content, diff, commits, and summary used as context.
 * @param args.chatTemplate - Optional custom system/preamble template to prepend.
 * @returns The fully assembled prompt string ready to send to the LLM.
 */
export function buildChatPrompt(args: {
  question: string;
  history: ReviewChatHistoryEntry[];
  context: ReviewChatContext;
  chatTemplate?: string;
}): string {
  const historyText = formatChatHistory(args.history);
  const sections: string[] = [];

  if (args.chatTemplate?.trim()) {
    sections.push(args.chatTemplate.trim());
    sections.push("");
  }

  sections.push("You are an expert code assistant.");
  sections.push(`Question: ${args.question}`);
  sections.push("");
  if (historyText) {
    sections.push("Previous Q&A:");
    sections.push(historyText);
    sections.push("");
  }
  sections.push("Merge Request Content:");
  sections.push(args.context.mrContent);
  sections.push("");
  sections.push("Merge Request Changes:");
  sections.push(args.context.mrChanges);
  sections.push("");
  sections.push("Merge Request Commits:");
  sections.push(args.context.mrCommits);
  sections.push("");
  sections.push("MR Summary:");
  sections.push(args.context.summary);
  sections.push("");
  sections.push(
    "Use the above context to answer the question. If you don't know, say 'I don't know'."
  );
  sections.push(
    "IMPORTANT: Strictly avoid markdown headings; use plain text and bullets where helpful."
  );

  return sections.join("\n");
}
