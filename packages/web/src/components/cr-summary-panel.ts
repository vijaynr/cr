import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { ScrollText } from "lucide";
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
      <div class="cr-review-panel">
        <div class="cr-review-scroll">
          ${!this.canRunWorkflows
            ? html`<div class="alert alert-warning text-xs">
                Summary requires a connected repository source.
              </div>`
            : ""}

          ${hasResult
            ? html`
                <div class="cr-review-info-banner">
                  <span class="cr-review-info-banner__check">✓</span>
                  Summary generated
                </div>
                <div class="cr-review-section">
                  <div class="cr-review-section__label">Overview</div>
                  <div class="cr-review-section__body">
                    ${renderMarkdown(this.summaryResult?.output, {
                      className: "cr-markdown--muted",
                      emptyText: "No summary output was generated.",
                    })}
                  </div>
                </div>
              `
            : html`<p class="cr-review-hint">
                Generate a summary for a narrative overview of changes.
              </p>`}
        </div>

        <div class="cr-review-actions">
          <button
            class="btn btn-primary btn-sm flex-1 gap-1.5"
            type="button"
            ?disabled=${!this.canRunWorkflows || this.runningSummary}
            @click=${() => this.emit("run-summary")}
          >
            ${this.runningSummary
              ? html`<span
                  class="loading loading-spinner loading-xs"
                ></span>`
              : html`<cr-icon .icon=${ScrollText} .size=${14}></cr-icon>`}
            ${this.runningSummary ? "Generating…" : "Generate summary"}
          </button>
        </div>
      </div>
    `;
  }
}
