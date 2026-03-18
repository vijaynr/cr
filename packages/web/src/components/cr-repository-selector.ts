import { LitElement, html } from "lit";
import { FolderSearch, GitBranch, Pencil, X } from "lucide";
import "./cr-icon.js";

type RepositorySelectorVariant = "sidebar" | "inline";

export class CrRepositorySelector extends LitElement {
  static properties = {
    activeLabel: {},
    connected: { type: Boolean },
    expanded: { type: Boolean },
    loading: { type: Boolean },
    localRepositories: { attribute: false },
    value: {},
    variant: {},
  };

  override createRenderRoot() {
    return this;
  }

  declare activeLabel: string;
  declare connected: boolean;
  declare expanded: boolean;
  declare loading: boolean;
  declare localRepositories: string[];
  declare value: string;
  declare variant: RepositorySelectorVariant;

  constructor() {
    super();
    this.activeLabel = "";
    this.connected = false;
    this.expanded = false;
    this.loading = false;
    this.localRepositories = [];
    this.value = "";
    this.variant = "inline";
  }

  private dispatchRepositoryEvent(name: string, detail?: string) {
    this.dispatchEvent(
      new CustomEvent(name, {
        bubbles: true,
        composed: true,
        detail,
      })
    );
  }

  private handleSubmit(event: Event) {
    event.preventDefault();
    this.dispatchRepositoryEvent("repository-apply");
  }

  private handleInput(event: Event) {
    this.dispatchRepositoryEvent(
      "repository-input",
      (event.target as HTMLInputElement).value
    );
  }

  private renderRepositoryDatalist(id: string) {
    return html`
      <datalist id=${id}>
        ${this.localRepositories.map((repository) => html`<option value=${repository}></option>`)}
      </datalist>
    `;
  }

  private renderSidebar() {
    if (this.connected && !this.expanded) {
      return html`
        <div class="flex flex-col gap-2">
          <div class="flex items-center justify-between gap-2">
            <span class="badge badge-success badge-xs gap-1">
              <cr-icon .icon=${GitBranch} .size=${10}></cr-icon>
              Connected
            </span>
            <button
              class="btn btn-ghost btn-xs gap-1"
              type="button"
              @click=${() => this.dispatchRepositoryEvent("repository-edit")}
            >
              <cr-icon .icon=${Pencil} .size=${11}></cr-icon>
              Change
            </button>
          </div>

          <div class="font-mono text-xs text-base-content/50 truncate">${this.activeLabel}</div>

          <button
            class="btn btn-ghost btn-xs text-error gap-1"
            type="button"
            @click=${() => this.dispatchRepositoryEvent("repository-clear")}
          >
            <cr-icon .icon=${X} .size=${11}></cr-icon>
            Clear
          </button>
        </div>
      `;
    }

    return html`
      <form class="flex flex-col gap-2" @submit=${this.handleSubmit}>
        <label class="text-xs font-semibold text-base-content/50 uppercase tracking-wider">
          Repository source
        </label>
        <input
          class="input input-bordered input-xs font-mono w-full"
          type="text"
          placeholder="https://github.com/org/repo or C:\\repo"
          .value=${this.value}
          list="local-repos-list-sidebar"
          @input=${this.handleInput}
        />
        ${this.renderRepositoryDatalist("local-repos-list-sidebar")}
        <div class="flex gap-1">
          <button
            class="btn btn-primary btn-xs flex-1 gap-1"
            type="submit"
            ?disabled=${!this.value.trim()}
          >
            <cr-icon .icon=${FolderSearch} .size=${11}></cr-icon>
            ${this.connected ? "Apply" : "Connect"}
          </button>
          ${
            this.connected
              ? html`
                  <button
                    class="btn btn-ghost btn-xs"
                    type="button"
                    @click=${() => this.dispatchRepositoryEvent("repository-cancel")}
                  >
                    Cancel
                  </button>
                `
              : ""
          }
        </div>
        ${
          this.loading
            ? html`
                <span class="text-xs text-base-content/35">Scanning local repositories…</span>
              `
            : this.localRepositories.length > 0
              ? html`
                  <span class="text-xs text-base-content/35">
                    ${this.localRepositories.length} local repo${this.localRepositories.length === 1 ? "" : "s"} discovered
                  </span>
                `
              : ""
        }
      </form>
    `;
  }

  private renderInline() {
    if (this.connected) {
      return html``;
    }

    return html`
      <div class="alert alert-info text-sm flex-wrap gap-3">
        <div class="flex items-start gap-2 flex-1 min-w-[14rem]">
          <cr-icon .icon=${GitBranch} .size=${16}></cr-icon>
          <span>
            Connect a local checkout or paste a repository URL to load GitLab or GitHub review queues.
          </span>
        </div>
        <label for="cr-drawer" class="btn btn-primary btn-sm lg:hidden">Open sidebar</label>
        <form class="hidden lg:flex gap-2 items-center" @submit=${this.handleSubmit}>
          <input
            class="input input-bordered input-sm font-mono w-72"
            type="text"
            placeholder="https://github.com/org/repo or C:\\repo"
            .value=${this.value}
            list="local-repos-list-inline"
            @input=${this.handleInput}
          />
          ${this.renderRepositoryDatalist("local-repos-list-inline")}
          <button class="btn btn-primary btn-sm gap-1.5" type="submit" ?disabled=${!this.value.trim()}>
            <cr-icon .icon=${FolderSearch} .size=${13}></cr-icon>
            Connect
          </button>
        </form>
      </div>
    `;
  }

  render() {
    return this.variant === "sidebar" ? this.renderSidebar() : this.renderInline();
  }
}

customElements.define("cr-repository-selector", CrRepositorySelector);
