import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { Search } from "lucide";
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
        class="cr-side-rail cr-side-rail--left rounded-[0.55rem] border border-base-300 bg-base-200"
      >
        <div class="cr-side-rail__inner flex h-full min-h-0 flex-col p-4">
          <!-- Repository section -->
          <div class="cr-queue-section">
            <div class="cr-queue-section__label">Repository</div>
            <cr-provider-repository-picker
              .provider=${this.provider}
              .options=${this.repositoryOptions}
              .selectedId=${this.selectedRepository?.id || ""}
              .loading=${this.repositoryLoading}
              .error=${this.repositoryError}
            ></cr-provider-repository-picker>
          </div>

          <hr class="cr-queue-divider" />

          <!-- Queue section -->
          <div class="cr-queue-section cr-queue-section--grow">
            <div class="cr-queue-section__header">
              <span class="cr-queue-section__label">${queueLabel}</span>
              <span class="cr-queue-count">${this.queueCountLabel(filtered.length)}</span>
            </div>

            <div class="cr-queue-filter-row">
              <select
                class="cr-state-filter"
                .value=${this.stateFilter}
                ?disabled=${!this.selectedRepository}
                @change=${(e: Event) =>
                  this.emit("state-filter-change", (e.target as HTMLSelectElement).value)}
              >
                ${reviewStates.map(
                  (state) => html`
                    <option value=${state} ?selected=${this.stateFilter === state}>
                      ${this.formatLabel(state)}
                    </option>
                  `
                )}
              </select>
              <label class="input input-bordered input-sm flex items-center gap-2 flex-1 min-w-0">
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
