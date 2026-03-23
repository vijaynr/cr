import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { MessageSquare, RefreshCw, Send } from "lucide";
import type { ReviewChatContext, ReviewChatHistoryEntry } from "../types.js";
import "./cr-icon.js";
import { renderMarkdown } from "./render-markdown.js";

@customElement("cr-chat-panel")
export class CrChatPanel extends LitElement {
  @property({ attribute: false }) chatContext: ReviewChatContext | null = null;
  @property({ attribute: false }) chatHistory: ReviewChatHistoryEntry[] = [];
  @property() chatQuestion = "";
  @property({ type: Boolean }) loadingChat = false;
  @property({ type: Boolean }) canRunWorkflows = false;

  override createRenderRoot() {
    return this;
  }

  private emit(name: string, detail?: unknown) {
    this.dispatchEvent(
      new CustomEvent(name, { detail, bubbles: true, composed: true })
    );
  }

  override updated(changed: Map<string, unknown>) {
    super.updated(changed);
    if (changed.has("chatHistory") || changed.has("loadingChat")) {
      const feed = this.querySelector(".cr-chat-feed");
      if (feed) {
        requestAnimationFrame(() => {
          feed.scrollTop = feed.scrollHeight;
        });
      }
    }
  }

  render() {
    if (!this.canRunWorkflows) {
      return html`
        <div class="cr-chat-shell">
          <div class="alert alert-warning text-xs">
            Chat requires a connected repository source.
          </div>
        </div>
      `;
    }

    if (!this.chatContext) {
      return html`
        <div class="cr-chat-shell cr-chat-shell--empty">
          <div class="cr-chat-empty">
            <div class="cr-chat-empty__icon">
              <cr-icon .icon=${MessageSquare} .size=${28}></cr-icon>
            </div>
            <div class="cr-chat-empty__title">Start a conversation</div>
            <div class="cr-chat-empty__desc">
              Load the review context to ask questions about risks, test gaps,
              intent, or specific files.
            </div>
            <button
              class="btn btn-primary btn-sm gap-1.5 mt-2"
              type="button"
              ?disabled=${this.loadingChat}
              @click=${() => this.emit("load-chat-context")}
            >
              ${this.loadingChat
                ? html`<span class="loading loading-spinner loading-xs"></span>`
                : html`<cr-icon .icon=${MessageSquare} .size=${14}></cr-icon>`}
              ${this.loadingChat ? "Loading…" : "Load context"}
            </button>
          </div>
        </div>
      `;
    }

    return html`
      <div class="cr-chat-shell">
        <!-- Context bar -->
        <div class="cr-chat-context-bar">
          <div class="cr-chat-context-bar__text">
            Context loaded
          </div>
          <button
            class="btn btn-ghost btn-xs gap-1"
            type="button"
            ?disabled=${this.loadingChat}
            @click=${() => this.emit("load-chat-context")}
          >
            <cr-icon .icon=${RefreshCw} .size=${12}></cr-icon>
            Refresh
          </button>
        </div>

        <!-- Message feed -->
        <div class="cr-chat-feed">
          ${this.chatHistory.length === 0
            ? html`
                <div class="cr-chat-feed__hint">
                  Ask about risks, intent, test coverage, or a specific diff chunk.
                </div>
              `
            : this.chatHistory.flatMap((entry) => [
                html`
                  <div class="cr-chat-msg cr-chat-msg--user">
                    <div class="cr-chat-msg__bubble cr-chat-msg__bubble--user">
                      ${entry.question}
                    </div>
                  </div>
                `,
                html`
                  <div class="cr-chat-msg cr-chat-msg--assistant">
                    <div class="cr-chat-msg__bubble cr-chat-msg__bubble--assistant">
                      ${renderMarkdown(entry.answer, {
                        className: "cr-markdown--muted",
                        emptyText: "No response returned.",
                      })}
                    </div>
                  </div>
                `,
              ])}
          ${this.loadingChat
            ? html`
                <div class="cr-chat-msg cr-chat-msg--assistant">
                  <div class="cr-chat-msg__bubble cr-chat-msg__bubble--assistant cr-chat-msg__bubble--typing">
                    <span class="cr-chat-typing">
                      <span></span><span></span><span></span>
                    </span>
                  </div>
                </div>
              `
            : ""}
        </div>

        <!-- Input -->
        <div class="cr-chat-input">
          <textarea
            class="cr-chat-input__field"
            rows="1"
            placeholder="Ask a question…"
            .value=${this.chatQuestion}
            @input=${(e: Event) => {
              const el = e.target as HTMLTextAreaElement;
              this.emit("question-change", el.value);
              el.style.height = "auto";
              el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
            }}
            @keydown=${(e: KeyboardEvent) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                this.emit("ask-question");
              }
            }}
          ></textarea>
          <button
            class="cr-chat-input__send"
            type="button"
            ?disabled=${this.loadingChat || !this.chatQuestion.trim()}
            @click=${() => this.emit("ask-question")}
            aria-label="Send"
          >
            <cr-icon .icon=${Send} .size=${15}></cr-icon>
          </button>
        </div>
      </div>
    `;
  }
}
