import { LitElement, html, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import { ArrowUpRight, Check, Pencil, Reply, Trash2, X } from "lucide";
import { Button } from "@mariozechner/mini-lit/dist/Button.js";
import type { ReviewDiscussionMessage, ReviewDiscussionThread } from "../types.js";
import { renderMarkdown } from "./render-markdown.js";
import "./cr-icon.js";

@customElement("cr-discussion-thread")
export class CrDiscussionThread extends LitElement {
  @property({ attribute: false }) thread!: ReviewDiscussionThread;
  @property() replyingToThreadId = "";
  @property() discussionReplyDraft = "";
  @property({ type: Boolean }) postingReply = false;
  @property() editingMessageId = "";
  @property() editingDraft = "";
  @property({ type: Boolean }) savingEdit = false;
  @property() deletingMessageId = "";
  @property({ type: Boolean }) allowMessageMutations = true;

  override createRenderRoot() {
    return this;
  }

  private get isReplying() {
    return this.replyingToThreadId === this.thread.id;
  }

  private discussionLocationLabel(
    inline?: ReviewDiscussionMessage["inline"]
  ) {
    if (!inline?.filePath) return "";
    const start = inline.line ? `:${inline.line}` : "";
    const end =
      inline.endLine && inline.endLine !== inline.line
        ? `-${inline.endLine}`
        : "";
    return `${inline.filePath}${start}${end}`;
  }

  private threadTimestamp() {
    const msgs = this.thread.messages;
    const latest = msgs[msgs.length - 1];
    return (
      latest?.updatedAt ||
      latest?.createdAt ||
      msgs[0]?.createdAt ||
      ""
    );
  }

  private emit(name: string, detail?: unknown) {
    this.dispatchEvent(
      new CustomEvent(name, { detail, bubbles: true, composed: true })
    );
  }

  private formatRelativeTime(value: string) {
    const timestamp = Date.parse(value);
    if (Number.isNaN(timestamp)) {
      return value;
    }

    const diffMs = timestamp - Date.now();
    const absMs = Math.abs(diffMs);
    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;
    const week = 7 * day;
    const month = 30 * day;
    const year = 365 * day;
    const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

    if (absMs < minute) {
      return "just now";
    }
    if (absMs < hour) {
      return formatter.format(Math.round(diffMs / minute), "minute");
    }
    if (absMs < day) {
      return formatter.format(Math.round(diffMs / hour), "hour");
    }
    if (absMs < week) {
      return formatter.format(Math.round(diffMs / day), "day");
    }
    if (absMs < month) {
      return formatter.format(Math.round(diffMs / week), "week");
    }
    if (absMs < year) {
      return formatter.format(Math.round(diffMs / month), "month");
    }

    return formatter.format(Math.round(diffMs / year), "year");
  }

  render() {
    const thread = this.thread;
    const replying = this.isReplying;
    const rootMessage = thread.messages[0];
    const rootEditing = rootMessage
      ? this.editingMessageId === rootMessage.id
      : false;
    const starter = thread.messages[0]?.author || "Reviewer";
    const lastUpdated = this.threadTimestamp();
    const location = this.discussionLocationLabel(
      thread.messages.find((m) => m.inline)?.inline
    );
    const relativeUpdated = lastUpdated
      ? `Updated ${this.formatRelativeTime(lastUpdated)}`
      : "";
    const metaItems = [
      { label: starter, kind: "default" },
      relativeUpdated ? { label: relativeUpdated, kind: "default" } : null,
      location ? { label: location, kind: "location" } : null,
      thread.resolved ? { label: "Resolved", kind: "default" } : null,
    ].filter((item): item is { label: string; kind: "default" | "location" } => item !== null);

    return html`
      <section class="cr-discussion-thread">
        <div class="cr-discussion-thread__header">
          <div class="min-w-0">
            <div class="cr-discussion-thread__meta">
              ${metaItems.map((item, index) => html`
                <span
                  class=${item.kind === "location"
                    ? "cr-discussion-thread__meta-item cr-discussion-thread__location"
                    : "cr-discussion-thread__meta-item"}
                  data-first=${index === 0 ? "true" : "false"}
                >
                  ${item.label}
                </span>
              `)}
            </div>
          </div>
          <div class="cr-discussion-thread__actions">
            ${thread.messages[0]?.url
              ? html`
                  <a
                    class="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                    href=${thread.messages[0].url}
                    target="_blank"
                    rel="noreferrer"
                    ><cr-icon .icon=${ArrowUpRight} .size=${12}></cr-icon>Open</a
                  >
                `
              : ""}
            ${thread.replyable
              ? html`
                  <button
                    class="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${replying
                      ? "border-primary/30 bg-primary/10 text-primary hover:bg-primary/20"
                      : "border-border text-foreground hover:bg-muted"}"
                    type="button"
                    @click=${() => {
                      if (replying) {
                        this.emit("cancel-reply");
                      } else {
                        this.emit("start-reply", thread);
                      }
                    }}
                  >
                    <cr-icon .icon=${replying ? X : Reply} .size=${12}></cr-icon>
                    ${replying ? "Close reply" : "Reply"}
                  </button>
                `
              : ""}
            ${this.allowMessageMutations && rootMessage && !rootEditing
              ? this.renderMessageActions(thread, rootMessage)
              : nothing}
          </div>
        </div>

        <div class="cr-discussion-thread__messages">
          ${thread.messages.map((msg, i) =>
            this.renderMessage(thread, msg, i)
          )}
        </div>

        ${replying ? this.renderReplyForm(thread) : nothing}
      </section>
    `;
  }

  private renderMessage(
    thread: ReviewDiscussionThread,
    message: ReviewDiscussionMessage,
    index: number
  ) {
    const isRoot = index === 0;
    const isEditing = this.editingMessageId === message.id;
    const author = message.author || "Reviewer";
    const timestamp = message.updatedAt || message.createdAt || "";
    const relativeTimestamp = timestamp
      ? this.formatRelativeTime(timestamp)
      : "";
    const showInlineLocation =
      Boolean(message.inline) && thread.kind !== "inline";
    const inlineLocation = this.discussionLocationLabel(message.inline);
    const showMessageMeta = !isRoot || isEditing || showInlineLocation;
    const showMessageActions =
      this.allowMessageMutations && !isEditing && !isRoot;
    const showMetaRow = showMessageMeta || showMessageActions;

    return html`
      <article
        class="cr-discussion-message ${index === 0
          ? "cr-discussion-message--root"
          : ""}"
      >
        ${showMetaRow
          ? html`
              <div class="cr-discussion-message__meta">
                <div class="cr-discussion-message__author-line">
                  ${!isRoot
                    ? html`
                        <span class="cr-discussion-message__author"
                          >${author}</span
                        >
                        ${relativeTimestamp
                          ? html`<span>${relativeTimestamp}</span>`
                          : ""}
                      `
                    : nothing}
                  ${showInlineLocation && inlineLocation
                    ? html`<span class="cr-discussion-thread__location"
                        >${inlineLocation}</span
                      >`
                    : ""}
                </div>
                <div class="flex flex-wrap items-center gap-2">
                  ${message.url
                    ? html`
                        <a
                          class="cr-discussion-message__link"
                          href=${message.url}
                          target="_blank"
                          rel="noreferrer"
                          >Open</a
                        >
                      `
                    : ""}
                  ${showMessageActions
                    ? this.renderMessageActions(thread, message)
                    : nothing}
                </div>
              </div>
            `
          : nothing}
        ${this.renderMessageBody(thread, message)}
      </article>
    `;
  }

  private renderMessageActions(
    thread: ReviewDiscussionThread,
    message: ReviewDiscussionMessage
  ) {
    const isDeleting = this.deletingMessageId === message.id;
    const disabled = this.savingEdit || isDeleting || this.postingReply;

    return html`
      <button
        type="button"
        class="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs font-medium text-foreground hover:bg-muted transition-colors"
        ?disabled=${disabled}
        @click=${() =>
          this.emit("start-edit-discussion-message", { thread, message })}
      >
        <cr-icon .icon=${Pencil} .size=${12}></cr-icon>
        Edit
      </button>
      <button
        type="button"
        class="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs font-medium text-foreground hover:bg-muted transition-colors"
        ?disabled=${disabled}
        @click=${() =>
          this.emit("delete-discussion-message", {
            threadId: thread.id,
            messageId: message.id,
          })}
      >
        ${isDeleting
          ? html`<span class="cr-spinner cr-spinner--xs"></span>`
          : html`<cr-icon .icon=${Trash2} .size=${12}></cr-icon>`}
        Delete
      </button>
    `;
  }

  private renderMessageBody(
    thread: ReviewDiscussionThread,
    message: ReviewDiscussionMessage
  ) {
    const isEditing = this.editingMessageId === message.id;

    if (!isEditing) {
      return html`
        <div class="cr-discussion-message__bubble">
          ${renderMarkdown(message.body, {
            className: "cr-markdown--muted",
            compact: true,
            emptyText: "No comment body.",
          })}
        </div>
      `;
    }

    return html`
      <form
        class="cr-discussion-edit"
        @submit=${(event: Event) => {
          event.preventDefault();
          this.emit("save-discussion-message-edit", {
            threadId: thread.id,
            messageId: message.id,
            body: this.editingDraft.trim(),
          });
        }}
      >
        <textarea
          class="cr-textarea min-h-24 text-sm w-full"
          rows="4"
          .value=${this.editingDraft}
          @input=${(e: Event) =>
            this.emit(
              "discussion-edit-draft-change",
              (e.target as HTMLTextAreaElement).value
            )}
        ></textarea>
        <div class="cr-discussion-edit__footer">
          ${Button({ variant: "ghost", size: "sm",
            onClick: () => this.emit("cancel-edit-discussion-message"),
            children: "Cancel"
          })}
          ${Button({ variant: "default", size: "sm", className: "gap-1.5", type: "submit",
            disabled: this.savingEdit || !this.editingDraft.trim(),
            loading: this.savingEdit,
            children: this.savingEdit ? "Saving…" : html`<cr-icon .icon=${Check} .size=${12}></cr-icon> Save`
          })}
        </div>
      </form>
    `;
  }

  private renderReplyForm(thread: ReviewDiscussionThread) {
    return html`
      <form
        class="cr-discussion-reply"
        @submit=${async (event: Event) => {
          event.preventDefault();
          this.emit("post-discussion-reply", {
            threadId: thread.id,
            replyTargetId: thread.replyTargetId,
            body: this.discussionReplyDraft.trim(),
          });
        }}
      >
        <textarea
          class="cr-textarea min-h-24 text-sm w-full"
          rows="4"
          placeholder="Write a reply"
          .value=${this.discussionReplyDraft}
          @input=${(e: Event) => {
            this.emit(
              "reply-draft-change",
              (e.target as HTMLTextAreaElement).value
            );
          }}
        ></textarea>
        <div class="cr-discussion-reply__footer">
          ${Button({ variant: "ghost", size: "sm",
            onClick: () => this.emit("cancel-reply"),
            children: "Cancel"
          })}
          ${Button({ variant: "default", size: "sm", className: "gap-1.5", type: "submit",
            disabled: this.postingReply || !this.discussionReplyDraft.trim(),
            loading: this.postingReply,
            children: "Post reply"
          })}
        </div>
      </form>
    `;
  }
}
