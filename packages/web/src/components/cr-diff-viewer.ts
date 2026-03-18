import { LitElement, html } from "lit";
import { FileDiff, MessageSquareMore } from "lucide";
import { parseUnifiedDiff } from "../diff.js";
import type { ParsedDiffLine, ReviewDiffFile } from "../types.js";
import "./cr-icon.js";

export class CrDiffViewer extends LitElement {
  static properties = {
    files: { attribute: false },
    selectedFileId: {},
    selectedPatch: {},
    selectedLineKey: {},
    loading: { type: Boolean },
    error: {},
  };

  override createRenderRoot() { return this; }

  declare files: ReviewDiffFile[];
  declare selectedFileId: string;
  declare selectedPatch: string;
  declare selectedLineKey: string;
  declare loading: boolean;
  declare error: string;

  constructor() {
    super();
    this.files = [];
    this.selectedFileId = "";
    this.selectedPatch = "";
    this.selectedLineKey = "";
    this.loading = false;
    this.error = "";
  }

  private chooseFile(file: ReviewDiffFile) {
    this.dispatchEvent(
      new CustomEvent("file-selected", {
        detail: file,
        bubbles: true,
        composed: true,
      })
    );
  }

  private chooseLine(file: ReviewDiffFile, line: ParsedDiffLine) {
    if (!line.commentable || !line.positionType) {
      return;
    }

    const targetLine = line.positionType === "old" ? line.oldLineNumber : line.newLineNumber;
    if (!targetLine) {
      return;
    }

    this.dispatchEvent(
      new CustomEvent("line-selected", {
        detail: {
          filePath: file.path,
          line: targetLine,
          positionType: line.positionType,
          text: line.text,
          key: `${file.path}:${line.positionType}:${targetLine}`,
        },
        bubbles: true,
        composed: true,
      })
    );
  }

  render() {
    const selectedFile =
      this.files.find((file) => file.id === this.selectedFileId) ?? this.files[0];
    const parsedLines = parseUnifiedDiff(this.selectedPatch);

    return html`
      <style>
        .diff-line[data-kind="add"] { background: rgba(34,197,94,0.1); }
        .diff-line[data-kind="remove"] { background: rgba(239,68,68,0.1); }
        .diff-line[data-kind="header"] { background: rgba(148,163,184,0.07); color: #94a3b8; }
        .diff-line[data-active="true"] { outline: 2px solid rgba(99,102,241,0.5); outline-offset: -1px; }
      </style>
      <div class="grid min-h-0 rounded-xl overflow-hidden border border-base-300 bg-base-100"
           style="grid-template-columns: 240px minmax(0, 1fr)">
        <!-- file list sidebar -->
        <div class="bg-base-200 border-r border-base-300 p-3 flex flex-col gap-1 overflow-auto">
          ${this.files.map(
            (file) => html`
              <button
                class="btn btn-ghost btn-xs justify-start gap-2 font-mono text-left ${file.id === this.selectedFileId ? "btn-active" : ""}"
                type="button"
                @click=${() => this.chooseFile(file)}
              >
                <cr-icon .icon=${FileDiff} .size=${14}></cr-icon>
                <span class="truncate">${file.path}</span>
              </button>
            `
          )}
        </div>

        <!-- diff viewer -->
        <div class="overflow-auto bg-[#0d141d] font-mono text-xs">
          ${
            this.loading
              ? html`<div class="p-4 text-base-content/50">Loading diff…</div>`
              : this.error
                ? html`<div class="p-4 text-error">${this.error}</div>`
                : !selectedFile
                  ? html`<div class="p-4 text-base-content/50">Pick a file to inspect its patch.</div>`
                  : parsedLines.length === 0
                    ? html`<div class="p-4 text-base-content/50">No textual patch is available for this file.</div>`
                    : parsedLines.map(
                        (line) => html`
                          <div
                            class="diff-line grid gap-3 px-4 border-b border-base-100/5 leading-relaxed"
                            style="grid-template-columns: 3.5rem 3.5rem 1fr auto"
                            data-kind=${line.kind}
                            data-active=${String(
                              selectedFile &&
                                this.selectedLineKey === this.lineKey(selectedFile, line)
                            )}
                          >
                            <span class="text-right text-base-content/30 py-1.5">${line.oldLineNumber ?? ""}</span>
                            <span class="text-right text-base-content/30 py-1.5">${line.newLineNumber ?? ""}</span>
                            <pre class="py-1.5 whitespace-pre-wrap break-words m-0">${line.text}</pre>
                            ${
                              line.commentable
                                ? html`
                                  <button
                                    class="btn btn-ghost btn-xs gap-1 my-0.5"
                                    type="button"
                                    @click=${() => this.chooseLine(selectedFile, line)}
                                  >
                                    <cr-icon .icon=${MessageSquareMore} .size=${12}></cr-icon>
                                    Comment
                                  </button>
                                `
                                : html`<span></span>`
                            }
                          </div>
                        `
                      )
          }
        </div>
      </div>
    `;
  }

  private lineKey(file: ReviewDiffFile, line: ParsedDiffLine): string {
    const lineNumber = line.positionType === "old" ? line.oldLineNumber : line.newLineNumber;
    return `${file.path}:${line.positionType ?? "new"}:${lineNumber ?? 0}`;
  }
}

customElements.define("cr-diff-viewer", CrDiffViewer);
