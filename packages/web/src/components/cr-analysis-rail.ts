import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { Bot, Sparkles, X } from "lucide";
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

  // Review panel props
  @property({ attribute: false }) agentOptions: ReviewAgentOption[] = [];
  @property({ attribute: false }) selectedAgents: string[] = [];
  @property({ type: Boolean }) inlineCommentsEnabled = true;
  @property() feedbackDraft = "";
  @property({ type: Boolean }) runningReview = false;
  @property({ type: Boolean }) postingGeneratedReview = false;
  @property({ attribute: false }) reviewResult: ReviewWorkflowResult | null = null;
  @property({ attribute: false }) reviewWarnings: string[] = [];

  // Summary panel props
  @property({ type: Boolean }) runningSummary = false;
  @property({ attribute: false }) summaryResult: ReviewWorkflowResult | null = null;

  // Chat panel props
  @property({ attribute: false }) chatContext: ReviewChatContext | null = null;
  @property({ attribute: false }) chatHistory: ReviewChatHistoryEntry[] = [];
  @property() chatQuestion = "";
  @property({ type: Boolean }) loadingChat = false;

  override createRenderRoot() {
    return this;
  }

  private emit(name: string, detail?: unknown) {
    this.dispatchEvent(
      new CustomEvent(name, { detail, bubbles: true, composed: true })
    );
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
        class="cr-assistant-overlay"
        data-open=${String(this.open)}
        aria-hidden=${String(!this.open)}
      >
        <button
          type="button"
          class="cr-assistant-overlay__backdrop"
          ?disabled=${!this.open}
          aria-label="Close AI Assistant"
          @click=${() => this.emit("close-analysis-panel")}
        ></button>

        <aside class="cr-assistant-overlay__panel">
          <header class="cr-assistant-overlay__header">
            <div class="cr-assistant-overlay__header-copy">
              <div class="cr-assistant-overlay__eyebrow">
                <cr-icon .icon=${Sparkles} .size=${13}></cr-icon>
                ${detail ? "Merge request context" : "Assistant ready"}
              </div>
              <h2 class="cr-assistant-overlay__title">AI Assistant</h2>
              <div class="cr-assistant-overlay__subtitle">
                ${detail
                  ? `Loaded for ${label} ${detail.provider === "gitlab" ? `!${detail.id}` : `#${detail.id}`} · ${detail.title}`
                  : this.selectedRepository
                    ? "Open a review request to review, summarize, or chat with its context."
                    : `Choose a ${label} repository, then open a review request to start.`}
              </div>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              ${detail
                ? html`<div class="badge badge-primary badge-sm">${label}</div>`
                : html`<div class="badge badge-ghost badge-sm">Standby</div>`}
              <button
                class="btn btn-ghost btn-sm btn-square"
                type="button"
                @click=${() => this.emit("close-analysis-panel")}
                aria-label="Close AI Assistant"
                title="Close AI Assistant"
              >
                <cr-icon .icon=${X} .size=${16}></cr-icon>
              </button>
            </div>
          </header>

          <nav class="cr-panel-tabs">
            ${(["review", "summary", "chat"] as AnalysisTab[]).map(
              (tab) => html`
                <button
                  type="button"
                  class="cr-panel-tab ${this.analysisTab === tab ? "cr-panel-tab--active" : ""}"
                  @click=${() => this.emit("analysis-tab-change", tab)}
                >
                  ${this.formatLabel(tab)}
                </button>
              `
            )}
          </nav>

          <div class="cr-assistant-overlay__content">
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
                ? html`
                    <cr-review-panel
                      .agentOptions=${this.agentOptions}
                      .selectedAgents=${this.selectedAgents}
                      .inlineCommentsEnabled=${this.inlineCommentsEnabled}
                      .feedbackDraft=${this.feedbackDraft}
                      .runningReview=${this.runningReview}
                      .postingGeneratedReview=${this.postingGeneratedReview}
                      .reviewResult=${this.reviewResult}
                      .reviewWarnings=${this.reviewWarnings}
                      .canRunWorkflows=${this.canRunWorkflows}
                    ></cr-review-panel>
                  `
                : this.analysisTab === "summary"
                  ? html`
                      <cr-summary-panel
                        .runningSummary=${this.runningSummary}
                        .summaryResult=${this.summaryResult}
                        .canRunWorkflows=${this.canRunWorkflows}
                      ></cr-summary-panel>
                    `
                  : html`
                      <cr-chat-panel
                        .chatContext=${this.chatContext}
                        .chatHistory=${this.chatHistory}
                        .chatQuestion=${this.chatQuestion}
                        .loadingChat=${this.loadingChat}
                        .canRunWorkflows=${this.canRunWorkflows}
                      ></cr-chat-panel>
                    `}
          </div>
        </aside>
      </section>
    `;
  }
}
