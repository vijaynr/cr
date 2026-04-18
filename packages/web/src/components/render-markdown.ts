import "@mariozechner/mini-lit/dist/MarkdownBlock.js";
import "@mariozechner/mini-lit/dist/CodeBlock.js";
import { html, nothing } from "lit";

type MarkdownRenderOptions = {
  className?: string;
  compact?: boolean;
  emptyText?: string;
};

export function renderMarkdown(
  content: string | null | undefined,
  options: MarkdownRenderOptions = {},
) {
  const trimmed = content?.trim() ?? "";

  if (!trimmed) {
    return options.emptyText
      ? html`<p class="text-sm text-muted-foreground">${options.emptyText}</p>`
      : nothing;
  }

  const cls = [
    options.className,
    options.compact ? "cr-markdown--compact" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return html`<markdown-block
    .content=${trimmed}
    class=${cls || nothing}
  ></markdown-block>`;
}
