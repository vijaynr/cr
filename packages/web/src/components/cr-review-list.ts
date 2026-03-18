import { LitElement, html } from "lit";
import type { ProviderId, ReviewTarget } from "../types.js";

export class CrReviewList extends LitElement {
  static properties = {
    provider: {},
    targets: { attribute: false },
    selectedId: { type: Number },
    loading: { type: Boolean },
    error: {},
    configured: { type: Boolean },
  };

  override createRenderRoot() { return this; }

  declare provider: ProviderId;
  declare targets: ReviewTarget[];
  declare selectedId: number;
  declare loading: boolean;
  declare error: string;
  declare configured: boolean;

  constructor() {
    super();
    this.provider = "gitlab";
    this.targets = [];
    this.selectedId = 0;
    this.loading = false;
    this.error = "";
    this.configured = true;
  }

  private emitSelect(target: ReviewTarget) {
    this.dispatchEvent(
      new CustomEvent("review-selected", {
        detail: target,
        bubbles: true,
        composed: true,
      })
    );
  }

  private stateBadgeClass(state: string | undefined) {
    if (!state) return "badge-ghost";
    if (state.includes("open") || state.includes("pending")) return "badge-success";
    if (state.includes("merge") || state.includes("submitted")) return "badge-primary";
    return "badge-error";
  }

  render() {
    if (!this.configured) {
      return html`<div class="alert alert-warning text-sm">This provider is not configured yet. Update CR config before loading its review queue.</div>`;
    }

    if (this.loading) {
      return html`
        <div class="flex items-center gap-2 p-4 text-base-content/50 text-sm">
          <span class="loading loading-spinner loading-xs"></span>
          Loading review queue…
        </div>
      `;
    }

    if (this.error) {
      return html`<div class="alert alert-warning text-sm">${this.error}</div>`;
    }

    if (this.targets.length === 0) {
      return html`<div class="text-sm text-base-content/40 italic p-2">No review requests match the current filters.</div>`;
    }

    return html`
      <div class="flex flex-col gap-2">
        ${this.targets.map(
          (target) => html`
            <div
              class="card card-compact bg-base-300 border cursor-pointer transition-all
                ${target.id === this.selectedId
                  ? "border-primary/50 bg-primary/10"
                  : "border-base-100/10 hover:border-primary/40 hover:bg-base-200"}"
              @click=${() => this.emitSelect(target)}
            >
              <div class="card-body gap-1.5">
                <div class="flex items-start justify-between gap-2">
                  <h3 class="font-semibold text-sm leading-snug">
                    <span class="text-primary font-mono text-xs mr-1">${this.requestPrefix(target)}</span>
                    ${target.title}
                  </h3>
                  ${target.state ? html`<span class="badge badge-xs ${this.stateBadgeClass(target.state)} shrink-0">${target.state}</span>` : ""}
                </div>
                <div class="flex flex-wrap gap-2 text-xs text-base-content/50">
                  <span>${target.author || "Unknown author"}</span>
                  ${target.updatedAt ? html`<span>· ${target.updatedAt}</span>` : ""}
                  ${target.sourceBranch ? html`<span class="font-mono">${target.sourceBranch}${target.targetBranch ? ` → ${target.targetBranch}` : ""}</span>` : ""}
                  ${target.draft ? html`<span class="badge badge-ghost badge-xs">draft</span>` : ""}
                </div>
              </div>
            </div>
          `
        )}
      </div>
    `;
  }

  private requestPrefix(target: ReviewTarget): string {
    return this.provider === "gitlab" ? `!${target.id}` : `#${target.id}`;
  }
}

customElements.define("cr-review-list", CrReviewList);
