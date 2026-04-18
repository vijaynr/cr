import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { Bot, Sparkles, X } from "lucide";
import { Badge } from "@mariozechner/mini-lit/dist/Badge.js";
import { Button } from "@mariozechner/mini-lit/dist/Button.js";
import type {
  ProviderId,
  ProviderRepositoryOption,
  ReviewAgentOption,
  ReviewChatContext,
  ReviewChatHistoryEntry,
  ReviewTarget,
  ReviewWorkflowResult,
} from "../types.js";
import { providerLabels } from "../types.js";
import "./cr-icon.js";
import "./cr-review-panel.js";
import "./cr-summary-panel.js";
import "./cr-chat-panel.js";

type AnalysisTab = "review" | "summary" | "chat";

@customElement("cr-analysis-rail")
export class CrAnalysisRail extends LitElement {
  @property() provider: ProviderId = "gitlab";
  @property({ attribute: false }) detailTarget: ReviewTarget | null = null;
  @property() analysisTab: AnalysisTab = "review";
  @property({ type: Boolean }) open = false;
  @property({ attribute: false }) selectedRepository: ProviderRepositoryOption | null = null;
  @property({ type: Boolean }) canRunWorkflows = false;
  @property({ attribute: false }) agentOptions: ReviewAgentOption[] = [];
  @property({ attribute: false }) selectedAgents: string[] = [];
  @property({ type: Boolean }) inlineCommentsEnabled = true;
  @property() feedbackDraft = "";
  @property({ type: Boolean }) runningReview = false;
  @property({ type: Boolean }) postingGeneratedReview = false;
  @property({ attribute: false }) reviewResult: ReviewWorkflowResult | null = null;
  @property({ attribute: false }) reviewWarnings: string[] = [];
  @property({ type: Boolean }) runningSummary = false;
  @property({ attribute: false }) summaryResult: ReviewWorkflowResult | null = null;
  @property({ attribute: false }) chatContext: ReviewChatContext | null = null;
  @property({ attribute: false }) chatHistory: ReviewChatHistoryEntry[] = [];
  @property() chatQuestion = "";
  @property({ type: Boolean }) loadingChat = false;

  override createRenderRoot() { return this; }

  private emit(name: string, detail?: unknown) {
    this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }));
  }

  private formatLabel(value: string) {
    const n = value.replace(/[_-]+/g, " ").trim();
    return n ? n.charAt(0).toUpperCase() + n.slice(1) : "";
  }

  render() {
    const label = providerLabels[this.provider];
    const detail = this.detailTarget;

    return html`
      <section
        class="fixed inset-0 z-40 ${this.open ? "pointer-events-auto" : "pointer-events-none"}"
        aria-hidden=${String(!this.open)}
      >
        <button
          type="button"
          class="absolute inset-0 bg-black/40 transition-opacity duration-200 border-0
            ${this.open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}"
          ?disabled=${!this.open}
          aria-label="Close AI Assistant"
          @click=${() => this.emit("close-analysis-panel")}
        ></button>

        <aside class="absolute top-0 right-0 h-dvh w-[min(38rem,100vw-1rem)] bg-card border-l border-border
          flex flex-col overflow-hidden shadow-xl transition-all duration-300
          ${this.open ? "opacity-100 translate-x-0" : "opacity-0 translate-x-8 pointer-events-none"}">

          <header class="flex items-start justify-between gap-3 p-4 border-b border-border">
            <div class="flex flex-col gap-1 min-w-0">
              <div class="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                <cr-icon .icon=${Sparkles} .size=${13}></cr-icon>
                ${detail ? "Merge request context" : "Assistant ready"}
              </div>
              <h2 class="text-lg font-bold text-foreground leading-tight">AI Assistant</h2>
              <div class="text-sm text-muted-foreground">
                ${detail
                  ? `Loaded for ${label} ${detail.provider === "gitlab" ? `!${detail.id}` : `#${detail.id}`} · ${detail.title}`
                  : this.selectedRepository
                    ? "Open a review request to review, summarize, or chat with its context."
                    : `Choose a ${label} repository, then open a review request to start.`}
              </div>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              ${detail
                ? Badge({ variant: "default", className: "text-xs", children: label })
                : Badge({ variant: "secondary", className: "text-xs", children: "Standby" })}
              ${Button({ variant: "ghost", size: "icon",
                onClick: () => this.emit("close-analysis-panel"),
                title: "Close AI Assistant",
                children: html`<cr-icon .icon=${X} .size=${16}></cr-icon>`
              })}
            </div>
          </header>

          <nav class="flex border-b border-border bg-muted/50 px-1">
            ${(["review", "summary", "chat"] as AnalysisTab[]).map(
              (tab) => html`
                <button
                  type="button"
                  class="px-3 py-2 text-xs font-medium transition-colors
                    ${this.analysisTab === tab
                      ? "text-foreground bg-card border-b-2 border-primary"
                      : "text-muted-foreground hover:text-foreground"}"
                  @click=${() => this.emit("analysis-tab-change", tab)}
                >${this.formatLabel(tab)}</button>
              `
            )}
          </nav>

          <div class="flex flex-col flex-auto min-h-0 p-4 overflow-hidden">
            ${!detail
              ? html`
                  <div class="cr-empty-state" style="min-height:12rem">
                    <div class="cr-empty-state__icon"><cr-icon .icon=${Bot} .size=${24}></cr-icon></div>
                    <div class="cr-empty-state__title">AI Assistant</div>
                    <div class="cr-empty-state__description">
                      ${this.selectedRepository
                        ? "Open a review request from the queue to load its context into the assistant."
                        : `Choose a ${label} repository, then open a review request to start.`}
                    </div>
                  </div>
                `
              : this.analysisTab === "review"
                ? html`<cr-review-panel
                    .agentOptions=${this.agentOptions} .selectedAgents=${this.selectedAgents}
                    .inlineCommentsEnabled=${this.inlineCommentsEnabled} .feedbackDraft=${this.feedbackDraft}
                    .runningReview=${this.runningReview} .postingGeneratedReview=${this.postingGeneratedReview}
                    .reviewResult=${this.reviewResult} .reviewWarnings=${this.reviewWarnings}
                    .canRunWorkflows=${this.canRunWorkflows}
                  ></cr-review-panel>`
                : this.analysisTab === "summary"
                  ? html`<cr-summary-panel
                      .runningSummary=${this.runningSummary} .summaryResult=${this.summaryResult}
                      .canRunWorkflows=${this.canRunWorkflows}
                    ></cr-summary-panel>`
                  : html`<cr-chat-panel
                      .chatContext=${this.chatContext} .chatHistory=${this.chatHistory}
                      .chatQuestion=${this.chatQuestion} .loadingChat=${this.loadingChat}
                      .canRunWorkflows=${this.canRunWorkflows}
                    ></cr-chat-panel>`}
          </div>
        </aside>
      </section>
    `;
  }
}
