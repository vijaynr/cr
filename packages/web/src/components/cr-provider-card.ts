import { LitElement, css, html } from "lit";
import { dashboardThemeStyles } from "../styles.js";
import type { ProviderDashboard, ProviderId } from "../types.js";
import "./cr-request-item.js";

export class CrProviderCard extends LitElement {
  static properties = {
    provider: {},
    data: { attribute: false },
  };

  static styles = [
    dashboardThemeStyles,
    css`
      :host {
        display: block;
      }

      .provider {
        padding: 18px;
      }

      .provider-head {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        align-items: start;
        margin-bottom: 16px;
      }

      .status {
        border-radius: 999px;
        padding: 5px 10px;
        font-size: 0.82rem;
        background: var(--accent-soft);
        color: var(--accent);
        white-space: nowrap;
      }

      .status.off {
        background: rgba(138, 59, 47, 0.1);
        color: var(--danger);
      }

      .request-list {
        display: grid;
        gap: 12px;
      }

      @media (max-width: 700px) {
        .provider-head {
          display: grid;
        }
      }
    `,
  ];

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

    const statusLabel = this.data.configured ? "configured" : "missing config";

    return html`
      <section class="provider">
        <div class="provider-head">
          <div>
            <div class="eyebrow">${this.provider}</div>
            <h2>${this.provider}</h2>
            ${this.data.repository ? html`<p class="provider-meta">${this.data.repository}</p>` : ""}
          </div>
          <div class=${`status ${this.data.configured ? "" : "off"}`.trim()}>${statusLabel}</div>
        </div>

        ${this.data.error ? html`<div class="error">${this.data.error}</div>` : ""}
        ${
          !this.data.error && this.data.items.length === 0
            ? html`<div class="empty">No open review requests found.</div>`
            : ""
        }
        ${
          this.data.items.length > 0
            ? html`
              <div class="request-list">
                ${this.data.items.map(
                  (item) =>
                    html`<cr-request-item .provider=${this.provider} .item=${item}></cr-request-item>`
                )}
              </div>
            `
            : ""
        }
      </section>
    `;
  }
}

customElements.define("cr-provider-card", CrProviderCard);
