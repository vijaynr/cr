import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { Bot, BotMessageSquare } from "lucide";
import { Alert } from "@mariozechner/mini-lit/dist/Alert.js";
import { Badge } from "@mariozechner/mini-lit/dist/Badge.js";
import { Button } from "@mariozechner/mini-lit/dist/Button.js";
import { Checkbox } from "@mariozechner/mini-lit/dist/Checkbox.js";
import type { ReviewAgentOption, ReviewWorkflowResult } from "../types.js";
import "./cr-icon.js";
import { renderMarkdown } from "./render-markdown.js";

@customElement("cr-review-panel")
export class CrReviewPanel extends LitElement {
  @property({ attribute: false }) agentOptions: ReviewAgentOption[] = [];
  @property({ attribute: false }) selectedAgents: string[] = [];
  @property({ type: Boolean }) inlineCommentsEnabled = true;
  @property() feedbackDraft = "";
  @property({ type: Boolean }) runningReview = false;
  @property({ type: Boolean }) postingGeneratedReview = false;
  @property({ attribute: false }) reviewResult: ReviewWorkflowResult | null = null;
  @property({ attribute: false }) reviewWarnings: string[] = [];
  @property({ type: Boolean }) canRunWorkflows = false;

  override createRenderRoot() {
    return this;
  }

  private emit(name: string, detail?: unknown) {
    this.dispatchEvent(
      new CustomEvent(name, { detail, bubbles: true, composed: true })
    );
  }

  render() {
    const hasResult = !!this.reviewResult;
    return html`
      <div class="flex flex-col flex-auto min-h-0">
        <div class="flex-auto min-h-0 overflow-y-auto flex flex-col gap-3 pr-1">
          ${!this.canRunWorkflows
            ? Alert({ variant: "default", className: "bg-muted text-xs", children: "Review requires a connected repository source." })
            : ""}

          <div class="flex flex-col gap-2">
            <div class="flex items-center justify-between gap-2">
              <span class="text-xs font-semibold tracking-widest uppercase text-muted-foreground">Agents</span>
              <label class="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                ${Checkbox({
                  checked: this.inlineCommentsEnabled,
                  label: "Inline",
                  onChange: (checked) => this.emit("inline-toggle", checked)
                })}
              </label>
            </div>
            <div class="flex flex-col gap-1.5">
              ${this.agentOptions.map(
                (option) => html`
                  <label
                    class="flex items-start gap-2 rounded-md border border-border p-2.5 cursor-pointer transition-colors hover:border-primary/30 ${this.selectedAgents.includes(option.value) ? "bg-primary/5 border-primary/30" : ""}"
                  >
                    ${Checkbox({
                      checked: this.selectedAgents.includes(option.value),
                      label: html`
                        <div class="flex flex-col gap-0.5">
                          <span class="text-sm font-medium">${option.title}</span>
                          ${option.description ? html`<span class="text-xs text-muted-foreground">${option.description}</span>` : ""}
                        </div>
                      `,
                      onChange: (checked) => this.emit("agent-toggle", { value: option.value, checked })
                    })}
                  </label>
                `
              )}
            </div>
          </div>

          ${this.reviewWarnings.map(
            (w) => Alert({ variant: "default", className: "bg-muted text-xs", children: w })
          )}

          ${hasResult
            ? this.renderResult()
            : html`<p class="text-xs text-muted-foreground">
                Run a review to generate aggregated results.
              </p>`}
        </div>

        <div class="flex gap-2 border-t border-border pt-3 mt-auto">
          ${Button({ variant: "default", size: "sm", className: "flex-1 gap-1.5",
            disabled: !this.canRunWorkflows || this.runningReview || this.selectedAgents.length === 0,
            loading: this.runningReview,
            onClick: () => this.emit("run-review"),
            children: this.runningReview ? "Running…" : html`<cr-icon .icon=${Bot} .size=${14}></cr-icon> Run review`
          })}
          ${hasResult
            ? Button({ variant: "ghost", size: "sm", className: "flex-1 gap-1.5",
                disabled: this.postingGeneratedReview,
                loading: this.postingGeneratedReview,
                onClick: () => this.emit("post-generated-review"),
                children: "Post review"
              })
            : ""}
        </div>
      </div>
    `;
  }

  private renderResult() {
    if (!this.reviewResult) return html``;
    const result = this.reviewResult;
    return html`
      <div class="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted rounded-md px-3 py-2">
        <span class="text-green-600">✓</span>
        Review generated
        <span class="text-muted-foreground/40">·</span>
        ${result.selectedAgents.length} agents
        <span class="text-muted-foreground/40">·</span>
        ${result.inlineComments.length} inline
      </div>

      <div class="flex flex-col gap-2">
        <div class="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Overall Review</div>
        <div class="">
          ${renderMarkdown(result.overallSummary || result.output, {
            className: "cr-markdown--muted",
            emptyText: "No aggregate review output was generated.",
          })}
        </div>
      </div>

      ${result.inlineComments.length > 0
        ? html`
            <div class="flex flex-col gap-2">
              <div class="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                Inline Comments
              ${Badge({ variant: "secondary", className: "ml-1.5 text-[0.65rem]", children: String(result.inlineComments.length) })}
              </div>
              <div class="">
                <div class="flex flex-col gap-2">
                  ${result.inlineComments.map(
                    (c) => html`
                      <div
                        class="rounded-lg border border-foreground/10 bg-background/42 px-3 py-2.5"
                      >
                        <div class="font-mono text-xs text-primary/80">
                          ${c.filePath}:${c.line}
                        </div>
                        <div class="mt-1.5">
                          ${renderMarkdown(c.comment, {
                            className: "cr-markdown--muted",
                            compact: true,
                            emptyText: "No inline note content.",
                          })}
                        </div>
                      </div>
                    `
                  )}
                </div>
              </div>
            </div>
          `
        : ""}

      ${result.agentResults?.map(
        (agent) => html`
          <div class="rounded-md border border-primary/20 bg-primary/5 p-3 flex flex-col gap-2">
            <div class="inline-flex items-center gap-1.5 text-xs font-semibold text-primary bg-muted rounded-md px-2 py-1 border border-border font-mono">
              <span class="text-primary" aria-hidden="true"
                >//</span
              >
              <cr-icon .icon=${BotMessageSquare} .size=${13}></cr-icon>
              <span class="text-foreground">${agent.name}</span>
              ${agent.failed
                ? Badge({ variant: "destructive", className: "ml-1.5 text-[0.65rem]", children: "Failed" })
                : ""}
            </div>
            <div class="">
              ${renderMarkdown(
                agent.failed ? agent.error || "Agent failed." : agent.output,
                {
                  className: "cr-markdown--muted",
                  compact: true,
                  emptyText: "No agent output.",
                }
              )}
            </div>
          </div>
        `
      )}
    `;
  }
}
