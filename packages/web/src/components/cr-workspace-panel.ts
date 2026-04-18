import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import {
  ArrowUpRight,
  Bot,
  FileDiff,
  FolderSearch,
  GitBranch,
  LayoutDashboard,
  MessageSquare,
  type IconNode,
} from "lucide";
import type {
  ProviderId,
  ProviderRepositoryOption,
  ReviewCommit,
  ReviewDiffFile,
  ReviewDiscussionThread,
  ReviewTarget,
  ReviewWorkflowResult,
} from "../types.js";
import { Alert } from "@mariozechner/mini-lit/dist/Alert.js";
import { Badge } from "@mariozechner/mini-lit/dist/Badge.js";
import { Button } from "@mariozechner/mini-lit/dist/Button.js";
import "./cr-icon.js";
import "./cr-diff-viewer.js";
import "./cr-inline-comment-popover.js";
import "./cr-comments-workspace.js";
import "./cr-commits-list.js";
import { renderMarkdown } from "./render-markdown.js";

type WorkspaceTab = "overview" | "diff" | "commits" | "comments";

type SelectedInlineTarget = {
  filePath: string;
  line: number;
  positionType: "new" | "old";
  text: string;
  key: string;
  anchorTop: number;
  anchorLeft: number;
};

@customElement("cr-workspace-panel")
export class CrWorkspacePanel extends LitElement {
  @property() provider: ProviderId = "gitlab";
  @property({ attribute: false }) detailTarget: ReviewTarget | null = null;
  @property({ attribute: false }) diffFiles: ReviewDiffFile[] = [];
  @property({ attribute: false }) commits: ReviewCommit[] = [];
  @property() selectedFileId = "";
  @property() selectedFilePatch = "";
  @property({ attribute: false }) selectedLine: SelectedInlineTarget | null = null;
  @property() workspaceTab: WorkspaceTab = "diff";
  @property({ type: Boolean }) loadingDetail = false;
  @property({ type: Boolean }) loadingDiffPatch = false;
  @property() detailError = "";
  @property({ attribute: false }) selectedRepository: ProviderRepositoryOption | null = null;
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
  @property() summaryDraft = "";
  @property({ type: Boolean }) postingSummary = false;
  @property({ attribute: false }) reviewResult: ReviewWorkflowResult | null = null;
  @property({ attribute: false }) summaryResult: ReviewWorkflowResult | null = null;
  @property() inlineDraft = "";
  @property({ type: Boolean }) postingInline = false;
  @property({ type: Boolean }) assistantOpen = false;

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

  private iconForWorkspaceTab(tab: WorkspaceTab): IconNode {
    switch (tab) {
      case "overview": return LayoutDashboard;
      case "diff": return FileDiff;
      case "commits": return GitBranch;
      case "comments": return MessageSquare;
    }
  }

  render() {
    const detail = this.detailTarget;

    return html`
      <section class="relative h-full w-full min-h-0 min-w-0 rounded-lg border border-border bg-card p-4 flex flex-col gap-3 overflow-hidden">
        ${detail
          ? this.renderContent(detail)
          : this.selectedRepository
            ? html`
                <div class="flex flex-1 items-center justify-center">
                  <div class="cr-empty-state">
                    <div class="cr-empty-state__icon"><cr-icon .icon=${FolderSearch} .size=${32}></cr-icon></div>
                    <div class="cr-empty-state__title">No review request selected</div>
                    <div class="cr-empty-state__description">Choose a review item from the queue on the left to open the workspace.</div>
                  </div>
                </div>
              `
            : html`
                <div class="flex flex-1 items-center justify-center">
                  <div class="cr-empty-state">
                    <div class="cr-empty-state__icon"><cr-icon .icon=${FolderSearch} .size=${32}></cr-icon></div>
                    <div class="cr-empty-state__title">Select a repository</div>
                    <div class="cr-empty-state__description">Choose a repository in the selector above to load review items and open the workspace.</div>
                  </div>
                </div>
              `}
      </section>
    `;
  }

  private renderContent(detail: ReviewTarget) {
    return html`
      <div class="flex items-start justify-between gap-2 flex-wrap">
        <div class="flex min-w-0 flex-col gap-1">
          <h2 class="text-base font-semibold leading-snug">
            <span class="font-mono text-primary text-sm">
              ${detail.provider === "gitlab" ? `!${detail.id}` : `#${detail.id}`}
            </span>
            ${detail.title}
          </h2>
          <div class="mt-1 flex flex-wrap gap-1.5">
            ${detail.state ? Badge({ variant: "secondary", className: "text-xs", children: this.formatLabel(detail.state) }) : ""}
            ${detail.author ? Badge({ variant: "secondary", className: "text-xs", children: detail.author }) : ""}
            ${detail.sourceBranch ? Badge({ variant: "secondary", className: "text-xs font-mono", children: detail.sourceBranch + (detail.targetBranch ? ` → ${detail.targetBranch}` : "") }) : ""}
            ${detail.updatedAt ? Badge({ variant: "secondary", className: "text-xs", children: detail.updatedAt }) : ""}
          </div>
        </div>
        <div class="flex items-center gap-2 shrink-0 flex-wrap justify-end">
          ${Button({ variant: "default", size: "sm", className: "gap-1.5 rounded-[0.8rem] shadow-sm",
            onClick: () => this.emit("open-ai-assistant"),
            children: html`<cr-icon .icon=${Bot} .size=${14}></cr-icon> AI Assistant`
          })}
          ${detail.url ? html`<a class="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-foreground/70 hover:bg-muted hover:text-foreground transition-colors" href=${detail.url} target="_blank" rel="noreferrer"><cr-icon .icon=${ArrowUpRight} .size=${12}></cr-icon>Open</a>` : ""}
        </div>
      </div>

      <div class="flex border-b border-border bg-muted/50 px-1 self-stretch">
        ${(["overview", "diff", "commits", "comments"] as WorkspaceTab[]).map(
          (tab) => html`
            <button
              type="button"
              class="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors
                ${this.workspaceTab === tab
                  ? "text-foreground bg-card border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"}"
              @click=${() => this.emit("workspace-tab-change", tab)}
            >
              <cr-icon .icon=${this.iconForWorkspaceTab(tab)} .size=${13}></cr-icon>
              ${this.formatLabel(tab)}
            </button>
          `
        )}
      </div>

      <div class="relative flex-1 min-h-0 overflow-hidden">
        ${this.detailError
          ? Alert({ variant: "destructive", className: "bg-destructive/10 text-sm", children: this.detailError })
          : this.loadingDetail
            ? html`
                <div class="cr-loader-shell">
                  <span class="cr-spinner cr-spinner--sm"></span>
                  <span class="text-sm text-foreground/50">Loading workspace…</span>
                </div>
              `
            : this.workspaceTab === "overview"
              ? html`<div class="h-full overflow-auto pr-1">${this.renderOverview(detail)}</div>`
              : this.workspaceTab === "comments"
                ? html`
                    <cr-comments-workspace
                      .detail=${detail}
                      .reviewResult=${this.reviewResult}
                      .summaryResult=${this.summaryResult}
                      .summaryDraft=${this.summaryDraft}
                      .postingSummary=${this.postingSummary}
                      .discussions=${this.discussions}
                      .loadingDiscussions=${this.loadingDiscussions}
                      .discussionsError=${this.discussionsError}
                      .replyingToThreadId=${this.replyingToThreadId}
                      .discussionReplyDraft=${this.discussionReplyDraft}
                      .postingDiscussionReply=${this.postingDiscussionReply}
                      .editingDiscussionMessageId=${this.editingDiscussionMessageId}
                      .editingDiscussionDraft=${this.editingDiscussionDraft}
                      .savingDiscussionMessage=${this.savingDiscussionMessage}
                      .deletingDiscussionMessageId=${this.deletingDiscussionMessageId}
                    ></cr-comments-workspace>
                  `
                : this.workspaceTab === "commits"
                  ? html`<div class="h-full overflow-auto pr-1"><cr-commits-list .commits=${this.commits}></cr-commits-list></div>`
                  : html`
                      <div class="relative flex h-full min-h-0 flex-col overflow-hidden">
                        <cr-diff-viewer
                          .files=${this.diffFiles}
                          .selectedFileId=${this.selectedFileId}
                          .selectedLineKey=${this.selectedLine?.key || ""}
                          .loading=${this.loadingDiffPatch}
                          .error=${this.detailError}
                          @file-selected=${(e: CustomEvent<ReviewDiffFile>) => this.emit("file-selected", e.detail)}
                          @line-selected=${(e: CustomEvent) => this.emit("line-selected", e.detail)}
                        ></cr-diff-viewer>
                        <cr-inline-comment-popover
                          .selectedLine=${this.selectedLine}
                          .inlineDraft=${this.inlineDraft}
                          .postingInline=${this.postingInline}
                          .isReviewBoard=${this.provider === "reviewboard"}
                        ></cr-inline-comment-popover>
                      </div>
                    `}
      </div>
    `;
  }

  private renderOverview(detail: ReviewTarget) {
    return html`
      <div class="flex flex-col gap-4 min-h-0">
        <div class="rounded-[0.55rem] border border-foreground/10 bg-muted px-4 py-4 flex flex-col gap-3">
          <h3 class="text-sm font-semibold">Description</h3>
          ${renderMarkdown(detail.description || detail.summary, {
            className: "cr-markdown--muted",
            emptyText: "No rich description from the provider. Use the diff and commit tabs for full review context.",
          })}
        </div>
      </div>
    `;
  }
}
