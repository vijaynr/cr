import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { BrainCircuit, GitBranch, LayoutDashboard, Settings2 } from "lucide";
import "@mariozechner/mini-lit/dist/Sidebar.js";
import {
  providerLabels,
  providerOrder,
  type DashboardData,
  type DashboardSection,
  type UITheme,
} from "../types.js";
import { WEB_APP_ICON_ROUTE } from "../asset-routes.js";
import "./cr-icon.js";
import "./cr-provider-icon.js";
import "./cr-theme-toggle.js";

@customElement("cr-sidebar-nav")
export class CrSidebarNav extends LitElement {
  @property() activeSection: DashboardSection = "overview";
  @property({ attribute: false }) dashboard: DashboardData | null = null;
  @property({ type: Number }) selectedAgentCount = 0;
  @property() repositoryLabel = "";
  @property({ type: Boolean }) isLoading = false;
  @property() uiTheme: UITheme = "dark";

  override createRenderRoot() {
    return this;
  }

  private emitSectionChange(section: DashboardSection) {
    this.dispatchEvent(
      new CustomEvent("section-change", {
        detail: section,
        bubbles: true,
        composed: true,
      })
    );
  }

  private renderNavLink(section: DashboardSection, label: string) {
    const isActive = this.activeSection === section;
    const isProvider =
      section === "gitlab" || section === "github" || section === "reviewboard";

    return html`
      <a
        href="#/${section}"
        class="flex items-center gap-2.5 px-2.5 py-2 text-sm transition-colors
          ${isActive
            ? "bg-accent text-accent-foreground font-medium"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"}"
        @click=${(e: Event) => {
          e.preventDefault();
          this.emitSectionChange(section);
        }}
      >
        <span class="flex-none w-4 flex items-center justify-center">
          ${isProvider
            ? html`<cr-provider-icon .provider=${section} .size=${15}></cr-provider-icon>`
            : html`<cr-icon
                .icon=${section === "overview" ? LayoutDashboard : Settings2}
                .size=${15}
              ></cr-icon>`}
        </span>
        <span class="truncate">${label}</span>
      </a>
    `;
  }

  render() {
    const configuredProviders = providerOrder.filter(
      (p) => this.dashboard?.providers?.[p]?.configured
    ).length;

    const logo = html`
      <div class="flex items-center justify-between w-full">
        <div class="flex items-center gap-2.5 min-w-0">
          <img
            src=${WEB_APP_ICON_ROUTE}
            alt="PeerView"
            width="28"
            height="28"
            class="rounded-lg flex-none"
          />
          <span class="font-semibold text-sm tracking-tight text-sidebar-foreground">PeerView</span>
        </div>
        <cr-theme-toggle .theme=${this.uiTheme}></cr-theme-toggle>
      </div>
    `;

    const content = html`
      <nav class="flex flex-col gap-1 -mx-4 -mt-2" aria-label="Main navigation">
        ${this.renderNavLink("overview", "Overview")}
        ${providerOrder.map((p) => this.renderNavLink(p, providerLabels[p]))}
        ${this.renderNavLink("settings", "Settings")}
      </nav>

      <div class="flex flex-col gap-1.5 -mx-4 mt-3 pt-3 border-t border-sidebar-border">
        <div class="flex items-center gap-2 px-2.5 text-xs text-muted-foreground" title="${configuredProviders}/3 providers configured">
          <cr-icon .icon=${LayoutDashboard} .size=${12}></cr-icon>
          <span>${configuredProviders}/3 providers</span>
        </div>
        <div class="flex items-center gap-2 px-2.5 text-xs text-muted-foreground" title="${this.selectedAgentCount || 1} active agents">
          <cr-icon .icon=${BrainCircuit} .size=${12}></cr-icon>
          <span>${this.selectedAgentCount || 1} agents</span>
        </div>
        ${this.repositoryLabel
          ? html`
              <div class="flex items-center gap-2 px-2.5 text-xs text-muted-foreground font-mono truncate" title=${this.repositoryLabel}>
                <cr-icon .icon=${GitBranch} .size=${12}></cr-icon>
                <span class="truncate">${this.repositoryLabel}</span>
              </div>
            `
          : ""}
      </div>
    `;

    return html`
      <mini-sidebar
        breakpoint="lg"
        .logo=${logo}
        .content=${content}
        .footer=${html``}
        .className=${"cr-app-sidebar"}
      ></mini-sidebar>
    `;
  }
}
