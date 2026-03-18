import { LitElement, css, html } from "lit";
import {
  Bot,
  BrainCircuit,
  FileDiff,
  FolderSearch,
  GitBranch,
  LayoutDashboard,
  MessageSquare,
  ScrollText,
  Search,
  Settings2,
  ShieldCheck,
  Waypoints,
  Webhook,
  Workflow,
  type IconNode,
} from "lucide";
import {
  answerChatQuestion,
  loadChatContext,
  loadConfig,
  loadDashboard,
  loadLocalRepositories,
  loadReviewAgents,
  loadReviewBoardFilePatch,
  loadReviewCommits,
  loadReviewDetail,
  loadReviewDiffs,
  loadReviewTargets,
  postGeneratedReview,
  postInlineComment,
  postSummaryComment,
  runReview,
  runSummary,
  saveConfig,
} from "../api.js";
import { dashboardThemeStyles } from "../styles.js";
import {
  providerLabels,
  providerOrder,
  reviewStates,
  type CRConfigRecord,
  type DashboardData,
  type DashboardSection,
  type ProviderId,
  type RepositoryContext,
  type ReviewAgentOption,
  type ReviewChatContext,
  type ReviewChatHistoryEntry,
  type ReviewCommit,
  type ReviewDiffFile,
  type ReviewState,
  type ReviewTarget,
  type ReviewWorkflowResult,
  type TerminalTheme,
} from "../types.js";
import "./cr-config-card.js";
import "./cr-dashboard-header.js";
import "./cr-diff-viewer.js";
import "./cr-icon.js";
import "./cr-review-list.js";
import "./cr-stat-card.js";

type NoticeTone = "success" | "warning" | "error";
type WorkspaceTab = "overview" | "diff" | "commits";
type AnalysisTab = "review" | "summary" | "chat" | "comment";

type SelectedInlineTarget = {
  filePath: string;
  line: number;
  positionType: "new" | "old";
  text: string;
  key: string;
};

type ConfigDraft = {
  openaiApiUrl: string;
  openaiApiKey: string;
  openaiModel: string;
  useCustomStreaming: boolean;
  defaultReviewAgents: string[];
  gitlabUrl: string;
  gitlabKey: string;
  githubToken: string;
  rbUrl: string;
  rbToken: string;
  gitlabWebhookSecret: string;
  githubWebhookSecret: string;
  rbWebhookSecret: string;
  sslCertPath: string;
  sslKeyPath: string;
  sslCaPath: string;
  webhookConcurrency: string;
  webhookQueueLimit: string;
  webhookJobTimeoutMs: string;
  terminalTheme: TerminalTheme | "";
};

function isProviderSection(value: DashboardSection): value is ProviderId {
  return providerOrder.includes(value as ProviderId);
}

export class CrDashboardApp extends LitElement {
  static properties = {
    dashboard: { state: true },
    agentOptions: { state: true },
    activeSection: { state: true },
    provider: { state: true },
    stateFilter: { state: true },
    searchTerm: { state: true },
    repositoryUrlInput: { state: true },
    repositoryFormExpanded: { state: true },
    activeRepositoryPath: { state: true },
    activeRepositoryUrl: { state: true },
    localRepositories: { state: true },
    loadingLocalRepositories: { state: true },
    targets: { state: true },
    selectedTarget: { state: true },
    detailTarget: { state: true },
    diffFiles: { state: true },
    commits: { state: true },
    selectedFileId: { state: true },
    selectedFilePatch: { state: true },
    selectedLine: { state: true },
    workspaceTab: { state: true },
    analysisTab: { state: true },
    selectedAgents: { state: true },
    inlineCommentsEnabled: { state: true },
    feedbackDraft: { state: true },
    summaryDraft: { state: true },
    inlineDraft: { state: true },
    reviewResult: { state: true },
    summaryResult: { state: true },
    chatContext: { state: true },
    chatHistory: { state: true },
    chatQuestion: { state: true },
    configDraft: { state: true },
    configBaseline: { state: true },
    noticeMessage: { state: true },
    noticeTone: { state: true },
    loadingDashboard: { state: true },
    loadingTargets: { state: true },
    loadingDetail: { state: true },
    loadingDiffPatch: { state: true },
    loadingConfig: { state: true },
    savingConfig: { state: true },
    runningReview: { state: true },
    runningSummary: { state: true },
    loadingChat: { state: true },
    postingGeneratedReview: { state: true },
    postingSummary: { state: true },
    postingInline: { state: true },
    targetsError: { state: true },
    detailError: { state: true },
    reviewWarnings: { state: true },
  };

  static styles = [
    dashboardThemeStyles,
    css`
      :host {
        display: block;
        min-height: 100vh;
        background:
          radial-gradient(circle at top left, rgba(59, 130, 246, 0.08), transparent 26rem),
          linear-gradient(180deg, #0b1016 0%, #0d131c 100%);
      }

      main {
        display: grid;
        grid-template-columns: 260px minmax(0, 1fr);
        gap: 24px;
        max-width: 1720px;
        margin: 0 auto;
        padding: 24px;
      }

      .sidebar {
        position: sticky;
        top: 24px;
        display: grid;
        align-content: start;
        gap: 18px;
        min-height: calc(100vh - 48px);
        padding: 20px;
        border-radius: 14px;
      }

      .sidebar-brand,
      .sidebar-section {
        display: grid;
        gap: 10px;
      }

      .sidebar-brand h2,
      .sidebar-section h3 {
        font-size: 1rem;
      }

      .sidebar-meta {
        display: grid;
        gap: 8px;
      }

      .context-panel,
      .context-form,
      .context-fields {
        display: grid;
        gap: 14px;
      }

      .context-form {
        padding: 18px;
        border-radius: 12px;
      }

      .context-status {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      .field-block select.field {
        appearance: none;
      }

      .content {
        display: grid;
        gap: 20px;
      }

      .section-nav {
        display: grid;
        gap: 8px;
        padding: 0;
        border-radius: 0;
        position: static;
        background: transparent;
        border: none;
        box-shadow: none;
      }

      .nav-button {
        display: inline-flex;
        align-items: center;
        justify-content: flex-start;
        gap: 12px;
        min-height: 44px;
        padding: 0 14px;
        border-radius: 10px;
        border: 1px solid var(--line);
        background: transparent;
        color: var(--ink-soft);
        cursor: pointer;
        transition:
          border-color 140ms ease,
          background 140ms ease,
          color 140ms ease;
      }

      .nav-button:hover {
        background: rgba(148, 163, 184, 0.06);
      }

      .nav-button[data-active="true"] {
        border-color: var(--accent-strong);
        background: rgba(59, 130, 246, 0.16);
        color: white;
        box-shadow: inset 0 0 0 1px rgba(59, 130, 246, 0.18);
      }

      .page-stack,
      .overview-shell,
      .provider-shell,
      .settings-shell {
        display: grid;
        gap: 22px;
      }

      .summary-grid,
      .overview-grid,
      .provider-grid,
      .settings-grid,
      .field-grid {
        display: grid;
        gap: 16px;
      }

      .summary-grid {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }

      .overview-grid {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }

      .provider-grid,
      .settings-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .field-grid.two-column {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .provider-card,
      .feature-panel,
      .settings-panel,
      .provider-hero {
        display: grid;
        gap: 12px;
        padding: 18px;
        border-radius: var(--radius-md);
      }

      .provider-card strong {
        font-size: 1.4rem;
      }

      .provider-card .actions {
        margin-top: 10px;
      }

      .feature-panel {
        padding: 24px;
      }

      .layout {
        display: grid;
        grid-template-columns: 340px minmax(0, 1fr) 360px;
        gap: 22px;
        min-height: calc(100vh - 180px);
      }

      .rail,
      .detail,
      .analysis {
        display: grid;
        align-content: start;
        gap: 16px;
        min-height: 0;
      }

      .rail-panel,
      .detail-panel,
      .analysis-panel {
        display: grid;
        gap: 18px;
        min-height: 0;
        padding: 18px;
        border-radius: var(--radius-md);
      }

      .rail-panel {
        grid-template-rows: auto auto auto minmax(0, 1fr);
      }

      .detail-panel,
      .analysis-panel {
        grid-template-rows: auto auto minmax(0, 1fr);
      }

      .toolbar,
      .toolbar-stack,
      .stack,
      .agent-list,
      .outputs,
      .commit-list,
      .chat-thread,
      .settings-stack {
        display: grid;
        gap: 14px;
      }

      .segmented,
      .actions,
      .detail-meta,
      .status-row,
      .checkbox-grid {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
      }

      .segmented button {
        min-height: 38px;
        padding: 0 14px;
        border-radius: 8px;
        border: 1px solid var(--line);
        background: rgba(148, 163, 184, 0.06);
        color: var(--ink-soft);
        cursor: pointer;
        transition:
          background 140ms ease,
          border-color 140ms ease,
          color 140ms ease,
          transform 140ms ease;
      }

      .segmented button:hover {
        transform: translateY(-1px);
        border-color: var(--line-strong);
      }

      .segmented button[data-active="true"] {
        border-color: var(--accent-strong);
        background: rgba(59, 130, 246, 0.18);
        color: white;
      }

      .section-head,
      .provider-card-head,
      .detail-header-top {
        display: flex;
        align-items: start;
        justify-content: space-between;
        gap: 12px;
      }

      .search {
        width: 100%;
      }

      .search-shell {
        position: relative;
      }

      .search-shell cr-icon {
        position: absolute;
        top: 50%;
        left: 14px;
        transform: translateY(-50%);
        color: var(--ink-faint);
        pointer-events: none;
      }

      .search-shell .field {
        padding-left: 42px;
      }

      .detail-header,
      .detail-title,
      .detail-body,
      .analysis-body,
      .detail-scroll,
      .analysis-scroll,
      .card,
      .agent-card,
      .inline-item,
      .chat-turn,
      .commit,
      .field-block {
        display: grid;
        gap: 10px;
      }

      .detail-scroll,
      .analysis-scroll {
        min-height: 0;
        overflow: auto;
        padding-right: 4px;
      }

      .card,
      .agent-card,
      .inline-item,
      .chat-turn,
      .commit {
        padding: 18px;
        border-radius: var(--radius-sm);
        border: 1px solid var(--line);
        background: var(--surface);
        box-shadow: var(--shadow-sm);
      }

      .agent-card[data-active="true"] {
        border-color: rgba(59, 130, 246, 0.3);
        background: rgba(59, 130, 246, 0.08);
      }

      .agent-card label {
        display: grid;
        gap: 8px;
        cursor: pointer;
      }

      .chat-turn[data-role="assistant"] {
        background: rgba(59, 130, 246, 0.08);
      }

      .field-block span {
        font-weight: 600;
      }

      .field-note {
        color: var(--ink-faint);
        font-size: 0.9rem;
      }

      .settings-panel h3,
      .provider-hero h2,
      .provider-card h3 {
        font-size: 1.2rem;
      }

      .provider-card p,
      .settings-panel p {
        margin: 0;
      }

      .notice strong {
        color: var(--ink);
      }

      .overview-lead {
        display: grid;
        grid-template-columns: minmax(0, 1.35fr) minmax(280px, 0.65fr);
        gap: 16px;
      }

      .hero-copy {
        display: grid;
        gap: 14px;
      }

      .hero-copy h2 {
        font-size: clamp(1.6rem, 3vw, 2.2rem);
        max-width: 20ch;
      }

      .hero-aside {
        display: grid;
        gap: 14px;
        align-content: start;
      }

      .hero-aside .notice {
        min-height: 100%;
      }

      .provider-hero {
        grid-template-columns: minmax(0, 1fr) auto;
        align-items: start;
      }

      .provider-hero-copy {
        display: grid;
        gap: 14px;
      }

      .provider-hero p {
        max-width: 70ch;
      }

      .provider-toolbar {
        display: grid;
        gap: 14px;
      }

      .workspace-frame {
        display: grid;
        gap: 18px;
      }

      .empty-state {
        padding: 24px;
        border: 1px dashed var(--line);
        border-radius: var(--radius-sm);
        background: rgba(148, 163, 184, 0.05);
      }

      .mobile-only {
        display: none;
      }

      @media (max-width: 1240px) {
        main {
          grid-template-columns: 1fr;
        }

        .sidebar {
          position: static;
          min-height: auto;
        }

        .layout {
          grid-template-columns: 320px minmax(0, 1fr);
        }

        .analysis {
          grid-column: 1 / -1;
        }

        .overview-lead,
        .overview-grid,
        .provider-grid,
        .settings-grid {
          grid-template-columns: 1fr;
        }
      }

      @media (max-width: 920px) {
        main {
          padding: 18px;
        }

        .summary-grid,
        .field-grid.two-column {
          grid-template-columns: 1fr;
        }

        .section-nav {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .provider-hero {
          grid-template-columns: 1fr;
        }

        .layout {
          grid-template-columns: 1fr;
        }

        .mobile-only {
          display: block;
        }
      }
    `,
  ];

  declare dashboard: DashboardData | null;
  declare agentOptions: ReviewAgentOption[];
  declare activeSection: DashboardSection;
  declare provider: ProviderId;
  declare stateFilter: ReviewState;
  declare searchTerm: string;
  declare repositoryUrlInput: string;
  declare repositoryFormExpanded: boolean;
  declare activeRepositoryPath: string;
  declare activeRepositoryUrl: string;
  declare localRepositories: string[];
  declare loadingLocalRepositories: boolean;
  declare targets: ReviewTarget[];
  declare selectedTarget: ReviewTarget | null;
  declare detailTarget: ReviewTarget | null;
  declare diffFiles: ReviewDiffFile[];
  declare commits: ReviewCommit[];
  declare selectedFileId: string;
  declare selectedFilePatch: string;
  declare selectedLine: SelectedInlineTarget | null;
  declare workspaceTab: WorkspaceTab;
  declare analysisTab: AnalysisTab;
  declare selectedAgents: string[];
  declare inlineCommentsEnabled: boolean;
  declare feedbackDraft: string;
  declare summaryDraft: string;
  declare inlineDraft: string;
  declare reviewResult: ReviewWorkflowResult | null;
  declare summaryResult: ReviewWorkflowResult | null;
  declare chatContext: ReviewChatContext | null;
  declare chatHistory: ReviewChatHistoryEntry[];
  declare chatQuestion: string;
  declare configDraft: ConfigDraft;
  declare configBaseline: ConfigDraft;
  declare noticeMessage: string;
  declare noticeTone: NoticeTone;
  declare loadingDashboard: boolean;
  declare loadingTargets: boolean;
  declare loadingDetail: boolean;
  declare loadingDiffPatch: boolean;
  declare loadingConfig: boolean;
  declare savingConfig: boolean;
  declare runningReview: boolean;
  declare runningSummary: boolean;
  declare loadingChat: boolean;
  declare postingGeneratedReview: boolean;
  declare postingSummary: boolean;
  declare postingInline: boolean;
  declare targetsError: string;
  declare detailError: string;
  declare reviewWarnings: string[];

  constructor() {
    super();
    this.dashboard = null;
    this.agentOptions = [];
    this.activeSection = "overview";
    this.provider = "gitlab";
    this.stateFilter = "opened";
    this.searchTerm = "";
    this.repositoryUrlInput = "";
    this.repositoryFormExpanded = false;
    this.activeRepositoryPath = "";
    this.activeRepositoryUrl = "";
    this.localRepositories = [];
    this.loadingLocalRepositories = false;
    this.targets = [];
    this.selectedTarget = null;
    this.detailTarget = null;
    this.diffFiles = [];
    this.commits = [];
    this.selectedFileId = "";
    this.selectedFilePatch = "";
    this.selectedLine = null;
    this.workspaceTab = "diff";
    this.analysisTab = "review";
    this.selectedAgents = [];
    this.inlineCommentsEnabled = true;
    this.feedbackDraft = "";
    this.summaryDraft = "";
    this.inlineDraft = "";
    this.reviewResult = null;
    this.summaryResult = null;
    this.chatContext = null;
    this.chatHistory = [];
    this.chatQuestion = "";
    this.configDraft = this.emptyConfigDraft();
    this.configBaseline = this.emptyConfigDraft();
    this.noticeMessage = "";
    this.noticeTone = "success";
    this.loadingDashboard = false;
    this.loadingTargets = false;
    this.loadingDetail = false;
    this.loadingDiffPatch = false;
    this.loadingConfig = false;
    this.savingConfig = false;
    this.runningReview = false;
    this.runningSummary = false;
    this.loadingChat = false;
    this.postingGeneratedReview = false;
    this.postingSummary = false;
    this.postingInline = false;
    this.targetsError = "";
    this.detailError = "";
    this.reviewWarnings = [];
  }

  connectedCallback() {
    super.connectedCallback();
    void this.loadLocalRepositoryOptions();
    void this.loadInitialData();
  }

  private async loadLocalRepositoryOptions() {
    this.loadingLocalRepositories = true;
    try {
      this.localRepositories = await loadLocalRepositories();
    } catch {
      this.localRepositories = [];
    } finally {
      this.loadingLocalRepositories = false;
    }
  }

  private async loadInitialData(options: { preserveProvider?: boolean } = {}) {
    this.loadingDashboard = true;
    this.loadingConfig = true;
    this.targetsError = "";

    try {
      const [dashboard, agentOptions, config] = await Promise.all([
        loadDashboard(this.activeRepositoryContext),
        loadReviewAgents(),
        loadConfig(),
      ]);

      this.dashboard = dashboard;
      this.agentOptions = agentOptions;
      this.selectedAgents = agentOptions
        .filter((option) => option.selected)
        .map((option) => option.value);
      this.applyConfig(config, dashboard, agentOptions);

      if (!options.preserveProvider) {
        this.provider =
          providerOrder.find((provider) => this.providerIsReady(provider, dashboard)) ??
          providerOrder.find((provider) => dashboard.providers?.[provider]?.configured) ??
          this.provider;
      }

      if (this.canLoadProviderQueue(this.provider)) {
        await this.loadTargets();
      } else {
        this.targets = [];
        this.targetsError = this.repositorySelectionMessage;
      }
    } catch (error) {
      this.targetsError = this.toMessage(error);
    } finally {
      this.loadingDashboard = false;
      this.loadingConfig = false;
    }
  }

  private async refreshAll() {
    await this.loadInitialData({ preserveProvider: true });
    this.setNotice("Workspace refreshed from the latest provider state.", "success");
  }

  private async loadTargets() {
    this.loadingTargets = true;
    this.targetsError = "";
    this.targets = [];
    this.selectedTarget = null;
    this.detailTarget = null;
    this.resetWorkspaceState();

    const providerError = this.providerAvailabilityError;
    if (providerError) {
      this.targetsError = providerError;
      this.loadingTargets = false;
      return;
    }

    try {
      const targets = await loadReviewTargets(
        this.provider,
        this.stateFilter,
        this.activeRepositoryContext
      );
      this.targets = targets;
      const nextTarget = targets[0] ?? null;
      this.selectedTarget = nextTarget;
      if (nextTarget) {
        await this.loadTargetDetail(nextTarget);
      }
    } catch (error) {
      this.targetsError = this.toMessage(error);
    } finally {
      this.loadingTargets = false;
    }
  }

  private async loadTargetDetail(target: ReviewTarget) {
    this.loadingDetail = true;
    this.detailError = "";
    this.selectedTarget = target;
    this.detailTarget = null;
    this.diffFiles = [];
    this.commits = [];
    this.selectedFileId = "";
    this.selectedFilePatch = "";
    this.selectedLine = null;
    this.reviewResult = null;
    this.summaryResult = null;
    this.chatContext = null;
    this.chatHistory = [];
    this.reviewWarnings = [];

    try {
      const [detail, diffFiles, commits] = await Promise.all([
        loadReviewDetail(target.provider, target.id, this.activeRepositoryContext),
        loadReviewDiffs(target.provider, target.id, this.activeRepositoryContext),
        loadReviewCommits(target.provider, target.id, this.activeRepositoryContext),
      ]);
      this.detailTarget = { ...target, ...detail };
      this.diffFiles = diffFiles;
      this.commits = commits;

      const firstFile = diffFiles[0];
      if (firstFile) {
        await this.selectFile(firstFile);
      }
    } catch (error) {
      this.detailError = this.toMessage(error);
    } finally {
      this.loadingDetail = false;
    }
  }

  private async selectFile(file: ReviewDiffFile) {
    this.selectedFileId = file.id;
    this.selectedLine = null;

    if (file.patch) {
      this.selectedFilePatch = file.patch;
      return;
    }

    if (
      this.provider === "reviewboard" &&
      this.selectedTarget &&
      file.diffSetId !== undefined &&
      file.fileDiffId !== undefined
    ) {
      this.loadingDiffPatch = true;
      try {
        const patch = await loadReviewBoardFilePatch(
          this.selectedTarget.id,
          file.diffSetId,
          file.fileDiffId
        );
        this.selectedFilePatch = patch;
        this.diffFiles = this.diffFiles.map((item) =>
          item.id === file.id ? { ...item, patch } : item
        );
      } catch (error) {
        this.selectedFilePatch = "";
        this.setNotice(this.toMessage(error), "error");
      } finally {
        this.loadingDiffPatch = false;
      }
      return;
    }

    this.selectedFilePatch = "";
  }

  private async handleSectionChange(section: DashboardSection) {
    this.activeSection = section;
    if (!isProviderSection(section) || section === this.provider) {
      return;
    }

    this.provider = section;
    await this.loadTargets();
  }

  private async handleStateChange(state: ReviewState) {
    if (state === this.stateFilter) {
      return;
    }
    this.stateFilter = state;
    await this.loadTargets();
  }

  private async handleRunReview() {
    if (!this.selectedTarget) {
      return;
    }

    this.runningReview = true;
    this.analysisTab = "review";
    this.reviewWarnings = [];
    try {
      const response = await runReview({
        provider: this.selectedTarget.provider,
        targetId: this.selectedTarget.id,
        repoPath: this.activeRepositoryPath || undefined,
        agentNames: this.selectedAgents,
        inlineComments: this.inlineCommentsEnabled,
        userFeedback: this.feedbackDraft.trim() || undefined,
      });
      this.reviewResult = response.result;
      this.reviewWarnings = response.warnings;
      this.feedbackDraft = "";
      this.setNotice("AI review is ready. Inspect it before posting anything.", "success");
    } catch (error) {
      this.setNotice(this.toMessage(error), "error");
    } finally {
      this.runningReview = false;
    }
  }

  private async handleRunSummary() {
    if (!this.selectedTarget) {
      return;
    }

    this.runningSummary = true;
    this.analysisTab = "summary";
    try {
      const response = await runSummary({
        provider: this.selectedTarget.provider,
        targetId: this.selectedTarget.id,
        repoPath: this.activeRepositoryPath || undefined,
      });
      this.summaryResult = response.result;
      this.setNotice("Summary generated for the active review target.", "success");
    } catch (error) {
      this.setNotice(this.toMessage(error), "error");
    } finally {
      this.runningSummary = false;
    }
  }

  private async ensureChatContext() {
    if (!this.selectedTarget || this.chatContext) {
      return;
    }

    this.loadingChat = true;
    try {
      this.chatContext = await loadChatContext({
        provider: this.selectedTarget.provider,
        targetId: this.selectedTarget.id,
        repoPath: this.activeRepositoryPath || undefined,
      });
    } catch (error) {
      this.setNotice(this.toMessage(error), "error");
    } finally {
      this.loadingChat = false;
    }
  }

  private async handleAskQuestion() {
    if (!this.chatContext || !this.chatQuestion.trim()) {
      return;
    }

    this.loadingChat = true;
    try {
      const response = await answerChatQuestion({
        context: this.chatContext,
        question: this.chatQuestion.trim(),
        history: this.chatHistory,
      });
      this.chatHistory = response.history;
      this.chatQuestion = "";
    } catch (error) {
      this.setNotice(this.toMessage(error), "error");
    } finally {
      this.loadingChat = false;
    }
  }

  private async handlePostGeneratedReview() {
    if (!this.selectedTarget || !this.reviewResult) {
      return;
    }

    this.postingGeneratedReview = true;
    try {
      const response = await postGeneratedReview({
        provider: this.selectedTarget.provider,
        result: this.reviewResult,
      });
      this.setNotice(
        `Posted generated review${response.posted.inlineNoteIds.length > 0 ? ` with ${response.posted.inlineNoteIds.length} inline comments` : ""}.`,
        "success"
      );
    } catch (error) {
      this.setNotice(this.toMessage(error), "error");
    } finally {
      this.postingGeneratedReview = false;
    }
  }

  private async handlePostSummaryComment() {
    if (!this.selectedTarget || !this.summaryDraft.trim()) {
      return;
    }

    this.postingSummary = true;
    try {
      await postSummaryComment({
        provider: this.selectedTarget.provider,
        targetId: this.selectedTarget.id,
        body: this.summaryDraft.trim(),
        repositoryContext: this.activeRepositoryContext,
      });
      this.summaryDraft = "";
      this.setNotice("Summary comment posted to the provider.", "success");
    } catch (error) {
      this.setNotice(this.toMessage(error), "error");
    } finally {
      this.postingSummary = false;
    }
  }

  private async handlePostInlineComment() {
    if (!this.selectedTarget || !this.selectedLine || !this.inlineDraft.trim()) {
      return;
    }

    this.postingInline = true;
    try {
      await postInlineComment({
        provider: this.selectedTarget.provider,
        targetId: this.selectedTarget.id,
        filePath: this.selectedLine.filePath,
        line: this.selectedLine.line,
        positionType: this.selectedLine.positionType,
        body: this.inlineDraft.trim(),
        repositoryContext: this.activeRepositoryContext,
      });
      this.inlineDraft = "";
      this.setNotice("Inline comment posted.", "success");
    } catch (error) {
      this.setNotice(this.toMessage(error), "error");
    } finally {
      this.postingInline = false;
    }
  }

  private handleTargetSelected(event: CustomEvent<ReviewTarget>) {
    void this.loadTargetDetail(event.detail);
  }

  private handleFileSelected(event: CustomEvent<ReviewDiffFile>) {
    void this.selectFile(event.detail);
  }

  private handleLineSelected(event: CustomEvent<SelectedInlineTarget>) {
    this.selectedLine = event.detail;
    this.analysisTab = "comment";
  }

  private handleConfigField<K extends keyof ConfigDraft>(key: K, value: ConfigDraft[K]) {
    this.configDraft = {
      ...this.configDraft,
      [key]: value,
    };
  }

  private handleAgentDefaultToggle(value: string, checked: boolean) {
    const next = new Set(this.configDraft.defaultReviewAgents);
    if (checked) {
      next.add(value);
    } else if (next.size > 1) {
      next.delete(value);
    }
    this.handleConfigField("defaultReviewAgents", Array.from(next));
  }

  private handleConfigReset() {
    this.configDraft = this.cloneDraft(this.configBaseline);
  }

  private async handleConfigSave() {
    this.savingConfig = true;
    try {
      const payload: CRConfigRecord = {
        openaiApiUrl: this.configDraft.openaiApiUrl.trim(),
        openaiApiKey: this.configDraft.openaiApiKey.trim(),
        openaiModel: this.configDraft.openaiModel.trim(),
        useCustomStreaming: this.configDraft.useCustomStreaming,
        defaultReviewAgents:
          this.configDraft.defaultReviewAgents.length > 0
            ? this.configDraft.defaultReviewAgents
            : ["general"],
        gitlabUrl: this.configDraft.gitlabUrl.trim(),
        gitlabKey: this.configDraft.gitlabKey.trim(),
        githubToken: this.optionalString(this.configDraft.githubToken),
        rbUrl: this.optionalString(this.configDraft.rbUrl),
        rbToken: this.optionalString(this.configDraft.rbToken),
        gitlabWebhookSecret: this.optionalString(this.configDraft.gitlabWebhookSecret),
        githubWebhookSecret: this.optionalString(this.configDraft.githubWebhookSecret),
        rbWebhookSecret: this.optionalString(this.configDraft.rbWebhookSecret),
        sslCertPath: this.optionalString(this.configDraft.sslCertPath),
        sslKeyPath: this.optionalString(this.configDraft.sslKeyPath),
        sslCaPath: this.optionalString(this.configDraft.sslCaPath),
        webhookConcurrency: this.parseIntegerDraft(
          this.configDraft.webhookConcurrency,
          "Webhook concurrency"
        ),
        webhookQueueLimit: this.parseIntegerDraft(
          this.configDraft.webhookQueueLimit,
          "Webhook queue limit"
        ),
        webhookJobTimeoutMs: this.parseIntegerDraft(
          this.configDraft.webhookJobTimeoutMs,
          "Webhook job timeout"
        ),
        terminalTheme: this.configDraft.terminalTheme || undefined,
      };

      const saved = await saveConfig(payload);
      this.applyConfig(saved, this.dashboard, this.agentOptions);
      await this.loadInitialData({ preserveProvider: true });
      this.setNotice(
        "Configuration saved. Provider workspaces are now using the latest settings.",
        "success"
      );
    } catch (error) {
      this.setNotice(this.toMessage(error), "error");
    } finally {
      this.savingConfig = false;
    }
  }

  private resetWorkspaceState() {
    this.detailTarget = null;
    this.diffFiles = [];
    this.commits = [];
    this.selectedFileId = "";
    this.selectedFilePatch = "";
    this.selectedLine = null;
    this.summaryDraft = "";
    this.inlineDraft = "";
    this.reviewResult = null;
    this.summaryResult = null;
    this.chatContext = null;
    this.chatHistory = [];
    this.chatQuestion = "";
    this.feedbackDraft = "";
    this.reviewWarnings = [];
  }

  private setNotice(message: string, tone: NoticeTone) {
    this.noticeMessage = message;
    this.noticeTone = tone;
  }

  private toMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  private optionalString(value: string): string | undefined {
    const trimmed = value.trim();
    return trimmed ? trimmed : undefined;
  }

  private parseIntegerDraft(value: string, label: string): number {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      throw new Error(`${label} must be a positive integer.`);
    }
    return parsed;
  }

  private emptyConfigDraft(): ConfigDraft {
    return {
      openaiApiUrl: "",
      openaiApiKey: "",
      openaiModel: "",
      useCustomStreaming: false,
      defaultReviewAgents: ["general"],
      gitlabUrl: "",
      gitlabKey: "",
      githubToken: "",
      rbUrl: "",
      rbToken: "",
      gitlabWebhookSecret: "",
      githubWebhookSecret: "",
      rbWebhookSecret: "",
      sslCertPath: "",
      sslKeyPath: "",
      sslCaPath: "",
      webhookConcurrency: "3",
      webhookQueueLimit: "50",
      webhookJobTimeoutMs: "600000",
      terminalTheme: "",
    };
  }

  private cloneDraft(draft: ConfigDraft): ConfigDraft {
    return {
      ...draft,
      defaultReviewAgents: [...draft.defaultReviewAgents],
    };
  }

  private applyConfig(
    config: CRConfigRecord,
    dashboard: DashboardData | null = this.dashboard,
    agentOptions: ReviewAgentOption[] = this.agentOptions
  ) {
    const normalized = this.normalizeConfigDraft(config, dashboard, agentOptions);
    this.configDraft = normalized;
    this.configBaseline = this.cloneDraft(normalized);
  }

  private normalizeConfigDraft(
    config: CRConfigRecord,
    dashboard: DashboardData | null,
    agentOptions: ReviewAgentOption[]
  ): ConfigDraft {
    const defaultAgents =
      config.defaultReviewAgents && config.defaultReviewAgents.length > 0
        ? config.defaultReviewAgents
        : dashboard?.config.defaultReviewAgents?.length
          ? dashboard.config.defaultReviewAgents
          : agentOptions.filter((option) => option.selected).map((option) => option.value);

    return {
      openaiApiUrl: config.openaiApiUrl ?? dashboard?.config.openai.apiUrl ?? "",
      openaiApiKey: config.openaiApiKey ?? "",
      openaiModel: config.openaiModel ?? dashboard?.config.openai.model ?? "",
      useCustomStreaming: Boolean(config.useCustomStreaming),
      defaultReviewAgents: defaultAgents.length > 0 ? defaultAgents : ["general"],
      gitlabUrl: config.gitlabUrl ?? dashboard?.config.gitlab?.url ?? "",
      gitlabKey: config.gitlabKey ?? "",
      githubToken: config.githubToken ?? "",
      rbUrl: config.rbUrl ?? dashboard?.config.reviewboard?.url ?? "",
      rbToken: config.rbToken ?? "",
      gitlabWebhookSecret: config.gitlabWebhookSecret ?? "",
      githubWebhookSecret: config.githubWebhookSecret ?? "",
      rbWebhookSecret: config.rbWebhookSecret ?? "",
      sslCertPath: config.sslCertPath ?? "",
      sslKeyPath: config.sslKeyPath ?? "",
      sslCaPath: config.sslCaPath ?? "",
      webhookConcurrency: String(
        config.webhookConcurrency ?? dashboard?.config.webhook.concurrency ?? 3
      ),
      webhookQueueLimit: String(
        config.webhookQueueLimit ?? dashboard?.config.webhook.queueLimit ?? 50
      ),
      webhookJobTimeoutMs: String(
        config.webhookJobTimeoutMs ?? dashboard?.config.webhook.jobTimeoutMs ?? 600000
      ),
      terminalTheme: config.terminalTheme ?? "",
    };
  }

  private get configured() {
    return this.dashboard?.providers?.[this.provider]?.configured ?? false;
  }

  private get providerAvailabilityError() {
    return this.providerAvailabilityErrorFor(this.provider, this.dashboard);
  }

  private get filteredTargets() {
    const search = this.searchTerm.trim().toLowerCase();
    if (!search) {
      return this.targets;
    }

    return this.targets.filter((target) =>
      [
        target.title,
        target.author,
        target.sourceBranch,
        target.targetBranch,
        target.repository,
        String(target.id),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(search)
    );
  }

  private get configDirty() {
    return JSON.stringify(this.configDraft) !== JSON.stringify(this.configBaseline);
  }

  private get activeRepositoryContext(): RepositoryContext | undefined {
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

  private get hasRepositorySelection() {
    return Boolean(this.activeRepositoryPath || this.activeRepositoryUrl);
  }

  private get canRunLocalWorkflows() {
    return Boolean(this.activeRepositoryPath);
  }

  private get repositorySelectionMessage() {
    return "Choose a local checkout or paste a repository URL to load GitLab or GitHub review queues.";
  }

  private providerAvailabilityErrorFor(
    provider: ProviderId,
    dashboard: DashboardData | null = this.dashboard
  ) {
    if ((provider === "gitlab" || provider === "github") && !this.hasRepositorySelection) {
      return this.repositorySelectionMessage;
    }

    const providerData = dashboard?.providers?.[provider];
    if (!providerData?.configured) {
      return `${providerLabels[provider]} is not configured yet.`;
    }

    if (providerData.error && providerData.items.length === 0 && !providerData.repository) {
      return providerData.error;
    }

    return "";
  }

  private providerIsReady(provider: ProviderId, dashboard: DashboardData | null = this.dashboard) {
    return !this.providerAvailabilityErrorFor(provider, dashboard);
  }

  private canLoadProviderQueue(provider: ProviderId) {
    if (provider === "reviewboard") {
      return true;
    }

    return this.hasRepositorySelection;
  }

  private async applyRepositorySelection() {
    const input = this.repositoryUrlInput.trim();
    if (!input) {
      return;
    }

    const isUrl = input.startsWith("http://") || input.startsWith("https://");
    this.activeRepositoryUrl = isUrl ? input : "";
    this.activeRepositoryPath = isUrl ? "" : input;
    this.repositoryFormExpanded = false;

    // Auto-detect provider from URL and navigate to it
    if (isUrl) {
      const detected = this.detectProviderFromUrl(input);
      if (detected) {
        this.provider = detected;
      }
    }

    await this.loadInitialData({ preserveProvider: true });

    // Navigate to the provider section so the user sees results immediately
    this.activeSection = this.provider;
  }

  private detectProviderFromUrl(url: string): ProviderId | null {
    const lower = url.toLowerCase();
    if (lower.includes("github.com")) {
      return "github";
    }

    const gitlabBaseUrl = this.configDraft.gitlabUrl || this.dashboard?.config.gitlab?.url || "";
    if (gitlabBaseUrl) {
      try {
        const gitlabHost = new URL(gitlabBaseUrl).hostname.toLowerCase();
        const inputHost = new URL(url).hostname.toLowerCase();
        if (inputHost === gitlabHost) {
          return "gitlab";
        }
      } catch {
        // fall through to string matching
      }
    }

    if (lower.includes("gitlab")) {
      return "gitlab";
    }

    return null;
  }

  private clearRepositorySelection() {
    this.activeRepositoryPath = "";
    this.activeRepositoryUrl = "";
    this.repositoryUrlInput = "";
    this.repositoryFormExpanded = false;
    this.targets = [];
    this.selectedTarget = null;
    this.detailTarget = null;
    this.targetsError = this.repositorySelectionMessage;
  }

  render() {
    const repositoryLabel =
      this.dashboard?.repository.remoteUrl?.replace(/\.git$/, "") ??
      this.dashboard?.repository.cwd ??
      "";
    const totalQueue = providerOrder.reduce(
      (count, provider) => count + (this.dashboard?.providers?.[provider]?.items.length ?? 0),
      0
    );

    return html`
      <main>
        <aside class="sidebar panel">
          <section class="sidebar-brand">
            <div class="eyebrow">CR platform</div>
            <h2>Review operations</h2>
            <p class="muted">Centralize provider queues, automation defaults, and publishing controls.</p>
          </section>

          <section class="sidebar-section">
            <h3>Navigation</h3>
            <nav class="section-nav" aria-label="Dashboard navigation">
              ${this.renderNavButton("overview", "Overview", LayoutDashboard)}
              ${providerOrder.map((provider) =>
                this.renderNavButton(provider, providerLabels[provider])
              )}
              ${this.renderNavButton("settings", "Settings", Settings2)}
            </nav>
          </section>

          <section class="sidebar-section">
            <h3>Workspace status</h3>
            <div class="sidebar-meta">
              <div class="badge"><cr-icon .icon=${Workflow} .size=${14}></cr-icon>${totalQueue} open items</div>
              <div class="badge"><cr-icon .icon=${BrainCircuit} .size=${14}></cr-icon>${this.selectedAgents.length || 1} active agents</div>
              ${
                repositoryLabel
                  ? html`<div class="badge"><cr-icon .icon=${GitBranch} .size=${14}></cr-icon>${repositoryLabel}</div>`
                  : html`<div class="badge"><cr-icon .icon=${FolderSearch} .size=${14}></cr-icon>Select repo source</div>`
              }
            </div>
          </section>
        </aside>

        <section class="content">
          <cr-dashboard-header
            .generatedAt=${this.dashboard?.generatedAt || ""}
            .loading=${this.loadingDashboard || this.loadingTargets || this.loadingConfig}
            .repositoryLabel=${repositoryLabel}
            .repositoryPath=${this.dashboard?.repository.cwd || ""}
            .remoteUrl=${this.dashboard?.repository.remoteUrl || ""}
            @refresh=${() => this.refreshAll()}
          ></cr-dashboard-header>

          ${
            this.noticeMessage
              ? html`<div class="notice" data-tone=${this.noticeTone}>${this.noticeMessage}</div>`
              : ""
          }

          <div class="page-stack">
            ${
              this.activeSection === "overview"
                ? this.renderOverviewPage()
                : this.activeSection === "settings"
                  ? this.renderSettingsPage()
                  : this.renderProviderPage()
            }
          </div>
        </section>
      </main>
    `;
  }

  private renderNavButton(
    section: DashboardSection,
    label: string,
    icon: IconNode = this.iconForSection(section)
  ) {
    return html`
      <button
        class="nav-button"
        type="button"
        data-active=${String(this.activeSection === section)}
        @click=${() => this.handleSectionChange(section)}
      >
        <cr-icon .icon=${icon} .size=${16}></cr-icon>
        ${label}
      </button>
    `;
  }

  private iconForSection(section: DashboardSection): IconNode {
    switch (section) {
      case "overview":
        return LayoutDashboard;
      case "gitlab":
        return Workflow;
      case "github":
        return GitBranch;
      case "reviewboard":
        return ShieldCheck;
      case "settings":
        return Settings2;
    }
  }

  private iconForWorkspaceTab(tab: WorkspaceTab): IconNode {
    switch (tab) {
      case "overview":
        return LayoutDashboard;
      case "diff":
        return FileDiff;
      case "commits":
        return GitBranch;
    }
  }

  private iconForAnalysisTab(tab: AnalysisTab): IconNode {
    switch (tab) {
      case "review":
        return Bot;
      case "summary":
        return ScrollText;
      case "chat":
        return MessageSquare;
      case "comment":
        return MessageSquare;
    }
  }

  private renderRepositorySelector() {
    const hasActive = Boolean(this.activeRepositoryPath || this.activeRepositoryUrl);
    const activeLabel = this.activeRepositoryUrl || this.activeRepositoryPath;
    const showForm = !hasActive || this.repositoryFormExpanded;

    return html`
      <section class="context-panel">
        ${
          hasActive && !this.repositoryFormExpanded
            ? html`
              <div class="context-form panel">
                <div class="section-head">
                  <div>
                    <div class="eyebrow">Repository context</div>
                    <div class="context-status">
                      <div class="badge" data-tone=${this.activeRepositoryUrl ? "accent" : "success"}>
                        ${this.activeRepositoryUrl ? "remote URL" : "local checkout"}
                      </div>
                    </div>
                  </div>
                  <div class="actions">
                    <button
                      class="button"
                      data-tone="ghost"
                      type="button"
                      @click=${() => {
                        this.repositoryFormExpanded = true;
                      }}
                    >
                      Change
                    </button>
                    <button
                      class="button"
                      data-tone="ghost"
                      type="button"
                      @click=${() => this.clearRepositorySelection()}
                    >
                      Clear
                    </button>
                  </div>
                </div>
                <div class="notice" data-tone="success">${activeLabel}</div>
              </div>
            `
            : html`
              <form
                class="context-form panel"
                @submit=${async (event: Event) => {
                  event.preventDefault();
                  await this.applyRepositorySelection();
                }}
              >
                <div class="section-head">
                  <div>
                    <div class="eyebrow">Repository context</div>
                    <h3>Connect a repository</h3>
                  </div>
                  ${
                    hasActive
                      ? html`
                        <button
                          class="button"
                          data-tone="ghost"
                          type="button"
                          @click=${() => {
                            this.repositoryFormExpanded = false;
                          }}
                        >
                          Cancel
                        </button>
                      `
                      : ""
                  }
                </div>

                <label class="field-block">
                  <span>Repository URL or local path</span>
                  <div class="field-note">
                    Paste a GitHub or GitLab URL — the provider is detected automatically.
                    Or enter a local checkout path to enable AI workflows.
                  </div>
                  <input
                    class="field"
                    type="text"
                    placeholder="https://github.com/owner/repo  or  /path/to/local/checkout"
                    .value=${this.repositoryUrlInput}
                    list="local-repos-list"
                    @input=${(event: Event) => {
                      this.repositoryUrlInput = (event.target as HTMLInputElement).value;
                    }}
                  />
                  ${
                    this.localRepositories.length > 0
                      ? html`
                        <datalist id="local-repos-list">
                          ${this.localRepositories.map(
                            (repo) => html`<option value=${repo}></option>`
                          )}
                        </datalist>
                      `
                      : ""
                  }
                </label>

                <div class="actions">
                  <button
                    class="button"
                    data-tone="primary"
                    type="submit"
                    ?disabled=${!this.repositoryUrlInput.trim()}
                  >
                    Load review queue
                  </button>
                  ${
                    !this.loadingLocalRepositories && this.localRepositories.length > 0
                      ? html`<span class="field-note">${this.localRepositories.length} local repo${this.localRepositories.length === 1 ? "" : "s"} discovered nearby</span>`
                      : ""
                  }
                </div>
              </form>
            `
        }
      </section>
    `;
  }

  private renderOverviewPage() {
    const configuredProviders = providerOrder.filter(
      (provider) => this.dashboard?.providers?.[provider]?.configured
    ).length;
    const queueSize = providerOrder.reduce(
      (count, provider) => count + (this.dashboard?.providers?.[provider]?.items.length ?? 0),
      0
    );
    const defaultAgents =
      this.dashboard?.config.defaultReviewAgents.length ?? this.selectedAgents.length ?? 0;
    const hasActive = Boolean(this.activeRepositoryPath || this.activeRepositoryUrl);

    return html`
      <section class="overview-shell">
        <section class="overview-lead">
          <section class="feature-panel panel hero-copy">
            <div class="eyebrow">Workspace overview</div>
            <h2>See queue health, provider readiness, and review capacity before diving into a request.</h2>
            <p class="muted">
              The dashboard keeps provider triage, AI defaults, and webhook capacity visible so the active review workspace can stay focused.
            </p>
            <div class="actions">
              <button class="button" data-tone="primary" type="button" @click=${() => this.handleSectionChange(this.provider)}>
                <cr-icon .icon=${FolderSearch} .size=${16}></cr-icon>
                Open active workspace
              </button>
              <button class="button" type="button" @click=${() => this.handleSectionChange("settings")}>
                <cr-icon .icon=${Settings2} .size=${16}></cr-icon>
                Adjust settings
              </button>
            </div>
          </section>

          <section class="hero-aside">
            ${
              hasActive
                ? html`
                  <div class="notice" data-tone="success">
                    <strong>Repository connected.</strong>
                    ${this.activeRepositoryUrl || this.activeRepositoryPath}
                    <br/><br/>
                    <button class="button" data-tone="primary" type="button" @click=${() => this.handleSectionChange(this.provider)}>
                      Open ${providerLabels[this.provider]} workspace
                    </button>
                  </div>
                `
                : html`
                  <div class="notice" data-tone="accent">
                    <strong>No repository connected.</strong>
                    Paste a GitHub or GitLab URL below to load your review queue, or pick a provider tab and connect there.
                  </div>
                `
            }
            <div class="notice">
              ${
                configuredProviders === providerOrder.length
                  ? "All providers are configured. You can move straight into triage and review."
                  : `${providerOrder.length - configuredProviders} provider connection${providerOrder.length - configuredProviders === 1 ? "" : "s"} still need attention.`
              }
            </div>
          </section>
        </section>

        ${this.renderRepositorySelector()}

        <div class="summary-grid">
          <cr-stat-card
            .eyebrow=${"Configured providers"}
            .value=${`${configuredProviders}/3`}
            .note=${"GitLab, GitHub, and Review Board status at a glance"}
            .tone=${configuredProviders === providerOrder.length ? "success" : "accent"}
            .icon=${ShieldCheck}
          ></cr-stat-card>
          <cr-stat-card
            .eyebrow=${"Open review queue"}
            .value=${String(queueSize)}
            .note=${"Current open items discovered from configured providers"}
            .tone=${queueSize > 0 ? "accent" : "default"}
            .icon=${Workflow}
          ></cr-stat-card>
          <cr-stat-card
            .eyebrow=${"Default agents"}
            .value=${String(defaultAgents || 1)}
            .note=${"Review profiles that start selected in workflow runs"}
            .icon=${Bot}
          ></cr-stat-card>
        </div>

        <section class="provider-grid">
          ${providerOrder.map((provider) => this.renderProviderSummaryCard(provider))}
        </section>

        <section class="overview-grid">
          <cr-config-card
            .label=${"AI runtime"}
            .value=${this.dashboard?.config.openai.model || "No model configured"}
            .note=${
              this.dashboard?.config.openai.configured
                ? this.dashboard?.config.openai.apiUrl || "OpenAI-compatible endpoint ready"
                : "Add your model endpoint and key in Settings"
            }
          ></cr-config-card>
          <cr-config-card
            .label=${"Default review agents"}
            .value=${this.dashboard?.config.defaultReviewAgents.join(", ") || "general"}
            .note=${"Choose which review profiles start enabled for new workflow runs"}
          ></cr-config-card>
          <cr-config-card
            .label=${"Webhook runtime"}
            .value=${`${this.dashboard?.config.webhook.concurrency ?? 3} workers / ${this.dashboard?.config.webhook.queueLimit ?? 50} queue`}
            .note=${`Timeout ${this.dashboard?.config.webhook.jobTimeoutMs ?? 600000} ms${this.dashboard?.config.webhook.sslEnabled ? " with SSL" : ""}`}
          ></cr-config-card>
        </section>
      </section>
    `;
  }

  private renderProviderSummaryCard(provider: ProviderId) {
    const data = this.dashboard?.providers?.[provider];
    const label = providerLabels[provider];

    return html`
      <article class="provider-card panel">
        <div class="provider-card-head">
          <div>
            <div class="eyebrow">${label}</div>
            <h3>
              <cr-icon .icon=${this.iconForSection(provider)} .size=${18}></cr-icon>
              ${label} workflows
            </h3>
          </div>
          <div class="badge" data-tone=${data?.configured ? "success" : "danger"}>
            ${data?.configured ? "configured" : "missing config"}
          </div>
        </div>

        <strong>${data?.items.length ?? 0}</strong>
        <p class="muted">
          ${data?.repository || data?.error || "No repository context loaded yet for this provider."}
        </p>

        <div class="actions">
          <button class="button" type="button" @click=${() => this.handleSectionChange(provider)}>
            <cr-icon .icon=${this.iconForSection(provider)} .size=${16}></cr-icon>
            Open ${label}
          </button>
          <button class="button" data-tone="ghost" type="button" @click=${() => this.handleSectionChange("settings")}>
            <cr-icon .icon=${Settings2} .size=${16}></cr-icon>
            Settings
          </button>
        </div>
      </article>
    `;
  }

  private renderProviderPage() {
    const label = providerLabels[this.provider];
    const detail = this.detailTarget;
    const hasRepo = this.hasRepositorySelection;
    const providerError = this.providerAvailabilityError;

    if (!this.configured) {
      return html`
        <section class="provider-shell">
          <section class="provider-hero panel">
            <div class="section-head">
              <div>
                <div class="eyebrow">${label}</div>
                <h2>${label} workspace is not configured yet</h2>
              </div>
              <div class="badge" data-tone="danger">missing config</div>
            </div>
            <p class="muted">
              Add your ${label} connection details in Settings before loading this provider's review queue.
            </p>
            <div class="actions">
              <button class="button" data-tone="primary" type="button" @click=${() => this.handleSectionChange("settings")}>
                Open settings
              </button>
            </div>
          </section>
        </section>
      `;
    }

    return html`
      <section class="provider-shell">
        ${this.renderRepositorySelector()}

        ${
          hasRepo || this.provider === "reviewboard"
            ? html`
              <div class="summary-grid">
                <cr-stat-card
                  .eyebrow=${`${label} queue`}
                  .value=${String(this.targets.length)}
                  .note=${`${this.stateFilter} requests currently loaded`}
                  .tone=${this.targets.length > 0 ? "accent" : "default"}
                  .icon=${FolderSearch}
                ></cr-stat-card>
                <cr-stat-card
                  .eyebrow=${"Selected agents"}
                  .value=${String(this.selectedAgents.length || 1)}
                  .note=${"Profiles ready for the next review run"}
                  .icon=${BrainCircuit}
                ></cr-stat-card>
                <cr-stat-card
                  .eyebrow=${"Diff workspace"}
                  .value=${String(detail ? this.diffFiles.length : 0)}
                  .note=${detail ? detail.title : "Choose a request to inspect"}
                  .tone=${detail ? "success" : "default"}
                  .icon=${FileDiff}
                ></cr-stat-card>
              </div>

              ${
                providerError
                  ? html`<div class="notice" data-tone="warning">${providerError}</div>`
                  : ""
              }

              <div class="layout">
                <section class="rail">
                  <div class="rail-panel panel">
                    <div class="section-head">
                      <div>
                        <div class="eyebrow">${label}</div>
                        <h2>Review queue</h2>
                      </div>
                <div class="badge" data-tone="accent">${this.stateFilter}</div>
              </div>

              <div class="toolbar">
                <div class="segmented">
                  ${reviewStates.map(
                    (state) => html`
                      <button
                        type="button"
                        data-active=${String(this.stateFilter === state)}
                        @click=${() => this.handleStateChange(state)}
                      >
                        ${state}
                      </button>
                    `
                  )}
                </div>
              </div>

              <label class="search-shell">
                <cr-icon .icon=${Search} .size=${16}></cr-icon>
                <input
                  class="field search"
                  type="search"
                  placeholder="Search id, title, author, branch"
                  .value=${this.searchTerm}
                  @input=${(event: Event) => {
                    this.searchTerm = (event.target as HTMLInputElement).value;
                  }}
                />
              </label>

              <cr-review-list
                .provider=${this.provider}
                .targets=${this.filteredTargets}
                .selectedId=${this.selectedTarget?.id ?? 0}
                .loading=${this.loadingTargets}
                .error=${this.targetsError}
                .configured=${this.configured}
                @review-selected=${this.handleTargetSelected}
              ></cr-review-list>
            </div>
          </section>

          <section class="detail">
            <div class="detail-panel panel">
              ${
                detail
                  ? html`
                    <div class="detail-header">
                      <div class="detail-header-top">
                        <div class="detail-title">
                          <div class="eyebrow">${label} review detail</div>
                          <h2>
                            ${detail.provider === "gitlab" ? `!${detail.id}` : `#${detail.id}`}
                            ${detail.title}
                          </h2>
                        </div>
                        ${
                          detail.url
                            ? html`
                              <a class="button link" href=${detail.url} target="_blank" rel="noreferrer">
                                Open provider
                              </a>
                            `
                            : ""
                        }
                      </div>

                      <div class="detail-meta">
                        <div class="badge">${label}</div>
                        ${detail.state ? html`<div class="badge">${detail.state}</div>` : ""}
                        ${detail.author ? html`<div class="badge">${detail.author}</div>` : ""}
                        ${
                          detail.sourceBranch
                            ? html`<div class="badge">${detail.sourceBranch}${detail.targetBranch ? ` → ${detail.targetBranch}` : ""}</div>`
                            : ""
                        }
                        ${detail.updatedAt ? html`<div class="badge">${detail.updatedAt}</div>` : ""}
                      </div>
                    </div>

                    <div class="segmented">
                      ${(["overview", "diff", "commits"] as WorkspaceTab[]).map(
                        (tab) => html`
                          <button
                            type="button"
                            data-active=${String(this.workspaceTab === tab)}
                            @click=${() => {
                              this.workspaceTab = tab;
                            }}
                          >
                            <cr-icon .icon=${this.iconForWorkspaceTab(tab)} .size=${15}></cr-icon>
                            ${tab}
                          </button>
                        `
                      )}
                    </div>

                    <div class="detail-body">
                      <div class="detail-scroll">
                        ${
                          this.detailError
                            ? html`<div class="notice" data-tone="error">${this.detailError}</div>`
                            : this.loadingDetail
                              ? html`<div class="notice">Loading review detail…</div>`
                              : this.workspaceTab === "overview"
                                ? this.renderOverview(detail)
                                : this.workspaceTab === "commits"
                                  ? this.renderCommits()
                                  : html`
                                    <cr-diff-viewer
                                      .files=${this.diffFiles}
                                      .selectedFileId=${this.selectedFileId}
                                      .selectedPatch=${this.selectedFilePatch}
                                      .selectedLineKey=${this.selectedLine?.key || ""}
                                      .loading=${this.loadingDiffPatch}
                                      .error=${this.detailError}
                                      @file-selected=${this.handleFileSelected}
                                      @line-selected=${this.handleLineSelected}
                                    ></cr-diff-viewer>
                                  `
                        }
                      </div>
                    </div>
                  `
                  : html`<div class="notice">Choose a review request from the queue to open this provider workspace.</div>`
              }
            </div>
          </section>

          <aside class="analysis">
            <div class="analysis-panel panel">
              <div class="section-head">
                <div>
                  <div class="eyebrow">AI review and publishing</div>
                  <h2>Action rail</h2>
                </div>
                ${detail ? html`<div class="badge" data-tone="accent">${label}</div>` : ""}
              </div>

              <div class="segmented">
                ${(["review", "summary", "chat", "comment"] as AnalysisTab[]).map(
                  (tab) => html`
                    <button
                      type="button"
                      data-active=${String(this.analysisTab === tab)}
                      @click=${async () => {
                        this.analysisTab = tab;
                        if (tab === "chat") {
                          await this.ensureChatContext();
                        }
                      }}
                    >
                      <cr-icon .icon=${this.iconForAnalysisTab(tab)} .size=${15}></cr-icon>
                      ${tab}
                    </button>
                  `
                )}
              </div>

              <div class="analysis-body">
                <div class="analysis-scroll">
                  ${
                    !detail
                      ? html`<div class="notice">Open a request before running AI workflows or posting comments.</div>`
                      : this.analysisTab === "review"
                        ? this.renderReviewPanel()
                        : this.analysisTab === "summary"
                          ? this.renderSummaryPanel()
                          : this.analysisTab === "chat"
                            ? this.renderChatPanel()
                            : this.renderCommentPanel()
                  }
                </div>
              </div>
            </div>
          </aside>
              </div>
            `
            : ""
        }
      </section>
    `;
  }

  private renderSettingsPage() {
    const gitlabConfigured = this.dashboard?.config.gitlab?.configured;
    const githubConfigured = this.dashboard?.config.github?.configured;
    const reviewBoardConfigured = this.dashboard?.config.reviewboard?.configured;

    return html`
      <section class="settings-shell">
        <div class="summary-grid">
          <cr-stat-card
            .eyebrow=${"AI runtime"}
            .value=${this.dashboard?.config.openai.model || "Not configured"}
            .note=${
              this.dashboard?.config.openai.configured
                ? "Model endpoint ready for workflows"
                : "Add API settings to enable AI workflows"
            }
            .tone=${this.dashboard?.config.openai.configured ? "success" : "accent"}
            .icon=${BrainCircuit}
          ></cr-stat-card>
          <cr-stat-card
            .eyebrow=${"Webhook queue"}
            .value=${this.configDraft.webhookConcurrency}
            .note=${`Concurrent workers with queue limit ${this.configDraft.webhookQueueLimit}`}
            .icon=${Webhook}
          ></cr-stat-card>
          <cr-stat-card
            .eyebrow=${"Theme override"}
            .value=${this.configDraft.terminalTheme || "auto"}
            .note=${"Applies when the CLI or server renders terminal surfaces"}
            .icon=${Waypoints}
          ></cr-stat-card>
        </div>

        <form
          class="settings-grid"
          @submit=${async (event: Event) => {
            event.preventDefault();
            await this.handleConfigSave();
          }}
        >
          <section class="settings-panel panel">
            <div class="section-head">
              <div>
                <div class="eyebrow">General</div>
                <h3>AI and defaults</h3>
              </div>
              <div class="badge" data-tone=${this.dashboard?.config.openai.configured ? "success" : "danger"}>
                ${this.dashboard?.config.openai.configured ? "ready" : "needs setup"}
              </div>
            </div>

            <div class="field-grid">
              ${this.renderConfigInput({
                label: "OpenAI API URL",
                note: "Compatible base URL used for review, summarize, and chat workflows.",
                value: this.configDraft.openaiApiUrl,
                onInput: (value) => this.handleConfigField("openaiApiUrl", value),
              })}
              ${this.renderConfigInput({
                label: "OpenAI API key",
                note: "Stored in CR config and used for all AI workflows.",
                value: this.configDraft.openaiApiKey,
                type: "password",
                onInput: (value) => this.handleConfigField("openaiApiKey", value),
              })}
              ${this.renderConfigInput({
                label: "Model",
                note: "Default model name for CR review workflows.",
                value: this.configDraft.openaiModel,
                onInput: (value) => this.handleConfigField("openaiModel", value),
              })}

              <label class="field-block">
                <span>Use custom streaming</span>
                <div class="field-note">Enable CR's custom SSE streaming path instead of the default SDK behavior.</div>
                <label class="badge">
                  <input
                    type="checkbox"
                    .checked=${this.configDraft.useCustomStreaming}
                    @change=${(event: Event) =>
                      this.handleConfigField(
                        "useCustomStreaming",
                        (event.target as HTMLInputElement).checked
                      )}
                  />
                  custom streaming
                </label>
              </label>

              <label class="field-block">
                <span>Terminal theme override</span>
                <div class="field-note">Optional override for terminal-facing surfaces.</div>
                <select
                  class="select"
                  .value=${this.configDraft.terminalTheme}
                  @change=${(event: Event) =>
                    this.handleConfigField(
                      "terminalTheme",
                      (event.target as HTMLSelectElement).value as TerminalTheme | ""
                    )}
                >
                  <option value="">auto</option>
                  <option value="light">light</option>
                  <option value="dark">dark</option>
                </select>
              </label>
            </div>

            <section class="card">
              <div class="eyebrow">Default review agents</div>
              <div class="checkbox-grid">
                ${this.agentOptions.map(
                  (option) => html`
                    <label class="badge">
                      <input
                        type="checkbox"
                        .checked=${this.configDraft.defaultReviewAgents.includes(option.value)}
                        @change=${(event: Event) =>
                          this.handleAgentDefaultToggle(
                            option.value,
                            (event.target as HTMLInputElement).checked
                          )}
                      />
                      ${option.title}
                    </label>
                  `
                )}
              </div>
            </section>
          </section>

          <section class="settings-panel panel">
            <div class="section-head">
              <div>
                <div class="eyebrow">Providers</div>
                <h3>Source connections</h3>
              </div>
              <div class="status-row">
                <div class="badge" data-tone=${gitlabConfigured ? "success" : "danger"}>GitLab</div>
                <div class="badge" data-tone=${githubConfigured ? "success" : "danger"}>GitHub</div>
                <div class="badge" data-tone=${reviewBoardConfigured ? "success" : "danger"}>Review Board</div>
              </div>
            </div>

            <div class="settings-stack">
              <section class="card">
                <div class="eyebrow">GitLab</div>
                <div class="field-grid">
                  ${this.renderConfigInput({
                    label: "GitLab URL",
                    note: "Base URL used for merge request and inline comment APIs.",
                    value: this.configDraft.gitlabUrl,
                    onInput: (value) => this.handleConfigField("gitlabUrl", value),
                  })}
                  ${this.renderConfigInput({
                    label: "GitLab token",
                    note: "Private token used by CR for GitLab workflows.",
                    value: this.configDraft.gitlabKey,
                    type: "password",
                    onInput: (value) => this.handleConfigField("gitlabKey", value),
                  })}
                </div>
              </section>

              <section class="card">
                <div class="eyebrow">GitHub</div>
                <div class="field-grid">
                  ${this.renderConfigInput({
                    label: "GitHub token",
                    note: "PAT used to list pull requests and post review comments.",
                    value: this.configDraft.githubToken,
                    type: "password",
                    onInput: (value) => this.handleConfigField("githubToken", value),
                  })}
                </div>
              </section>

              <section class="card">
                <div class="eyebrow">Review Board</div>
                <div class="field-grid">
                  ${this.renderConfigInput({
                    label: "Review Board URL",
                    note: "Base URL used for review request and diff APIs.",
                    value: this.configDraft.rbUrl,
                    onInput: (value) => this.handleConfigField("rbUrl", value),
                  })}
                  ${this.renderConfigInput({
                    label: "Review Board token",
                    note: "Token used for review publishing and queue access.",
                    value: this.configDraft.rbToken,
                    type: "password",
                    onInput: (value) => this.handleConfigField("rbToken", value),
                  })}
                </div>
              </section>
            </div>
          </section>

          <section class="settings-panel panel">
            <div class="section-head">
              <div>
                <div class="eyebrow">Webhooks</div>
                <h3>Ingress and queueing</h3>
              </div>
              <div class="badge" data-tone=${this.dashboard?.config.webhook.sslEnabled ? "success" : "accent"}>
                ${this.dashboard?.config.webhook.sslEnabled ? "SSL enabled" : "HTTP only"}
              </div>
            </div>

            <div class="field-grid two-column">
              ${this.renderConfigInput({
                label: "GitLab webhook secret",
                note: "Optional shared secret for GitLab webhooks.",
                value: this.configDraft.gitlabWebhookSecret,
                type: "password",
                onInput: (value) => this.handleConfigField("gitlabWebhookSecret", value),
              })}
              ${this.renderConfigInput({
                label: "GitHub webhook secret",
                note: "Optional shared secret for GitHub webhooks.",
                value: this.configDraft.githubWebhookSecret,
                type: "password",
                onInput: (value) => this.handleConfigField("githubWebhookSecret", value),
              })}
              ${this.renderConfigInput({
                label: "Review Board webhook secret",
                note: "Optional shared secret for Review Board webhooks.",
                value: this.configDraft.rbWebhookSecret,
                type: "password",
                onInput: (value) => this.handleConfigField("rbWebhookSecret", value),
              })}
              ${this.renderConfigInput({
                label: "Webhook concurrency",
                note: "Number of parallel jobs the server can execute.",
                value: this.configDraft.webhookConcurrency,
                inputMode: "numeric",
                onInput: (value) => this.handleConfigField("webhookConcurrency", value),
              })}
              ${this.renderConfigInput({
                label: "Webhook queue limit",
                note: "Max queued jobs before new work is rejected.",
                value: this.configDraft.webhookQueueLimit,
                inputMode: "numeric",
                onInput: (value) => this.handleConfigField("webhookQueueLimit", value),
              })}
              ${this.renderConfigInput({
                label: "Webhook timeout (ms)",
                note: "Per-job timeout applied to webhook processing.",
                value: this.configDraft.webhookJobTimeoutMs,
                inputMode: "numeric",
                onInput: (value) => this.handleConfigField("webhookJobTimeoutMs", value),
              })}
              ${this.renderConfigInput({
                label: "SSL cert path",
                note: "Optional certificate path for HTTPS webhook serving.",
                value: this.configDraft.sslCertPath,
                onInput: (value) => this.handleConfigField("sslCertPath", value),
              })}
              ${this.renderConfigInput({
                label: "SSL key path",
                note: "Optional private key path for HTTPS webhook serving.",
                value: this.configDraft.sslKeyPath,
                onInput: (value) => this.handleConfigField("sslKeyPath", value),
              })}
              ${this.renderConfigInput({
                label: "SSL CA path",
                note: "Optional CA path when your environment needs a custom trust chain.",
                value: this.configDraft.sslCaPath,
                onInput: (value) => this.handleConfigField("sslCaPath", value),
              })}
            </div>
          </section>

          <section class="settings-panel panel">
            <div class="section-head">
              <div>
                <div class="eyebrow">Apply changes</div>
                <h3>Save configuration</h3>
              </div>
              ${this.configDirty ? html`<div class="badge" data-tone="accent">unsaved changes</div>` : ""}
            </div>

            <div class="empty-state">
              <p class="muted">
                Provider workflows refresh from this saved config. After saving, jump back to a provider tab to load its separated inbox and action rail.
              </p>
            </div>

            <div class="actions">
              <button
                class="button"
                data-tone="primary"
                type="submit"
                ?disabled=${this.savingConfig || !this.configDirty}
              >
                ${this.savingConfig ? "Saving…" : "Save configuration"}
              </button>
              <button
                class="button"
                type="button"
                ?disabled=${this.savingConfig || !this.configDirty}
                @click=${() => this.handleConfigReset()}
              >
                Reset changes
              </button>
            </div>
          </section>
        </form>
      </section>
    `;
  }

  private renderConfigInput(args: {
    label: string;
    note: string;
    value: string;
    onInput: (value: string) => void;
    type?: string;
    inputMode?: "text" | "numeric" | "decimal" | "search" | "email" | "tel" | "url" | "none";
  }) {
    return html`
      <label class="field-block">
        <span>${args.label}</span>
        <div class="field-note">${args.note}</div>
        <input
          class="field"
          type=${args.type || "text"}
          .value=${args.value}
          inputmode=${args.inputMode || "text"}
          @input=${(event: Event) => args.onInput((event.target as HTMLInputElement).value)}
        />
      </label>
    `;
  }

  private renderOverview(detail: ReviewTarget) {
    return html`
      <div class="overview-grid">
        <section class="card">
          <div class="eyebrow">Request summary</div>
          <p class="muted">
            ${
              detail.description ||
              detail.summary ||
              "This request has no rich description from the provider. Use the diff and commit tabs for the full review context."
            }
          </p>
        </section>

        <section class="card">
          <div class="eyebrow">Workspace stats</div>
          <div class="actions">
            <div class="badge">${this.diffFiles.length} changed files</div>
            <div class="badge">${this.commits.length} commits</div>
            <div class="badge">${this.reviewResult?.inlineComments.length ?? 0} AI inline notes</div>
          </div>
        </section>

        <section class="card">
          <div class="eyebrow">Workflow availability</div>
          <div class="stack">
            <div class="notice">Review and summarize are available for all configured providers.</div>
            <div class="notice" data-tone=${detail.provider === "reviewboard" ? "warning" : "success"}>
              ${
                detail.provider === "reviewboard"
                  ? "Review Board can receive summary review posts, but inline comment workflows stay disabled in the web workspace."
                  : "GitLab and GitHub support generated review posts plus manual inline comments from the diff viewer."
              }
            </div>
          </div>
        </section>
      </div>
    `;
  }

  private renderCommits() {
    if (this.commits.length === 0) {
      return html`<div class="notice">No commits are available for this review target.</div>`;
    }

    return html`
      <div class="commit-list">
        ${this.commits.map(
          (commit) => html`
            <article class="commit">
              <strong>${commit.title}</strong>
              <div class="muted">${commit.id}</div>
              <div class="subtle">${commit.author || "Unknown author"}${commit.createdAt ? ` • ${commit.createdAt}` : ""}</div>
            </article>
          `
        )}
      </div>
    `;
  }

  private renderReviewPanel() {
    return html`
      ${
        !this.canRunLocalWorkflows
          ? html`<div class="notice" data-tone="warning">AI review runs require a local checkout. Switch the repository source to a local path to enable this workflow.</div>`
          : ""
      }
      <form
        class="card"
        @submit=${async (event: Event) => {
          event.preventDefault();
          await this.handleRunReview();
        }}
      >
        <div class="section-head">
          <div>
            <div class="eyebrow">Run review</div>
            <h3>Agent selection</h3>
          </div>
          <label class="badge">
            <input
              type="checkbox"
              .checked=${this.inlineCommentsEnabled}
              @change=${(event: Event) => {
                this.inlineCommentsEnabled = (event.target as HTMLInputElement).checked;
              }}
            />
            inline candidates
          </label>
        </div>

        <div class="agent-list">
          ${this.agentOptions.map(
            (option) => html`
              <div class="agent-card" data-active=${String(this.selectedAgents.includes(option.value))}>
                <label>
                  <span>
                    <input
                      type="checkbox"
                      .checked=${this.selectedAgents.includes(option.value)}
                      @change=${(event: Event) =>
                        this.toggleAgent(option.value, (event.target as HTMLInputElement).checked)}
                    />
                    ${option.title}
                  </span>
                  ${option.description ? html`<span class="muted">${option.description}</span>` : ""}
                </label>
              </div>
            `
          )}
        </div>

        <label class="field-block">
          <span>Regenerate with feedback</span>
          <div class="field-note">Add a refinement instruction for the next review run.</div>
          <textarea
            class="textarea"
            placeholder="Focus on performance, security, or a specific subsystem"
            .value=${this.feedbackDraft}
            @input=${(event: Event) => {
              this.feedbackDraft = (event.target as HTMLTextAreaElement).value;
            }}
          ></textarea>
        </label>

        <div class="actions">
          <button
            class="button"
            data-tone="primary"
            type="submit"
            ?disabled=${!this.canRunLocalWorkflows || this.runningReview || this.selectedAgents.length === 0}
          >
            ${this.runningReview ? "Running review…" : "Run review"}
          </button>
          <button
            class="button"
            type="button"
            ?disabled=${!this.reviewResult || this.postingGeneratedReview}
            @click=${() => this.handlePostGeneratedReview()}
          >
            ${this.postingGeneratedReview ? "Posting…" : "Post generated review"}
          </button>
        </div>
      </form>

      ${this.reviewWarnings.map((warning) => html`<div class="notice" data-tone="warning">${warning}</div>`)}

      ${
        this.reviewResult
          ? html`
            <section class="card">
              <div class="eyebrow">Aggregated result</div>
              <p class="muted">${this.reviewResult.overallSummary || this.reviewResult.output}</p>
            </section>

            ${
              this.reviewResult.inlineComments.length > 0
                ? html`
                  <section class="card">
                    <div class="eyebrow">Inline candidates</div>
                    <div class="stack">
                      ${this.reviewResult.inlineComments.map(
                        (comment) => html`
                          <div class="inline-item">
                            <strong>${comment.filePath}:${comment.line}</strong>
                            <p class="muted">${comment.comment}</p>
                          </div>
                        `
                      )}
                    </div>
                  </section>
                `
                : ""
            }

            ${
              this.reviewResult.agentResults?.length
                ? html`
                  <section class="card">
                    <div class="eyebrow">Per-agent output</div>
                    <div class="outputs">
                      ${this.reviewResult.agentResults.map(
                        (agent) => html`
                          <article class="inline-item">
                            <strong>${agent.name}</strong>
                            <p class="muted">${agent.failed ? agent.error || "Agent failed." : agent.output}</p>
                          </article>
                        `
                      )}
                    </div>
                  </section>
                `
                : ""
            }
          `
          : ""
      }
    `;
  }

  private renderSummaryPanel() {
    return html`
      ${
        !this.canRunLocalWorkflows
          ? html`<div class="notice" data-tone="warning">Summary generation needs a local checkout because the AI workflow loads repository context from disk.</div>`
          : ""
      }
      <form
        class="card"
        @submit=${async (event: Event) => {
          event.preventDefault();
          await this.handleRunSummary();
        }}
      >
        <div class="eyebrow">Generate summary</div>
        <div class="actions">
          <button
            class="button"
            data-tone="primary"
            type="submit"
            ?disabled=${!this.canRunLocalWorkflows || this.runningSummary}
          >
            ${this.runningSummary ? "Generating…" : "Generate summary"}
          </button>
        </div>
      </form>

      ${
        this.summaryResult
          ? html`
            <section class="card">
              <div class="eyebrow">Summary output</div>
              <p class="muted">${this.summaryResult.output}</p>
            </section>
          `
          : ""
      }
    `;
  }

  private renderChatPanel() {
    return html`
      ${
        !this.canRunLocalWorkflows
          ? html`<div class="notice" data-tone="warning">Review chat is available only when a local repository checkout is selected.</div>`
          : ""
      }
      ${
        this.chatContext
          ? html`
            <section class="card">
              <div class="eyebrow">Chat context</div>
              <p class="muted">${this.chatContext.summary}</p>
            </section>
          `
          : html`
            <section class="card">
              <div class="eyebrow">Prepare context</div>
              <div class="actions">
                  <button
                    class="button"
                    data-tone="primary"
                    type="button"
                    ?disabled=${!this.canRunLocalWorkflows || this.loadingChat}
                    @click=${() => this.ensureChatContext()}
                  >
                  ${this.loadingChat ? "Preparing…" : "Load chat context"}
                </button>
              </div>
            </section>
          `
      }

      ${
        this.chatHistory.length > 0
          ? html`
            <section class="chat-thread">
              ${this.chatHistory.flatMap((entry) => [
                html`<article class="chat-turn"><strong>You</strong><p>${entry.question}</p></article>`,
                html`<article class="chat-turn" data-role="assistant"><strong>CR</strong><p>${entry.answer}</p></article>`,
              ])}
            </section>
          `
          : ""
      }

      <form
        class="card"
        @submit=${async (event: Event) => {
          event.preventDefault();
          await this.handleAskQuestion();
        }}
      >
        <div class="eyebrow">Ask a question</div>
        <textarea
          class="textarea"
          placeholder="Ask about risks, test gaps, branch intent, or suspicious changes"
          .value=${this.chatQuestion}
          @input=${(event: Event) => {
            this.chatQuestion = (event.target as HTMLTextAreaElement).value;
          }}
        ></textarea>
        <div class="actions">
          <button
            class="button"
            data-tone="primary"
            type="submit"
            ?disabled=${!this.canRunLocalWorkflows || this.loadingChat || !this.chatContext || !this.chatQuestion.trim()}
          >
            ${this.loadingChat ? "Thinking…" : "Ask"}
          </button>
        </div>
      </form>
    `;
  }

  private renderCommentPanel() {
    const reviewBoardInlineDisabled = this.selectedTarget?.provider === "reviewboard";

    return html`
      <form
        class="card"
        @submit=${async (event: Event) => {
          event.preventDefault();
          await this.handlePostSummaryComment();
        }}
      >
        <div class="eyebrow">Summary comment</div>
        <textarea
          class="textarea"
          placeholder="Write a provider comment or paste/edit the generated review before posting"
          .value=${this.summaryDraft}
          @input=${(event: Event) => {
            this.summaryDraft = (event.target as HTMLTextAreaElement).value;
          }}
        ></textarea>
        <div class="actions">
          <button
            class="button"
            data-tone="primary"
            type="submit"
            ?disabled=${this.postingSummary || !this.summaryDraft.trim()}
          >
            ${this.postingSummary ? "Posting…" : "Post summary comment"}
          </button>
          ${
            this.reviewResult
              ? html`
                <button
                  class="button"
                  type="button"
                  @click=${() => {
                    this.summaryDraft =
                      this.reviewResult?.overallSummary || this.reviewResult?.output || "";
                  }}
                >
                  Copy generated text
                </button>
              `
              : ""
          }
        </div>
      </form>

      <form
        class="card"
        @submit=${async (event: Event) => {
          event.preventDefault();
          await this.handlePostInlineComment();
        }}
      >
        <div class="eyebrow">Inline comment composer</div>
        ${
          this.selectedLine
            ? html`
              <div class="notice">
                ${this.selectedLine.filePath}:${this.selectedLine.line} (${this.selectedLine.positionType})
                <div class="subtle mono">${this.selectedLine.text}</div>
              </div>
            `
            : html`<div class="notice">Choose a line in the diff view to anchor an inline comment.</div>`
        }

        ${
          reviewBoardInlineDisabled
            ? html`<div class="notice" data-tone="warning">Review Board inline comments are not enabled in this workspace yet. Use a summary review instead.</div>`
            : ""
        }

        <textarea
          class="textarea"
          placeholder="Write a precise inline note"
          .value=${this.inlineDraft}
          @input=${(event: Event) => {
            this.inlineDraft = (event.target as HTMLTextAreaElement).value;
          }}
        ></textarea>
        <div class="actions">
          <button
            class="button"
            data-tone="primary"
            type="submit"
            ?disabled=${this.postingInline || reviewBoardInlineDisabled || !this.selectedLine || !this.inlineDraft.trim()}
          >
            ${this.postingInline ? "Posting…" : "Post inline comment"}
          </button>
        </div>
      </form>
    `;
  }

  private toggleAgent(value: string, checked: boolean) {
    const next = new Set(this.selectedAgents);
    if (checked) {
      next.add(value);
    } else if (next.size > 1) {
      next.delete(value);
    }
    this.selectedAgents = Array.from(next);
  }
}

customElements.define("cr-dashboard-app", CrDashboardApp);
