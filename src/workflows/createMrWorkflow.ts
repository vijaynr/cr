import { remoteToProjectPath, type GitLabClient } from "../clients/gitlabClient.js";
import { type LlmClient } from "../clients/llmClient.js";
import { getCurrentBranch, getOriginRemoteUrl } from "../utils/git.js";
import { logger } from "../utils/logger.js";
import { loadPrompt } from "../utils/prompts.js";
import { createWorkflowPhaseReporter } from "../utils/workflowEvents.js";
import {
  createRuntimeGitLabClient,
  createRuntimeLlmClient,
  loadWorkflowRuntime,
  type WorkflowRuntime,
} from "../utils/workflowRuntime.js";
import type {
  CreateMrWorkflowInput,
  CreateMrWorkflowResult,
  StatusLevel,
} from "../types/workflows.js";
import { runWorkflow } from "../utils/workflow.js";

type CreateMrGraphState = {
  input: CreateMrWorkflowInput;
  runtime: WorkflowRuntime | null;
  gitlab: GitLabClient | null;
  llm: LlmClient | null;
  sourceBranch: string;
  targetBranch: string;
  projectPath: string;
  branches: string[];
  defaultBranch: string;
  branchDiff: string;
  title: string;
  description: string;
  iteration: number;
  feedback: string;
  shouldRegenerate: boolean;
  existingMr: { iid: number; web_url: string } | null;
  shouldProceed: boolean;
  result: CreateMrWorkflowResult | null;
};

const WORKFLOW_NAME = "createMr";

function reportStatus(
  input: Pick<CreateMrWorkflowInput, "status">,
  level: StatusLevel,
  message: string
): void {
  input.status?.[level](message);
}

function assertRuntime(runtime: WorkflowRuntime | null): WorkflowRuntime {
  if (!runtime) {
    throw new Error("Workflow runtime not initialized.");
  }
  return runtime;
}

function assertGitLab(gitlab: GitLabClient | null): GitLabClient {
  if (!gitlab) {
    throw new Error("GitLab client not initialized.");
  }
  return gitlab;
}

function assertLlm(llm: LlmClient | null): LlmClient {
  if (!llm) {
    throw new Error("LLM client not initialized.");
  }
  return llm;
}

function fallbackDescription(diff: string): string {
  const trimmed = diff.trim();
  if (!trimmed) {
    return "No code changes detected between source and target branches.";
  }
  const preview = trimmed.slice(0, 4000);
  return [
    "## Overview",
    "Automated description fallback was used because LLM generation failed.",
    "",
    "## Changes",
    "```diff",
    preview,
    "```",
    "",
    "## Breaking Changes",
    "No breaking changes.",
  ].join("\n");
}

function fallbackTitle(source: string, target: string): string {
  return `Merge ${source} into ${target}`.slice(0, 100);
}

async function resolveTargetBranch(
  inputTargetBranch: string | undefined,
  branches: string[],
  defaultBranch: string,
  mode: "interactive" | "ci",
  resolveFromCommand?: (args: { branches: string[]; defaultBranch: string }) => Promise<string>
): Promise<string> {
  if (inputTargetBranch) {
    return inputTargetBranch; // existence checked by validateBranchesNode and resolveTargetBranchNode
  }

  if (mode === "ci") {
    throw new Error("CI mode requires --target-branch.");
  }

  if (!defaultBranch) {
    throw new Error("No remote branches found.");
  }

  if (!resolveFromCommand) {
    throw new Error("Interactive mode requires target branch selection from the command layer.");
  }
  const target = (await resolveFromCommand({ branches, defaultBranch })).trim() || defaultBranch;
  if (!branches.includes(target)) {
    throw new Error(`Branch '${target}' does not exist in remote repository.`);
  }
  return target;
}

async function loadRuntimeNode(): Promise<{ runtime: WorkflowRuntime }> {
  return { runtime: await loadWorkflowRuntime() };
}

async function initializeClientsNode(state: CreateMrGraphState): Promise<{
  gitlab: GitLabClient;
  llm: LlmClient;
}> {
  const runtime = assertRuntime(state.runtime);
  if (!runtime.gitlabUrl || !runtime.gitlabKey) {
    throw new Error("Missing GitLab configuration. Run `cr init` or set GITLAB_URL/GITLAB_KEY.");
  }
  return {
    gitlab: createRuntimeGitLabClient(runtime),
    llm: createRuntimeLlmClient(runtime),
  };
}

async function resolveRepositoryContextNode(state: CreateMrGraphState): Promise<{
  sourceBranch: string;
  projectPath: string;
}> {
  const sourceBranch = await getCurrentBranch(state.input.repoPath);
  const remoteUrl = await getOriginRemoteUrl(state.input.repoPath);
  const projectPath = remoteToProjectPath(remoteUrl);
  logger.debug("create-mr", `repo context resolved`, { sourceBranch, remoteUrl, projectPath });
  return { sourceBranch, projectPath };
}

async function validateBranchesNode(state: CreateMrGraphState): Promise<Record<string, never>> {
  const gitlab = assertGitLab(state.gitlab);
  const [sourceExists, targetExists] = await Promise.all([
    gitlab.branchExists(state.projectPath, state.sourceBranch),
    state.input.targetBranch
      ? gitlab.branchExists(state.projectPath, state.input.targetBranch)
      : Promise.resolve(true), // target not yet resolved; checked after resolveTargetBranch
  ]);
  if (!sourceExists) {
    throw new Error(
      `Source branch '${state.sourceBranch}' does not exist in remote repository. Push the branch before creating a merge request.`
    );
  }
  if (state.input.targetBranch && !targetExists) {
    throw new Error(`Target branch '${state.input.targetBranch}' does not exist in remote repository.`);
  }
  return {};
}

async function loadRemoteBranchesNode(state: CreateMrGraphState): Promise<{ branches: string[]; defaultBranch: string }> {
  const phaseReporter = createWorkflowPhaseReporter(WORKFLOW_NAME, state.input.events);
  phaseReporter.started("load_remote_branches", "Loading remote branches...");
  const gitlab = assertGitLab(state.gitlab);
  const [branches, rawDefaultBranch] = await Promise.all([
    gitlab.listBranches(state.projectPath),
    gitlab.getDefaultBranch(state.projectPath),
  ]);
  const defaultBranch = branches.includes(rawDefaultBranch) ? rawDefaultBranch : (branches[0] ?? "");
  logger.debug("create-mr", `branches loaded`, {
    count: branches.length,
    rawDefaultBranch,
    effectiveDefaultBranch: defaultBranch,
  });
  phaseReporter.completed("load_remote_branches", "Loaded remote branches.");
  return { branches, defaultBranch };
}

async function resolveTargetBranchNode(
  state: CreateMrGraphState
): Promise<{ targetBranch: string }> {
  logger.debug("create-mr", `resolving target branch`, {
    inputTargetBranch: state.input.targetBranch,
    defaultBranch: state.defaultBranch,
    mode: state.input.mode,
    sourceBranch: state.sourceBranch,
  });
  const targetBranch = await resolveTargetBranch(
    state.input.targetBranch,
    state.branches,
    state.defaultBranch,
    state.input.mode,
    state.input.resolveTargetBranch
  );
  if (targetBranch === state.sourceBranch) {
    throw new Error("Source and target branch cannot be the same.");
  }
  // Validate the interactively-resolved target (user may type a branch not in the list)
  if (!state.input.targetBranch) {
    const exists = await assertGitLab(state.gitlab).branchExists(state.projectPath, targetBranch);
    if (!exists) {
      throw new Error(`Target branch '${targetBranch}' does not exist in remote repository.`);
    }
  }
  logger.debug("create-mr", `target branch resolved: ${targetBranch}`);
  return { targetBranch };
}

async function getBranchDiffNode(state: CreateMrGraphState): Promise<{ branchDiff: string }> {
  const phaseReporter = createWorkflowPhaseReporter(WORKFLOW_NAME, state.input.events);
  phaseReporter.started(
    "get_branch_diff",
    `Getting branch diff (${state.sourceBranch} -> ${state.targetBranch})...`
  );
  logger.debug("create-mr", `fetching branch diff`, {
    projectPath: state.projectPath,
    sourceBranch: state.sourceBranch,
    targetBranch: state.targetBranch,
  });
  const branchDiff = await assertGitLab(state.gitlab).compareBranches(
    state.projectPath,
    state.sourceBranch,
    state.targetBranch
  );
  phaseReporter.completed("get_branch_diff", "Branch diff retrieved.");
  if (!branchDiff.trim()) {
    throw new Error(
      `No differences found between '${state.sourceBranch}' and '${state.targetBranch}'. Ensure the source branch has commits not present on the target.`
    );
  }
  logger.debug("create-mr", `branch diff fetched, len=${branchDiff.length}`);
  return { branchDiff };
}

async function generateMrDraftNode(state: CreateMrGraphState): Promise<{
  title: string;
  description: string;
}> {
  let description = fallbackDescription(state.branchDiff);
  let title = fallbackTitle(state.sourceBranch, state.targetBranch);
  const runtime = assertRuntime(state.runtime);
  const llm = assertLlm(state.llm);
  const phaseReporter = createWorkflowPhaseReporter(WORKFLOW_NAME, state.input.events);

  if (!runtime.openaiApiUrl || !runtime.openaiApiKey) {
    reportStatus(state.input, "warning", "LLM config missing; using fallback title/description.");
    return { title, description };
  }

  try {
    const promptTemplate = await loadPrompt("mr.txt", state.input.repoRoot);
    let prompt = promptTemplate.replace("{mr_changes}", state.branchDiff);
    if (state.feedback?.trim()) {
      prompt = `Human feedback for this re-run:\n${state.feedback.trim()}\n\n${prompt}`;
    }
    phaseReporter.started("generate_mr_draft", "Generating merge request description...");
    description = await llm.generate(prompt);
    phaseReporter.completed("generate_mr_draft", "Merge request description generated.");

    const titlePrompt = [
      "Generate a concise GitLab merge request title (max 100 chars).",
      "Only return the title text.",
      "",
      description,
    ].join("\n");
    title = (await llm.generate(titlePrompt)).replaceAll("\n", " ").trim().slice(0, 100);
  } catch {
    reportStatus(
      state.input,
      "warning",
      "LLM generation failed; using fallback title/description."
    );
  }

  return { title, description };
}

async function publishDraftNode(
  state: CreateMrGraphState
): Promise<{ iteration: number; feedback: string }> {
  const nextIteration = state.iteration + 1;
  await state.input.onDraft?.({
    sourceBranch: state.sourceBranch,
    targetBranch: state.targetBranch,
    title: state.title,
    description: state.description,
    iteration: nextIteration,
  });
  return { iteration: nextIteration, feedback: "" };
}

async function promptForFeedbackNode(state: CreateMrGraphState): Promise<{
  shouldRegenerate: boolean;
  feedback: string;
}> {
  if (state.input.mode !== "interactive") {
    return { shouldRegenerate: false, feedback: "" };
  }
  if (!state.input.requestDraftFeedback) {
    return { shouldRegenerate: false, feedback: "" };
  }
  const feedback = await state.input.requestDraftFeedback();
  if (!feedback) {
    return { shouldRegenerate: false, feedback: "" };
  }

  reportStatus(state.input, "info", "Regenerating merge request draft with your feedback...");
  return { shouldRegenerate: true, feedback };
}

async function findExistingMergeRequestNode(state: CreateMrGraphState): Promise<{
  existingMr: { iid: number; web_url: string } | null;
}> {
  const existingMr = await assertGitLab(state.gitlab).findExistingMergeRequest(
    state.projectPath,
    state.sourceBranch,
    state.targetBranch
  );
  return { existingMr };
}

async function confirmMergeRequestUpsertNode(
  state: CreateMrGraphState
): Promise<{ shouldProceed: boolean }> {
  if (typeof state.input.shouldProceed === "boolean") {
    return { shouldProceed: state.input.shouldProceed };
  }
  if (state.input.mode !== "interactive") {
    return { shouldProceed: true };
  }
  if (!state.input.confirmUpsert) {
    throw new Error("Interactive mode requires upsert confirmation from the command layer.");
  }
  const shouldProceed = await state.input.confirmUpsert({
    existingMrIid: state.existingMr?.iid,
  });
  return { shouldProceed };
}

async function buildCancelledResultNode(
  state: CreateMrGraphState
): Promise<{ result: CreateMrWorkflowResult }> {
  reportStatus(state.input, "warning", "Merge request operation cancelled by user.");
  return {
    result: {
      sourceBranch: state.sourceBranch,
      targetBranch: state.targetBranch,
      title: state.title,
      description: state.description,
      mergeRequestUrl: state.existingMr?.web_url,
      action: "cancelled",
    },
  };
}

async function upsertMergeRequestNode(
  state: CreateMrGraphState
): Promise<{ result: CreateMrWorkflowResult }> {
  const gitlab = assertGitLab(state.gitlab);
  const phaseReporter = createWorkflowPhaseReporter(WORKFLOW_NAME, state.input.events);

  if (state.existingMr) {
    phaseReporter.started(
      "upsert_merge_request",
      `Updating existing MR !${state.existingMr.iid}...`
    );
    const url = await gitlab.updateMergeRequest(
      state.projectPath,
      state.existingMr.iid,
      state.title,
      state.description
    );
    phaseReporter.completed("upsert_merge_request", "Merge request updated.");
    return {
      result: {
        sourceBranch: state.sourceBranch,
        targetBranch: state.targetBranch,
        title: state.title,
        description: state.description,
        mergeRequestUrl: url,
        action: "updated",
      },
    };
  }

  phaseReporter.started("upsert_merge_request", "Creating merge request...");
  const url = await gitlab.createMergeRequest(
    state.projectPath,
    state.sourceBranch,
    state.targetBranch,
    state.title,
    state.description
  );
  phaseReporter.completed("upsert_merge_request", "Merge request created.");
  return {
    result: {
      sourceBranch: state.sourceBranch,
      targetBranch: state.targetBranch,
      title: state.title,
      description: state.description,
      mergeRequestUrl: url,
      action: "created",
    },
  };
}

export async function runCreateMrWorkflow(
  input: CreateMrWorkflowInput
): Promise<CreateMrWorkflowResult> {
  const finalState = await runWorkflow<CreateMrGraphState>({
    initialState: {
      input,
      runtime: null,
      gitlab: null,
      llm: null,
      sourceBranch: "",
      targetBranch: "",
      projectPath: "",
      branches: [],
      defaultBranch: "",
      branchDiff: "",
      title: "",
      description: "",
      iteration: 0,
      feedback: input.userFeedback ?? "",
      shouldRegenerate: false,
      existingMr: null,
      shouldProceed: true,
      result: null,
    },
    steps: {
      loadRuntime: loadRuntimeNode,
      initializeClients: initializeClientsNode,
      resolveRepositoryContext: resolveRepositoryContextNode,
      validateBranches: validateBranchesNode,
      loadRemoteBranches: loadRemoteBranchesNode,
      resolveTargetBranch: resolveTargetBranchNode,
      getBranchDiff: getBranchDiffNode,
      generateMrDraft: generateMrDraftNode,
      publishDraft: publishDraftNode,
      promptForFeedback: promptForFeedbackNode,
      findExistingMergeRequest: findExistingMergeRequestNode,
      confirmMergeRequestUpsert: confirmMergeRequestUpsertNode,
      buildCancelledResult: buildCancelledResultNode,
      upsertMergeRequest: upsertMergeRequestNode,
    },
    routes: {
      loadRuntime: "initializeClients",
      initializeClients: "resolveRepositoryContext",
      resolveRepositoryContext: "validateBranches",
      validateBranches: "loadRemoteBranches",
      loadRemoteBranches: "resolveTargetBranch",
      resolveTargetBranch: "getBranchDiff",
      getBranchDiff: "generateMrDraft",
      generateMrDraft: "publishDraft",
      publishDraft: "promptForFeedback",
      promptForFeedback: (state) =>
        state.shouldRegenerate ? "generateMrDraft" : "findExistingMergeRequest",
      findExistingMergeRequest: "confirmMergeRequestUpsert",
      confirmMergeRequestUpsert: (state) =>
        state.shouldProceed ? "upsertMergeRequest" : "buildCancelledResult",
      buildCancelledResult: "end",
      upsertMergeRequest: "end",
    },
    start: "loadRuntime",
    end: "end",
  });

  if (!finalState.result) {
    throw new Error("Create MR workflow did not produce a result.");
  }
  return finalState.result;
}
