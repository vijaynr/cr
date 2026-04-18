import { LitElement, html, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import { Alert } from "@mariozechner/mini-lit/dist/Alert.js";
import { Button } from "@mariozechner/mini-lit/dist/Button.js";
import "./cr-icon.js";

type SelectedInlineTarget = {
  filePath: string;
  line: number;
  positionType: "new" | "old";
  text: string;
  key: string;
  anchorTop: number;
  anchorLeft: number;
};

const sectionEyebrowClass =
  "text-[0.72rem] font-semibold tracking-[0.08em] text-foreground/40";

@customElement("cr-inline-comment-popover")
export class CrInlineCommentPopover extends LitElement {
  @property({ attribute: false }) selectedLine: SelectedInlineTarget | null =
    null;
  @property() inlineDraft = "";
  @property({ type: Boolean }) postingInline = false;
  @property({ type: Boolean }) isReviewBoard = false;

  override createRenderRoot() {
    return this;
  }

  private emit(name: string, detail?: unknown) {
    this.dispatchEvent(
      new CustomEvent(name, { detail, bubbles: true, composed: true })
    );
  }

  private popoverStyle() {
    if (typeof window === "undefined" || !this.selectedLine) {
      return "";
    }

    const popoverWidth = Math.min(384, window.innerWidth - 32);
    const maxLeft = Math.max(16, window.innerWidth - popoverWidth - 16);
    const left = Math.min(
      Math.max(16, this.selectedLine.anchorLeft - popoverWidth - 14),
      maxLeft
    );
    const top = Math.min(
      Math.max(16, this.selectedLine.anchorTop - 28),
      Math.max(16, window.innerHeight - 160)
    );

    return `left:${left}px;top:${top}px;position:fixed;z-index:30;width:${popoverWidth}px;`;
  }

  render() {
    if (!this.selectedLine) return nothing;

    return html`
      <div
        class="rounded-[0.75rem] border border-border bg-card/98 p-4 backdrop-blur-md"
        style="${this.popoverStyle()}box-shadow: 0 4px 16px rgba(0,0,0,0.2)"
      >
        <div class="flex items-start justify-between gap-3">
          <div>
            <h3 class="text-sm font-semibold text-foreground/92">
              Inline comment
            </h3>
            <div class=${sectionEyebrowClass}>Comment on selected line</div>
          </div>
          ${Button({ variant: "ghost", size: "sm",
            onClick: () => this.emit("close-inline"),
            children: "Close"
          })}
        </div>

        <div
          class="mt-3 rounded-[0.7rem] border border-primary/20 bg-primary/8 px-3 py-3 text-xs"
        >
          <div class="font-mono text-primary">
            ${this.selectedLine.filePath}:${this.selectedLine.line}
            (${this.selectedLine.positionType})
          </div>
          <div class="mt-1 truncate font-mono text-foreground/55">
            ${this.selectedLine.text}
          </div>
        </div>

        ${this.isReviewBoard
          ? Alert({ variant: "default", className: "bg-muted mt-3 text-xs", children: "Inline comments are not available for Review Board in this workspace." })
          : ""}

        <div class="mt-3 flex flex-col gap-3">
          <textarea
            class="cr-textarea min-h-28 text-sm w-full"
            rows="5"
            placeholder="Write a precise inline note"
            .value=${this.inlineDraft}
            @input=${(e: Event) => {
              this.emit(
                "inline-draft-change",
                (e.target as HTMLTextAreaElement).value
              );
            }}
          ></textarea>
          <div class="flex items-center justify-between gap-2">
            <div class="text-xs text-foreground/50">
              Inline feedback posts directly to the provider thread for this
              line.
            </div>
            ${Button({ variant: "default", size: "sm", className: "gap-1.5", type: "button",
              disabled: this.postingInline || this.isReviewBoard || !this.inlineDraft.trim(),
              loading: this.postingInline,
              onClick: () => this.emit("post-inline-comment"),
              children: this.postingInline ? "Posting…" : "Post inline"
            })}
          </div>
        </div>
      </div>
    `;
  }
}
