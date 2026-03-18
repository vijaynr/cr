import type { ReactiveController, ReactiveControllerHost } from "lit";
import type { ProviderId, RepositoryContext } from "../types.js";

type RepositorySelectionAppliedArgs = {
  context: RepositoryContext;
  detectedProvider: ProviderId | null;
};

type RepositoryContextControllerOptions = {
  detectProviderFromUrl: (url: string) => ProviderId | null;
  loadLocalRepositories: () => Promise<string[]>;
  onSelectionApplied: (args: RepositorySelectionAppliedArgs) => Promise<void> | void;
  onSelectionCleared: () => Promise<void> | void;
};

export class RepositoryContextController implements ReactiveController {
  inputValue = "";
  formExpanded = false;
  activeRepositoryPath = "";
  activeRepositoryUrl = "";
  localRepositories: string[] = [];
  loadingLocalRepositories = false;

  constructor(
    private readonly host: ReactiveControllerHost,
    private readonly options: RepositoryContextControllerOptions
  ) {
    this.host.addController(this);
  }

  hostConnected() {
    if (this.localRepositories.length === 0 && !this.loadingLocalRepositories) {
      void this.loadLocalRepositoryOptions();
    }
  }

  get activeContext(): RepositoryContext | undefined {
    if (this.activeRepositoryPath) {
      return {
        mode: "local",
        repoPath: this.activeRepositoryPath,
      };
    }

    if (this.activeRepositoryUrl) {
      return {
        mode: "remote",
        remoteUrl: this.activeRepositoryUrl,
      };
    }

    return undefined;
  }

  get activeLabel() {
    return this.activeRepositoryUrl || this.activeRepositoryPath;
  }

  get hasSelection() {
    return Boolean(this.activeLabel);
  }

  get hasLocalSelection() {
    return Boolean(this.activeRepositoryPath);
  }

  get canRunRepositoryWorkflows() {
    return this.hasSelection;
  }

  get selectionMessage() {
    return "Choose a local checkout or paste a repository URL to load GitLab or GitHub review queues.";
  }

  setInputValue(value: string) {
    this.inputValue = value;
    this.notifyHost();
  }

  beginEditing() {
    this.formExpanded = true;
    if (this.hasSelection) {
      this.inputValue = this.activeLabel;
    }
    this.notifyHost();
  }

  cancelEditing() {
    this.formExpanded = false;
    if (this.hasSelection) {
      this.inputValue = this.activeLabel;
    }
    this.notifyHost();
  }

  async applySelection() {
    const input = this.inputValue.trim();
    if (!input) {
      return;
    }

    const isUrl = input.startsWith("http://") || input.startsWith("https://");
    this.activeRepositoryUrl = isUrl ? input : "";
    this.activeRepositoryPath = isUrl ? "" : input;
    this.inputValue = input;
    this.formExpanded = false;
    this.notifyHost();

    await this.options.onSelectionApplied({
      context: isUrl
        ? { mode: "remote", remoteUrl: input }
        : { mode: "local", repoPath: input },
      detectedProvider: isUrl ? this.options.detectProviderFromUrl(input) : null,
    });
  }

  async clearSelection() {
    this.activeRepositoryPath = "";
    this.activeRepositoryUrl = "";
    this.inputValue = "";
    this.formExpanded = false;
    this.notifyHost();
    await this.options.onSelectionCleared();
  }

  private async loadLocalRepositoryOptions() {
    this.loadingLocalRepositories = true;
    this.notifyHost();

    try {
      this.localRepositories = await this.options.loadLocalRepositories();
    } catch {
      this.localRepositories = [];
    } finally {
      this.loadingLocalRepositories = false;
      this.notifyHost();
    }
  }

  private notifyHost() {
    this.host.requestUpdate();
  }
}
