import { LitElement, css, html } from "https://esm.sh/lit@3.2.1";

const providerOrder = ["gitlab", "github", "reviewboard"];

class CrDashboardApp extends LitElement {
  static properties = {
    dashboard: { state: true },
    error: { state: true },
    loading: { state: true },
  };

  static styles = css`
    :host {
      --paper: rgba(255, 251, 243, 0.82);
      --ink: #1f2923;
      --muted: #5c695e;
      --line: rgba(31, 41, 35, 0.14);
      --accent: #335c4c;
      --accent-soft: rgba(51, 92, 76, 0.1);
      --danger: #8a3b2f;
      display: block;
      color: var(--ink);
    }

    main {
      max-width: 1100px;
      margin: 0 auto;
      padding: 32px 18px 64px;
    }

    header {
      display: flex;
      align-items: end;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 24px;
    }

    h1,
    h2,
    h3,
    p {
      margin: 0;
    }

    h1 {
      font-size: clamp(2.5rem, 7vw, 4.4rem);
      line-height: 0.94;
      letter-spacing: -0.06em;
      font-weight: 700;
      text-transform: lowercase;
    }

    header p,
    .muted,
    .provider-meta,
    .request-meta {
      color: var(--muted);
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

    .panel,
    .provider,
    .request {
      backdrop-filter: blur(8px);
      background: var(--paper);
      border: 1px solid var(--line);
      border-radius: 22px;
      box-shadow: 0 18px 45px rgba(54, 60, 48, 0.08);
    }

    .panel {
      padding: 18px;
    }

    .eyebrow {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
      color: var(--muted);
      font-size: 0.84rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .eyebrow::before {
      content: "";
      width: 10px;
      height: 10px;
      border-radius: 999px;
      background: var(--accent);
      box-shadow: 0 0 0 6px var(--accent-soft);
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

    .request {
      padding: 14px;
      background: rgba(255, 255, 255, 0.68);
    }

    .request a {
      color: inherit;
      text-decoration: none;
    }

    .request a:hover {
      text-decoration: underline;
    }

    .request-title {
      font-size: 1.02rem;
      font-weight: 600;
      line-height: 1.3;
      margin-bottom: 8px;
    }

    .request-meta {
      display: grid;
      gap: 4px;
      font-size: 0.92rem;
    }

    .empty,
    .error {
      padding: 14px;
      border-radius: 16px;
      border: 1px dashed var(--line);
      background: rgba(255, 255, 255, 0.4);
      color: var(--muted);
    }

    .error {
      color: var(--danger);
      border-color: rgba(138, 59, 47, 0.2);
      background: rgba(138, 59, 47, 0.06);
    }

    @media (max-width: 700px) {
      main {
        padding-top: 24px;
      }

      header,
      .provider-head {
        display: grid;
      }

      button {
        width: fit-content;
      }
    }
  `;

  constructor() {
    super();
    this.dashboard = null;
    this.error = "";
    this.loading = true;
  }

  connectedCallback() {
    super.connectedCallback();
    this.loadDashboard();
  }

  async loadDashboard() {
    this.loading = true;
    this.error = "";

    try {
      const response = await fetch("/api/web/dashboard");
      if (!response.ok) {
        throw new Error(`Dashboard request failed with status ${response.status}`);
      }

      this.dashboard = await response.json();
    } catch (error) {
      this.error = error instanceof Error ? error.message : String(error);
    } finally {
      this.loading = false;
    }
  }

  renderConfigCard(label, value, note) {
    return html`
      <section class="panel">
        <div class="eyebrow">${label}</div>
        <h3>${value || "Not configured"}</h3>
        ${note ? html`<p class="muted">${note}</p>` : ""}
      </section>
    `;
  }

  renderProvider(provider) {
    const data = this.dashboard?.providers?.[provider];
    if (!data) {
      return "";
    }

    const statusLabel = data.configured ? "configured" : "missing config";
    return html`
      <section class="provider">
        <div class="provider-head">
          <div>
            <div class="eyebrow">${provider}</div>
            <h2>${provider}</h2>
            ${data.repository
              ? html`<p class="provider-meta">${data.repository}</p>`
              : ""}
          </div>
          <div class=${`status ${data.configured ? "" : "off"}`.trim()}>${statusLabel}</div>
        </div>

        ${data.error ? html`<div class="error">${data.error}</div>` : ""}

        ${!data.error && data.items.length === 0
          ? html`<div class="empty">No open review requests found.</div>`
          : ""}

        ${data.items.length > 0
          ? html`
              <div class="request-list">
                ${data.items.map(
                  (item) => html`
                    <article class="request">
                      <a href=${item.url} target="_blank" rel="noreferrer">
                        <div class="request-title">
                          ${provider === "gitlab"
                            ? `!${item.id}`
                            : provider === "github"
                              ? `#${item.id}`
                              : `#${item.id}`} ${item.title}
                        </div>
                      </a>
                      <div class="request-meta">
                        <div>State: ${item.state}${item.draft ? " • draft" : ""}</div>
                        ${item.author ? html`<div>Author: ${item.author}</div>` : ""}
                        ${item.sourceBranch || item.targetBranch
                          ? html`
                              <div>
                                Branches:
                                ${item.sourceBranch || "?"}
                                ${item.targetBranch ? html` → ${item.targetBranch}` : ""}
                              </div>
                            `
                          : ""}
                        ${item.repository ? html`<div>Repository: ${item.repository}</div>` : ""}
                        ${item.updatedAt ? html`<div>Updated: ${item.updatedAt}</div>` : ""}
                      </div>
                    </article>
                  `
                )}
              </div>
            `
          : ""}
      </section>
    `;
  }

  renderBody() {
    if (this.loading) {
      return html`<div class="panel">Loading dashboard…</div>`;
    }

    if (this.error) {
      return html`<div class="error">${this.error}</div>`;
    }

    const config = this.dashboard.config;
    return html`
      <div class="grid">
        ${this.renderConfigCard(
          "repository",
          this.dashboard.repository.remoteUrl || this.dashboard.repository.cwd,
          this.dashboard.repository.remoteUrl ? this.dashboard.repository.cwd : "No git remote detected."
        )}
        ${this.renderConfigCard(
          "OpenAI",
          config.openai.model || "Configured",
          config.openai.apiUrl || "LLM config is present."
        )}
        ${this.renderConfigCard(
          "Review Agents",
          config.defaultReviewAgents.join(", "),
          `Webhook concurrency ${config.webhook.concurrency}, queue ${config.webhook.queueLimit}`
        )}
      </div>

      <div class="provider-grid">
        ${providerOrder.map((provider) => this.renderProvider(provider))}
      </div>
    `;
  }

  render() {
    return html`
      <main>
        <header>
          <div>
            <p class="muted">configuration and open review requests</p>
            <h1>cr web</h1>
          </div>
          <div>
            <button type="button" @click=${() => this.loadDashboard()}>Refresh</button>
            ${this.dashboard?.generatedAt
              ? html`<p class="muted">Updated ${this.dashboard.generatedAt}</p>`
              : ""}
          </div>
        </header>
        ${this.renderBody()}
      </main>
    `;
  }
}

customElements.define("cr-dashboard-app", CrDashboardApp);
