import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { ScrollText } from "lucide";
import { Alert } from "@mariozechner/mini-lit/dist/Alert.js";
import { Button } from "@mariozechner/mini-lit/dist/Button.js";
import type { ReviewWorkflowResult } from "../types.js";
import "./cr-icon.js";
import { renderMarkdown } from "./render-markdown.js";

@customElement("cr-summary-panel")
export class CrSummaryPanel extends LitElement {
  @property({ type: Boolean }) runningSummary = false;
  @property({ attribute: false }) summaryResult: ReviewWorkflowResult | null = null;
  @property({ type: Boolean }) canRunWorkflows = false;

  override createRenderRoot() {
    return this;
  }

  private emit(name: string) {
    this.dispatchEvent(
      new CustomEvent(name, { bubbles: true, composed: true })
    );
  }

  render() {
    const hasResult = !!this.summaryResult;
    return html`
      <div class="flex flex-col flex-auto min-h-0">
        <div class="flex-auto min-h-0 overflow-y-auto flex flex-col gap-3 pr-1">
          ${!this.canRunWorkflows
            ? Alert({ variant: "default", className: "bg-muted text-xs", children: "Summary requires a connected repository source." })
            : ""}

          ${hasResult
            ? html`
                <div class="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted rounded-md px-3 py-2">
                  <span class="text-green-600">✓</span>
                  Summary generated
                </div>
                <div class="flex flex-col gap-2">
                  <div class="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Overview</div>
                  <div class="">
                    ${renderMarkdown(this.summaryResult?.output, {
                      className: "cr-markdown--muted",
                      emptyText: "No summary output was generated.",
                    })}
                  </div>
                </div>
              `
            : html`<p class="text-xs text-muted-foreground">
                Generate a summary for a narrative overview of changes.
              </p>`}
        </div>

        <div class="flex gap-2 border-t border-border pt-3 mt-auto">
            ${Button({ variant: "default", size: "sm", className: "flex-1 gap-1.5",
              disabled: !this.canRunWorkflows || this.runningSummary,
              loading: this.runningSummary,
              onClick: () => this.emit("run-summary"),
              children: this.runningSummary
                ? "Generating…"
                : html`<cr-icon .icon=${ScrollText} .size=${14}></cr-icon> Generate summary`
            })}
        </div>
      </div>
    `;
  }
}
