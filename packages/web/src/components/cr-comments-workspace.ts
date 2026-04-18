import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { Bot, MessageSquare, ScrollText } from "lucide";
import { Alert } from "@mariozechner/mini-lit/dist/Alert.js";
import { Button } from "@mariozechner/mini-lit/dist/Button.js";
import type {
  ReviewDiscussionThread,
  ReviewTarget,
  ReviewWorkflowResult,
} from "../types.js";
import "./cr-icon.js";
import "./cr-discussion-thread.js";

@customElement("cr-comments-workspace")
export class CrCommentsWorkspace extends LitElement {
  @property({ attribute: false }) detail!: ReviewTarget;
  @property({ attribute: false }) reviewResult: ReviewWorkflowResult | null = null;
  @property({ attribute: false }) summaryResult: ReviewWorkflowResult | null = null;
  @property() summaryDraft = "";
  @property({ type: Boolean }) postingSummary = false;
  @property({ attribute: false }) discussions: ReviewDiscussionThread[] = [];
  @property({ type: Boolean }) loadingDiscussions = false;
  @property() discussionsError = "";
  @property() replyingToThreadId = "";
  @property() discussionReplyDraft = "";
  @property({ type: Boolean }) postingDiscussionReply = false;
  @property() editingDiscussionMessageId = "";
  @property() editingDiscussionDraft = "";
  @property({ type: Boolean }) savingDiscussionMessage = false;
  @property() deletingDiscussionMessageId = "";

  override createRenderRoot() {
    return this;
  }

  private emit(name: string, detail?: unknown) {
    this.dispatchEvent(
      new CustomEvent(name, { detail, bubbles: true, composed: true })
    );
  }

  render() {
    if (this.detail.provider === "reviewboard") {
      return html`
        <div class="flex h-full items-center justify-center">
          <div class="cr-empty-state max-w-md">
            <div class="cr-empty-state__icon">
              <cr-icon .icon=${MessageSquare} .size=${28}></cr-icon>
            </div>
            <div class="cr-empty-state__title">
              Not available for Review Board
            </div>
            <div class="cr-empty-state__description">
              Discussion threading is not exposed in this workspace yet. Use
              the provider page to open the review request and post summary
              feedback.
            </div>
          </div>
        </div>
      `;
    }

    return html`
      <div class="cr-comments-workspace flex h-full min-h-0 flex-col gap-3">
        <!-- Composer -->
        <section class="cr-discussion-composer">
          <div class="cr-discussion-composer__header">
            <div class="cr-discussion-composer__assist">
              ${this.reviewResult
                ? Button({ variant: "ghost", size: "sm", className: "gap-1.5 rounded-[0.7rem]",
                    onClick: () => this.emit("summary-draft-change", this.reviewResult?.overallSummary || this.reviewResult?.output || ""),
                    children: html`<cr-icon .icon=${Bot} .size=${12}></cr-icon> Insert AI review`
                  })
                : ""}
              ${this.summaryResult
                ? Button({ variant: "ghost", size: "sm", className: "gap-1.5 rounded-[0.7rem]",
                    onClick: () => this.emit("summary-draft-change", this.summaryResult?.output || ""),
                    children: html`<cr-icon .icon=${ScrollText} .size=${12}></cr-icon> Insert summary`
                  })
                : ""}
            </div>
          </div>

          <form
            class="cr-discussion-composer__form"
            @submit=${(event: Event) => {
              event.preventDefault();
              this.emit("post-summary-comment", this.summaryDraft.trim());
            }}
          >
            <textarea
              class="cr-textarea min-h-28 text-sm cr-discussion-composer__textarea w-full"
              rows="5"
              placeholder="Write a comment"
              .value=${this.summaryDraft}
              @input=${(e: Event) => {
                this.emit(
                  "summary-draft-change",
                  (e.target as HTMLTextAreaElement).value
                );
              }}
            ></textarea>
            <div class="cr-discussion-composer__footer">
              ${Button({ variant: "default", size: "sm", className: "gap-1.5", type: "submit",
                disabled: this.postingSummary || !this.summaryDraft.trim(),
                loading: this.postingSummary,
                children: "Post comment"
              })}
            </div>
          </form>
        </section>

        <!-- Discussion feed -->
        <section class="cr-discussion-feed">
          <div class="cr-discussion-feed__body">
            ${this.loadingDiscussions
              ? html`
                  <div class="cr-loader-shell">
                    <span class="cr-spinner cr-spinner--sm"></span>
                    <span class="text-sm text-foreground/50">Loading discussions…</span>
                  </div>
                `
              : this.discussionsError
                ? Alert({ variant: "default", className: "bg-muted text-sm", children: this.discussionsError })
                : this.discussions.length === 0
                  ? html`
                      <div class="cr-empty-state" style="min-height:10rem">
                        <div class="cr-empty-state__icon">
                          <cr-icon
                            .icon=${MessageSquare}
                            .size=${24}
                          ></cr-icon>
                        </div>
                        <div class="cr-empty-state__title">
                          No comments yet
                        </div>
                        <div class="cr-empty-state__description">
                          Start the conversation above or add an inline note
                          from the Diff tab.
                        </div>
                      </div>
                    `
                  : html`
                      <div class="flex flex-col gap-4">
                        ${this.discussions.map(
                          (thread) => html`
                            <cr-discussion-thread
                              .thread=${thread}
                              .replyingToThreadId=${this.replyingToThreadId}
                              .discussionReplyDraft=${this.discussionReplyDraft}
                              .postingReply=${this.postingDiscussionReply}
                              .editingMessageId=${this.editingDiscussionMessageId}
                              .editingDraft=${this.editingDiscussionDraft}
                              .savingEdit=${this.savingDiscussionMessage}
                              .deletingMessageId=${this.deletingDiscussionMessageId}
                              .allowMessageMutations=${this.detail.provider !==
                              "reviewboard"}
                            ></cr-discussion-thread>
                          `
                        )}
                      </div>
                    `}
          </div>
        </section>
      </div>
    `;
  }
}
