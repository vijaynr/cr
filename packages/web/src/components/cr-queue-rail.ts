import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { Search } from "lucide";
import { Select } from "@mariozechner/mini-lit/dist/Select.js";
import {
  providerLabels,
  providerQueueLabels,
  reviewStates,
  type ProviderId,
  type ProviderRepositoryOption,
  type ReviewState,
  type ReviewTarget,
} from "../types.js";
import "./cr-icon.js";
import "./cr-provider-repository-picker.js";
import "./cr-review-list.js";

@customElement("cr-queue-rail")
export class CrQueueRail extends LitElement {
  @property() provider: ProviderId = "gitlab";
  @property({ attribute: false }) targets: ReviewTarget[] = [];
  @property({ attribute: false }) selectedTarget: ReviewTarget | null = null;
  @property() stateFilter: ReviewState = "opened";
  @property() searchTerm = "";
  @property({ type: Boolean }) loadingTargets = false;
  @property() targetsError = "";
  @property({ type: Boolean }) configured = true;
  @property({ attribute: false }) selectedRepository: ProviderRepositoryOption | null = null;

  // Repository picker
  @property({ attribute: false }) repositoryOptions: ProviderRepositoryOption[] = [];
  @property({ type: Boolean }) repositoryLoading = false;
  @property() repositoryError = "";

  override createRenderRoot() {
    return this;
  }

  private emit(name: string, detail?: unknown) {
    this.dispatchEvent(
      new CustomEvent(name, { detail, bubbles: true, composed: true })
    );
  }

  private get filteredTargets() {
    const search = this.searchTerm.trim().toLowerCase();
    if (!search) return this.targets;
    return this.targets.filter((t) =>
      [t.title, t.author, t.sourceBranch, t.targetBranch, t.repository, String(t.id)]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(search)
    );
  }

  private formatLabel(value: string) {
    const normalized = value.replace(/[_-]+/g, " ").trim();
    return normalized ? normalized.charAt(0).toUpperCase() + normalized.slice(1) : "";
  }

  private queueCountLabel(count: number) {
    if (this.provider === "gitlab") return `${count} merge request${count === 1 ? "" : "s"}`;
    if (this.provider === "github") return `${count} pull request${count === 1 ? "" : "s"}`;
    return `${count} review request${count === 1 ? "" : "s"}`;
  }

  render() {
    const filtered = this.filteredTargets;
    const queueLabel = providerQueueLabels[this.provider];

    return html`
      <section
        class="rounded-lg border border-border bg-card flex flex-col h-full min-h-0 overflow-hidden"
      >
        <div class="flex h-full min-h-0 flex-col p-4">
          <!-- Repository section -->
          <div class="flex flex-col gap-1.5">
            <div class="text-xs font-semibold tracking-widest uppercase text-muted-foreground">Repository</div>
            <cr-provider-repository-picker
              .provider=${this.provider}
              .options=${this.repositoryOptions}
              .selectedId=${this.selectedRepository?.id || ""}
              .loading=${this.repositoryLoading}
              .error=${this.repositoryError}
            ></cr-provider-repository-picker>
          </div>

          <hr class="border-t border-border my-3" />

          <!-- Queue section -->
          <div class="flex flex-col gap-1.5 flex-auto min-h-0 overflow-hidden">
            <div class="flex items-center justify-between">
              <span class="text-xs font-semibold tracking-widest uppercase text-muted-foreground">${queueLabel}</span>
              <span class="text-xs text-muted-foreground">${this.queueCountLabel(filtered.length)}</span>
            </div>

            <div class="flex items-center gap-1.5">
              ${Select({
                value: this.stateFilter,
                size: "sm",
                width: "110px",
                disabled: !this.selectedRepository,
                options: reviewStates.map((state) => ({
                  value: state,
                  label: this.formatLabel(state),
                })),
                onChange: (value) => this.emit("state-filter-change", value),
              })}
              <label class="flex items-center gap-2 rounded-md border border-border bg-background px-2.5 h-9 text-sm flex items-center gap-2 flex-1 min-w-0">
                <cr-icon .icon=${Search} .size=${14}></cr-icon>
                <input
                  type="search"
                  class="grow text-sm min-w-0"
                  placeholder="Search…"
                  ?disabled=${!this.selectedRepository}
                  .value=${this.searchTerm}
                  @input=${(e: Event) => {
                    this.emit("search-change", (e.target as HTMLInputElement).value);
                  }}
                />
              </label>
            </div>

            <cr-review-list
              .provider=${this.provider}
              .targets=${filtered}
              .selectedId=${this.selectedTarget?.id ?? 0}
              .loading=${this.loadingTargets}
              .error=${this.targetsError}
              .configured=${this.configured}
              .emptyTitle=${this.selectedRepository ? "" : `${providerLabels[this.provider]} repository required`}
              .emptyDescription=${this.selectedRepository ? "" : `Choose a repository above to load its review queue.`}
              @review-selected=${(e: CustomEvent<ReviewTarget>) => this.emit("target-selected", e.detail)}
            ></cr-review-list>
          </div>
        </div>
      </section>
    `;
  }
}
