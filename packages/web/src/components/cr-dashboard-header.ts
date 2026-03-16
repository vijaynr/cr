import { LitElement, css, html } from "lit";
import { dashboardThemeStyles } from "../styles.js";

export class CrDashboardHeader extends LitElement {
  static properties = {
    generatedAt: {},
    loading: { type: Boolean },
  };

  static styles = [
    dashboardThemeStyles,
    css`
      :host {
        display: block;
      }

      header {
        display: flex;
        align-items: end;
        justify-content: space-between;
        gap: 16px;
        margin-bottom: 24px;
      }

      h1 {
        font-size: clamp(2.5rem, 7vw, 4.4rem);
        line-height: 0.94;
        letter-spacing: -0.06em;
        font-weight: 700;
        text-transform: lowercase;
      }

      button {
        border: 1px solid var(--line);
        background: rgba(255, 255, 255, 0.72);
        color: var(--ink);
        border-radius: 999px;
        padding: 10px 16px;
        font: inherit;
        cursor: pointer;
      }

      button:hover {
        background: white;
      }

      button:disabled {
        cursor: progress;
        opacity: 0.7;
      }

      @media (max-width: 700px) {
        header {
          display: grid;
        }

        button {
          width: fit-content;
        }
      }
    `,
  ];

  declare generatedAt: string;
  declare loading: boolean;

  constructor() {
    super();
    this.generatedAt = "";
    this.loading = false;
  }

  private handleRefresh() {
    this.dispatchEvent(new CustomEvent("refresh", { bubbles: true, composed: true }));
  }

  render() {
    return html`
      <header>
        <div>
          <p class="muted">configuration and open review requests</p>
          <h1>cr web</h1>
        </div>
        <div>
          <button type="button" ?disabled=${this.loading} @click=${this.handleRefresh}>
            ${this.loading ? "Refreshing..." : "Refresh"}
          </button>
          ${this.generatedAt ? html`<p class="muted">Updated ${this.generatedAt}</p>` : ""}
        </div>
      </header>
    `;
  }
}

customElements.define("cr-dashboard-header", CrDashboardHeader);
