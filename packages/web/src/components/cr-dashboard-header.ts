import { LitElement, css, html } from "lit";
import { Activity, Clock3, GitBranch, RefreshCw, Sparkles } from "lucide";
import { dashboardThemeStyles } from "../styles.js";
import "./cr-icon.js";

export class CrDashboardHeader extends LitElement {
  static properties = {
    generatedAt: {},
    loading: { type: Boolean },
    repositoryLabel: {},
    repositoryPath: {},
    remoteUrl: {},
  };

  static styles = [
    dashboardThemeStyles,
    css`
      :host {
        display: block;
      }

      header {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(280px, 360px);
        gap: 20px;
        padding: 22px 24px;
        border-radius: 14px;
        background: linear-gradient(180deg, rgba(20, 28, 39, 0.98), rgba(16, 23, 34, 0.98));
        border: 1px solid var(--line);
        box-shadow: var(--shadow);
      }

      .title {
        display: grid;
        gap: 14px;
        align-content: start;
      }

      h1 {
        max-width: 16ch;
        font-size: clamp(2rem, 4vw, 2.9rem);
        text-wrap: pretty;
      }

      .meta {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
      }

      .meta .badge,
      .status-kpi strong,
      .button {
        gap: 10px;
      }

      .actions {
        display: grid;
        gap: 16px;
        align-content: space-between;
      }

      .status-panel {
        display: grid;
        gap: 14px;
        padding: 16px;
        border-radius: 12px;
        border: 1px solid var(--line);
        background: rgba(255, 255, 255, 0.03);
        box-shadow: var(--shadow-sm);
      }

      .status-grid {
        display: grid;
        gap: 12px;
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .status-kpi {
        display: grid;
        gap: 4px;
        padding: 12px 14px;
        border-radius: 10px;
        background: rgba(148, 163, 184, 0.06);
        border: 1px solid rgba(148, 163, 184, 0.08);
      }

      .status-kpi strong {
        font-size: 1.15rem;
        font-family: "Space Grotesk", "IBM Plex Sans", sans-serif;
        line-height: 1.1;
        letter-spacing: -0.02em;
      }

      .status-kpi span {
        color: var(--ink-faint);
        font-size: 0.84rem;
      }

      .repo {
        max-width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      @media (max-width: 920px) {
        header {
          grid-template-columns: 1fr;
          padding: 18px;
        }

        .actions {
          align-content: start;
        }

        .status-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ];

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
      <header>
        <div class="title">
          <div class="eyebrow">CR control center</div>
          <h1>Enterprise review operations across provider queues, diffs, and AI workflows.</h1>
          <p class="muted">
            Monitor review activity, inspect change context, and publish feedback from a single controlled workspace.
          </p>
          <div class="meta">
            ${
              this.repositoryLabel
                ? html`<div class="badge">
                    <cr-icon .icon=${GitBranch} .size=${15}></cr-icon>
                    ${this.repositoryLabel}
                  </div>`
                : ""
            }
            ${
              this.repositoryPath
                ? html`<div class="badge repo">
                    <cr-icon .icon=${Sparkles} .size=${15}></cr-icon>
                    ${this.repositoryPath}
                  </div>`
                : ""
            }
            ${
              this.remoteUrl
                ? html`<div class="badge" data-tone="success">
                    <cr-icon .icon=${Activity} .size=${15}></cr-icon>
                    remote detected
                  </div>`
                : html`<div class="badge">
                    <cr-icon .icon=${Sparkles} .size=${15}></cr-icon>
                    choose repository source
                  </div>`
            }
          </div>
        </div>

        <div class="actions">
          <section class="status-panel">
            <div class="eyebrow">Workspace pulse</div>
            <div class="status-grid">
              <div class="status-kpi">
                <strong>
                  <cr-icon .icon=${Activity} .size=${16}></cr-icon>
                  ${this.loading ? "Syncing" : "Ready"}
                </strong>
                <span>Provider state</span>
              </div>
              <div class="status-kpi">
                <strong>
                  <cr-icon .icon=${Clock3} .size=${16}></cr-icon>
                  ${this.generatedAt || "Pending"}
                </strong>
                <span>Last refresh</span>
              </div>
            </div>
          </section>

          <button
            class="button"
            data-tone="primary"
            type="button"
            ?disabled=${this.loading}
            @click=${this.handleRefresh}
          >
            <cr-icon .icon=${RefreshCw} .size=${16}></cr-icon>
            ${this.loading ? "Refreshing…" : "Refresh queue"}
          </button>
        </div>
      </header>
    `;
  }
}

customElements.define("cr-dashboard-header", CrDashboardHeader);
