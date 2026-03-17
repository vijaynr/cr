import { LitElement, css, html } from "lit";
import { dashboardThemeStyles } from "../styles.js";
import { providerOrder, type DashboardData, type ProviderId } from "../types.js";
import "./cr-config-card.js";
import "./cr-dashboard-header.js";
import "./cr-provider-card.js";

export class CrDashboardApp extends LitElement {
  static properties = {
    dashboard: { state: true },
    error: { state: true },
    loading: { state: true },
  };

  static styles = [
    dashboardThemeStyles,
    css`
      :host {
        display: block;
      }

      main {
        max-width: 1100px;
        margin: 0 auto;
        padding: 32px 18px 64px;
      }

      .grid,
      .provider-grid {
        display: grid;
        gap: 16px;
      }

      .grid {
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        margin-bottom: 20px;
      }

      .provider-grid {
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      }

      .panel {
        padding: 18px;
      }

      @media (max-width: 700px) {
        main {
          padding-top: 24px;
        }
      }
    `,
  ];

  declare dashboard: DashboardData | null;
  declare error: string;
  declare loading: boolean;

  constructor() {
    super();
    this.dashboard = null;
    this.error = "";
    this.loading = true;
  }

  connectedCallback() {
    super.connectedCallback();
    void this.loadDashboard();
  }

  private async loadDashboard() {
    this.loading = true;
    this.error = "";

    try {
      const response = await fetch("/api/dashboard");
      if (!response.ok) {
        throw new Error(`Dashboard request failed with status ${response.status}`);
      }

      this.dashboard = (await response.json()) as DashboardData;
    } catch (error) {
      this.error = error instanceof Error ? error.message : String(error);
    } finally {
      this.loading = false;
    }
  }

  private renderProvider(provider: ProviderId) {
    return html`
      <cr-provider-card
        .provider=${provider}
        .data=${this.dashboard?.providers?.[provider] ?? null}
      ></cr-provider-card>
    `;
  }

  private renderBody() {
    if (this.loading) {
      return html`<div class="panel">Loading dashboard...</div>`;
    }

    if (this.error) {
      return html`<div class="error">${this.error}</div>`;
    }

    if (!this.dashboard) {
      return html`<div class="empty">No dashboard data available.</div>`;
    }

    const { config, repository } = this.dashboard;

    return html`
      <div class="grid">
        <cr-config-card
          label="repository"
          .value=${repository.remoteUrl || repository.cwd}
          .note=${repository.remoteUrl ? repository.cwd : "No git remote detected."}
        ></cr-config-card>
        <cr-config-card
          label="OpenAI"
          .value=${config.openai.model || "Configured"}
          .note=${config.openai.apiUrl || "LLM config is present."}
        ></cr-config-card>
        <cr-config-card
          label="Review Agents"
          .value=${config.defaultReviewAgents.join(", ")}
          .note=${`Webhook concurrency ${config.webhook.concurrency}, queue ${config.webhook.queueLimit}`}
        ></cr-config-card>
      </div>

      <div class="provider-grid">${providerOrder.map((provider) => this.renderProvider(provider))}</div>
    `;
  }

  render() {
    return html`
      <main>
        <cr-dashboard-header
          .generatedAt=${this.dashboard?.generatedAt || ""}
          .loading=${this.loading}
          @refresh=${() => this.loadDashboard()}
        ></cr-dashboard-header>
        ${this.renderBody()}
      </main>
    `;
  }
}

customElements.define("cr-dashboard-app", CrDashboardApp);
