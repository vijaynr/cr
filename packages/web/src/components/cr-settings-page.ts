import { LitElement, html, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import {
  BrainCircuit,
  Check,
  ChevronRight,
  GitBranch,
  Globe,
  KeyRound,
  Lock,
  Radio,
  RotateCcw,
  Save,
  Server,
  Shield,
  Webhook,
  Zap,
} from "lucide";
import { Badge } from "@mariozechner/mini-lit/dist/Badge.js";
import { Button } from "@mariozechner/mini-lit/dist/Button.js";
import { Checkbox } from "@mariozechner/mini-lit/dist/Checkbox.js";
import { Select } from "@mariozechner/mini-lit/dist/Select.js";
import { Switch } from "@mariozechner/mini-lit/dist/Switch.js";
import { Separator } from "@mariozechner/mini-lit/dist/Separator.js";
import { Input } from "@mariozechner/mini-lit/dist/Input.js";
import type {
  DashboardData,
  ReviewAgentOption,
  TerminalTheme,
} from "../types.js";
import type { TestConnectionResult } from "../api.js";
import { isDesktop } from "../desktop-bridge.js";
import "./cr-icon.js";

type ConfigDraft = {
  openaiApiUrl: string;
  openaiApiKey: string;
  openaiModel: string;
  defaultReviewAgents: string[];
  gitlabUrl: string;
  gitlabKey: string;
  githubUrl: string;
  githubToken: string;
  rbUrl: string;
  rbToken: string;
  gitlabWebhookSecret: string;
  githubWebhookSecret: string;
  rbWebhookSecret: string;
  sslCertPath: string;
  sslKeyPath: string;
  sslCaPath: string;
  webhookConcurrency: string;
  webhookQueueLimit: string;
  webhookJobTimeoutMs: string;
  terminalTheme: TerminalTheme | "";
  gitlabEnabled: boolean;
  githubEnabled: boolean;
  reviewboardEnabled: boolean;
  gitlabWebhookEnabled: boolean;
  githubWebhookEnabled: boolean;
  reviewboardWebhookEnabled: boolean;
};

type TestResults = Partial<
  Record<
    "gitlab" | "github" | "reviewboard" | "openai",
    TestConnectionResult & { testing?: boolean }
  >
>;

// ── Tiny helpers ──────────────────────────────────────────────────

function statusDot(ok: boolean) {
  return html`<span class="inline-block w-2 h-2 rounded-full ${ok ? "bg-emerald-500" : "bg-destructive"} ring-2 ring-background"></span>`;
}

// ── Component ─────────────────────────────────────────────────────

@customElement("cr-settings-page")
export class CrSettingsPage extends LitElement {
  @property({ attribute: false }) configDraft!: ConfigDraft;
  @property({ attribute: false }) configBaseline!: ConfigDraft;
  @property({ attribute: false }) dashboard: DashboardData | null = null;
  @property({ attribute: false }) agentOptions: ReviewAgentOption[] = [];
  @property({ attribute: false }) testResults: TestResults = {};
  @property({ type: Boolean }) savingConfig = false;
  @property({ type: Boolean }) loadingConfig = false;

  override createRenderRoot() { return this; }

  private get configDirty() {
    return JSON.stringify(this.configDraft) !== JSON.stringify(this.configBaseline);
  }

  private emit(name: string, detail?: unknown) {
    this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }));
  }

  private handleField<K extends keyof ConfigDraft>(key: K, value: ConfigDraft[K]) {
    this.emit("config-field-change", { key, value });
  }

  // ── Reusable fragments ──────────────────────────────────────────

  private sectionHeader(icon: unknown, title: string, trailing?: unknown) {
    return html`
      <div class="flex items-center gap-3 mb-1">
        <div class="flex items-center justify-center w-8 h-8 rounded-lg bg-muted text-muted-foreground">
          <cr-icon .icon=${icon} .size=${16}></cr-icon>
        </div>
        <h2 class="text-base font-bold tracking-tight text-foreground">${title}</h2>
        ${trailing || nothing}
      </div>
    `;
  }

  private fieldRow(
    label: string,
    note: string,
    key: keyof ConfigDraft,
    opts: { type?: string; mono?: boolean } = {}
  ) {
    return html`
      <div class="flex flex-col gap-1.5">
        <label class="text-xs font-semibold tracking-wide uppercase text-muted-foreground">${label}</label>
        ${Input({
          size: "sm",
          type: (opts.type || "text") as "text" | "password",
          value: String(this.configDraft[key] ?? ""),
          placeholder: note,
          className: `w-full ${opts.mono !== false ? "font-mono" : ""}`,
          onInput: (e) => this.handleField(key, (e.target as HTMLInputElement).value as ConfigDraft[typeof key]),
        })}
      </div>
    `;
  }

  private testBtn(provider: "gitlab" | "github" | "reviewboard" | "openai") {
    const r = this.testResults[provider];
    const testing = r?.testing;
    return html`
      <div class="flex items-center gap-2.5 flex-wrap">
        ${Button({
          variant: "outline", size: "sm",
          disabled: !!testing, loading: !!testing,
          onClick: () => this.emit("test-connection", provider),
          children: html`<cr-icon .icon=${Zap} .size=${13}></cr-icon> Verify`
        })}
        ${r && !r.testing
          ? html`<span class="text-xs font-medium font-mono ${r.ok ? "text-emerald-500" : "text-destructive"}">${r.ok ? "✓ Connected" : `✗ ${r.message}`}</span>`
          : nothing}
      </div>
    `;
  }

  private providerCard(
    name: string,
    enabledKey: "gitlabEnabled" | "githubEnabled" | "reviewboardEnabled",
    testKey: "gitlab" | "github" | "reviewboard",
    configured: boolean | undefined,
    fields: Array<{ label: string; note: string; key: keyof ConfigDraft; type?: string }>
  ) {
    const enabled = this.configDraft[enabledKey] as boolean;
    return html`
      <div class="rounded-lg border border-border bg-card overflow-hidden transition-all
        ${enabled ? "" : "opacity-60"}">
        <!-- Header -->
        <div class="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-border bg-muted/30">
          <div class="flex items-center gap-3">
            ${statusDot(!!configured)}
            <span class="text-sm font-bold tracking-tight">${name}</span>
            ${configured
              ? Badge({ variant: "outline", className: "text-[0.65rem] border-emerald-500/30 text-emerald-500", children: "Connected" })
              : Badge({ variant: "secondary", className: "text-[0.65rem]", children: "Pending" })}
          </div>
          ${Switch({
            checked: enabled,
            onChange: (checked) => this.handleField(enabledKey, checked as ConfigDraft[typeof enabledKey])
          })}
        </div>
        <!-- Fields -->
        <div class="px-5 py-4 flex flex-col gap-4">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            ${fields.map((f) => this.fieldRow(f.label, f.note, f.key, { type: f.type }))}
          </div>
          ${this.testBtn(testKey)}
        </div>
      </div>
    `;
  }

  private webhookRoute(
    name: string,
    key: "gitlabWebhookEnabled" | "githubWebhookEnabled" | "reviewboardWebhookEnabled",
    route: string,
    note: string
  ) {
    const on = this.configDraft[key];
    return html`
      <div class="flex items-center justify-between gap-3 py-2.5">
        <div class="flex items-center gap-2.5 min-w-0">
          <span class="inline-block w-1.5 h-1.5 rounded-full flex-none ${on ? "bg-emerald-500" : "bg-muted-foreground/40"}"></span>
          <div class="min-w-0">
            <div class="text-sm font-medium truncate">${name}</div>
            <div class="text-xs text-muted-foreground truncate">${note}</div>
          </div>
        </div>
        <div class="flex items-center gap-3 shrink-0">
          <code class="hidden sm:block text-[0.65rem] text-muted-foreground font-mono bg-muted rounded px-1.5 py-0.5">${route}</code>
          ${Switch({ checked: on, onChange: (checked) => this.handleField(key, checked) })}
        </div>
      </div>
    `;
  }

  // ── Render ──────────────────────────────────────────────────────

  render() {
    if (this.loadingConfig && !this.dashboard) {
      return html`
        <div class="cr-fade-in flex flex-col gap-8 pb-28">
          <div>
            <h1 class="text-2xl font-bold tracking-tight">Settings</h1>
            <p class="mt-1 text-sm text-muted-foreground">Loading configuration…</p>
          </div>
          ${[1, 2, 3].map(() => html`<div class="cr-skeleton h-28 rounded-lg"></div>`)}
        </div>
      `;
    }

    const openai = this.dashboard?.config?.openai;
    const gl = this.dashboard?.config?.gitlab?.configured;
    const gh = this.dashboard?.config?.github?.configured;
    const rb = this.dashboard?.config?.reviewboard?.configured;
    const wh = this.dashboard?.config?.webhook;

    return html`
      <div class="cr-fade-in flex flex-col gap-8 pb-28">

        <!-- ─── Page header ───────────────────────────────────── -->
        <div class="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 class="text-2xl font-bold tracking-tight">Settings</h1>
            <p class="mt-1 text-sm text-muted-foreground">
              Configure providers, AI runtime, webhooks, and server options.
            </p>
          </div>
          <!-- Readiness summary pills -->
          <div class="flex gap-2 flex-wrap">
            ${this.pill("AI", !!openai?.configured)}
            ${this.pill("GitLab", !!gl)}
            ${this.pill("GitHub", !!gh)}
            ${this.pill("RB", !!rb)}
          </div>
        </div>

        <!-- ─── AI Runtime ────────────────────────────────────── -->
        <section class="flex flex-col gap-4">
          ${this.sectionHeader(BrainCircuit, "AI Runtime",
            openai?.configured
              ? Badge({ variant: "outline", className: "text-[0.65rem] border-emerald-500/30 text-emerald-500 ml-auto", children: html`<cr-icon .icon=${Check} .size=${11}></cr-icon> Ready` })
              : Badge({ variant: "destructive", className: "text-[0.65rem] ml-auto", children: "Needs setup" })
          )}

          <div class="rounded-lg border border-border bg-card overflow-hidden">
            <!-- Endpoint -->
            <div class="px-5 py-4 flex flex-col gap-4">
              <div class="flex items-center gap-2 text-xs font-semibold tracking-wide uppercase text-muted-foreground">
                <cr-icon .icon=${Globe} .size=${13}></cr-icon> Endpoint &amp; Model
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                ${this.fieldRow("API URL", "https://api.openai.com/v1", "openaiApiUrl")}
                ${this.fieldRow("API key", "sk-…", "openaiApiKey", { type: "password" })}
                ${this.fieldRow("Model", "gpt-4o", "openaiModel")}
              </div>
              ${this.testBtn("openai")}
            </div>

            ${Separator({})}

            <!-- Behaviour -->
            <div class="px-5 py-4 flex flex-col gap-4">
              <div class="flex items-center gap-2 text-xs font-semibold tracking-wide uppercase text-muted-foreground">
                <cr-icon .icon=${Zap} .size=${13}></cr-icon> Behaviour
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div class="flex flex-col gap-1.5">
                  <label class="text-xs font-semibold tracking-wide uppercase text-muted-foreground">Terminal theme</label>
                  ${Select({
                    value: this.configDraft.terminalTheme || "",
                    width: "100%", size: "sm",
                    options: [
                      { value: "", label: "Auto" },
                      { value: "light", label: "Light" },
                      { value: "dark", label: "Dark" },
                    ],
                    onChange: (v) => this.handleField("terminalTheme", v as TerminalTheme | "")
                  })}
                </div>
              </div>
            </div>

            ${Separator({})}

            <!-- Agent defaults -->
            <div class="px-5 py-4 flex flex-col gap-3">
              <div class="flex items-center gap-2 text-xs font-semibold tracking-wide uppercase text-muted-foreground">
                <cr-icon .icon=${Radio} .size=${13}></cr-icon> Default review agents
              </div>
              <div class="flex flex-wrap gap-3">
                ${this.agentOptions.map((opt) => html`
                  <label class="flex items-center gap-2 rounded-lg border border-border px-3 py-2 cursor-pointer transition-colors
                    ${this.configDraft.defaultReviewAgents.includes(opt.value) ? "bg-primary/5 border-primary/30" : "hover:bg-muted"}">
                    ${Checkbox({
                      checked: this.configDraft.defaultReviewAgents.includes(opt.value),
                      onChange: (c) => this.emit("agent-default-toggle", { value: opt.value, checked: c })
                    })}
                    <span class="text-sm font-medium">${opt.title}</span>
                  </label>
                `)}
              </div>
            </div>
          </div>
        </section>

        <!-- ─── Source Control ─────────────────────────────────── -->
        <section class="flex flex-col gap-4">
          ${this.sectionHeader(GitBranch, "Source Control")}
          <div class="flex flex-col gap-4">
            ${this.providerCard("GitLab", "gitlabEnabled", "gitlab", gl, [
              { label: "URL", note: "https://gitlab.example.com", key: "gitlabUrl" },
              { label: "Token", note: "glpat-…", key: "gitlabKey", type: "password" },
            ])}
            ${this.providerCard("GitHub", "githubEnabled", "github", gh, [
              { label: "URL", note: "Leave blank for github.com", key: "githubUrl" },
              { label: "Token", note: "ghp_…", key: "githubToken", type: "password" },
            ])}
            ${this.providerCard("Review Board", "reviewboardEnabled", "reviewboard", rb, [
              { label: "URL", note: "https://reviews.example.com", key: "rbUrl" },
              { label: "Token", note: "API token", key: "rbToken", type: "password" },
            ])}
          </div>
        </section>

        <!-- ─── Automation (hidden in desktop) ─────────────────── -->
        ${isDesktop() ? nothing : html`
        <section class="flex flex-col gap-4">
          ${this.sectionHeader(Webhook, "Automation",
            wh?.sslEnabled
              ? Badge({ variant: "outline", className: "text-[0.65rem] border-emerald-500/30 text-emerald-500 ml-auto", children: html`<cr-icon .icon=${Lock} .size=${11}></cr-icon> SSL` })
              : Badge({ variant: "secondary", className: "text-[0.65rem] ml-auto", children: "HTTP" })
          )}

          <div class="rounded-lg border border-border bg-card overflow-hidden">
            <!-- Routes -->
            <div class="px-5 py-4 flex flex-col gap-1">
              <div class="flex items-center gap-2 text-xs font-semibold tracking-wide uppercase text-muted-foreground mb-2">
                <cr-icon .icon=${ChevronRight} .size=${13}></cr-icon> Webhook routes
              </div>
              ${this.webhookRoute("GitLab", "gitlabWebhookEnabled", "/webhook/gitlab", "Merge request events")}
              ${this.webhookRoute("GitHub", "githubWebhookEnabled", "/webhook/github", "Pull request events")}
              ${this.webhookRoute("Review Board", "reviewboardWebhookEnabled", "/webhook/reviewboard", "Review published events")}
            </div>

            ${Separator({})}

            <!-- Secrets -->
            <div class="px-5 py-4 flex flex-col gap-4">
              <div class="flex items-center gap-2 text-xs font-semibold tracking-wide uppercase text-muted-foreground">
                <cr-icon .icon=${KeyRound} .size=${13}></cr-icon> Webhook secrets
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                ${this.fieldRow("GitLab secret", "Optional shared secret", "gitlabWebhookSecret", { type: "password" })}
                ${this.fieldRow("GitHub secret", "Optional shared secret", "githubWebhookSecret", { type: "password" })}
                ${this.fieldRow("RB secret", "Optional shared secret", "rbWebhookSecret", { type: "password" })}
              </div>
            </div>

            ${Separator({})}

            <!-- Queue -->
            <div class="px-5 py-4 flex flex-col gap-4">
              <div class="flex items-center gap-2 text-xs font-semibold tracking-wide uppercase text-muted-foreground">
                <cr-icon .icon=${Server} .size=${13}></cr-icon> Queue &amp; timeouts
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                ${this.fieldRow("Concurrency", "3", "webhookConcurrency", { mono: true })}
                ${this.fieldRow("Queue limit", "50", "webhookQueueLimit", { mono: true })}
                ${this.fieldRow("Timeout (ms)", "600000", "webhookJobTimeoutMs", { mono: true })}
              </div>
            </div>

            ${Separator({})}

            <!-- SSL -->
            <div class="px-5 py-4 flex flex-col gap-4">
              <div class="flex items-center gap-2 text-xs font-semibold tracking-wide uppercase text-muted-foreground">
                <cr-icon .icon=${Shield} .size=${13}></cr-icon> SSL / HTTPS
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                ${this.fieldRow("Cert path", "/path/to/cert.pem", "sslCertPath", { mono: true })}
                ${this.fieldRow("Key path", "/path/to/key.pem", "sslKeyPath", { mono: true })}
                ${this.fieldRow("CA path", "/path/to/ca.pem", "sslCaPath", { mono: true })}
              </div>
            </div>
          </div>
        </section>
        `}
      </div>

      <!-- ─── Sticky footer ─────────────────────────────────── -->
      <div class="cr-settings-footer">
        <div class="flex items-center gap-4 justify-between mx-auto max-w-[min(100%,140rem)] px-5 py-3">
          <div class="flex-1 min-w-0 text-xs text-muted-foreground font-medium">
            ${this.configDirty
              ? html`<span class="inline-flex items-center gap-1.5 text-amber-500 font-semibold">
                  <span class="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                  Unsaved changes
                </span>`
              : html`<span class="text-muted-foreground/60">All changes saved</span>`}
          </div>
          <div class="flex gap-2">
            ${Button({ variant: "ghost", size: "sm", className: "gap-1.5",
              disabled: this.savingConfig || !this.configDirty,
              onClick: () => this.emit("config-reset"),
              children: html`<cr-icon .icon=${RotateCcw} .size=${13}></cr-icon> Reset`
            })}
            ${Button({ variant: "default", size: "sm", className: "gap-1.5",
              disabled: this.savingConfig || !this.configDirty,
              loading: this.savingConfig,
              onClick: () => this.emit("config-save"),
              children: html`<cr-icon .icon=${Save} .size=${13}></cr-icon> Save`
            })}
          </div>
        </div>
      </div>
    `;
  }

  // Readiness pill for the page header
  private pill(label: string, ok: boolean) {
    return html`
      <div class="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.65rem] font-semibold tracking-wide
        ${ok
          ? "border-emerald-500/25 text-emerald-500 bg-emerald-500/5"
          : "border-destructive/25 text-destructive bg-destructive/5"}">
        ${statusDot(ok)}
        ${label}
      </div>
    `;
  }
}
