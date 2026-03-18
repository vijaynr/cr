import { LitElement, html } from "lit";
import type { ProviderDashboard, ProviderId } from "../types.js";
import "./cr-request-item.js";

export class CrProviderCard extends LitElement {
  static properties = {
    provider: {},
    data: { attribute: false },
  };

  override createRenderRoot() { return this; }

  declare provider: ProviderId;
  declare data: ProviderDashboard | null;

  constructor() {
    super();
    this.provider = "gitlab";
    this.data = null;
  }

  render() {
    if (!this.data) {
      return html``;
    }

    const { configured, repository, error, items } = this.data;

    return html`
      <div class="card bg-base-200 border border-base-300 shadow-sm">
        <div class="card-body gap-3">
          <div class="flex items-start justify-between gap-2">
            <div>
              <div class="text-xs font-bold uppercase tracking-widest text-base-content/40 mb-1">${this.provider}</div>
              <h2 class="card-title text-lg capitalize">${this.provider}</h2>
              ${repository ? html`<div class="text-xs text-base-content/50 font-mono mt-0.5">${repository}</div>` : ""}
            </div>
            <div class="badge ${configured ? "badge-success" : "badge-error"} badge-sm gap-1">
              ${configured ? "✓ configured" : "✗ missing config"}
            </div>
          </div>
          ${error ? html`<div class="alert alert-error text-xs py-2">${error}</div>` : ""}
          ${!error && items.length === 0 ? html`<p class="text-sm text-base-content/40 italic">No open review requests.</p>` : ""}
          ${items.length > 0 ? html`
            <div class="flex flex-col gap-2">
              ${items.map(item => html`<cr-request-item .provider=${this.provider} .item=${item}></cr-request-item>`)}
            </div>
          ` : ""}
        </div>
      </div>
    `;
  }
}

customElements.define("cr-provider-card", CrProviderCard);
