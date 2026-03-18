import { LitElement, html } from "lit";
import { GitBranch, RefreshCw } from "lucide";
import "./cr-icon.js";

export class CrDashboardHeader extends LitElement {
  static properties = {
    generatedAt: {},
    loading: { type: Boolean },
    repositoryLabel: {},
    repositoryPath: {},
    remoteUrl: {},
  };

  override createRenderRoot() { return this; }

  declare generatedAt: string;
  declare loading: boolean;
  declare repositoryLabel: string;
  declare repositoryPath: string;
  declare remoteUrl: string;

  constructor() {
    super();
    this.generatedAt = "";
    this.loading = false;
    this.repositoryLabel = "";
    this.repositoryPath = "";
    this.remoteUrl = "";
  }

  private handleRefresh() {
    this.dispatchEvent(new CustomEvent("refresh", { bubbles: true, composed: true }));
  }

  render() {
    return html`
      <div class="bg-base-200 rounded-xl border border-base-300 p-4 flex flex-col gap-3">
        <div class="flex items-center justify-between gap-4">
          <div>
            <h1 class="text-2xl font-bold tracking-tight">Review Ops</h1>
            <div class="flex flex-wrap gap-2 mt-1.5">
              ${this.repositoryLabel ? html`
                <div class="badge badge-ghost badge-sm gap-1 font-mono">
                  <cr-icon .icon=${GitBranch} .size=${12}></cr-icon>
                  ${this.repositoryLabel}
                </div>
              ` : ""}
              ${this.generatedAt ? html`
                <div class="badge badge-ghost badge-sm">${this.generatedAt}</div>
              ` : ""}
              ${this.remoteUrl ? html`
                <div class="badge badge-success badge-sm">● remote detected</div>
              ` : ""}
            </div>
          </div>
          <button
            class="btn btn-ghost btn-sm gap-1.5"
            type="button"
            ?disabled=${this.loading}
            @click=${this.handleRefresh}
          >
            ${this.loading
              ? html`<span class="loading loading-spinner loading-xs"></span>`
              : html`<cr-icon .icon=${RefreshCw} .size=${14}></cr-icon>`}
            ${this.loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>
    `;
  }
}

customElements.define("cr-dashboard-header", CrDashboardHeader);

