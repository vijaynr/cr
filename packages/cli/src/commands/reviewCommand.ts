import path from "node:path";
import {
  printAlert,
  printCommandHelp,
  printReviewComment,
  printReviewSummary,
  createSpinner,
  printDivider,
  COLORS,
  DOT,
} from "@cr/ui";
import { askForOptionalFeedback, promptWithFrame } from "@cr/ui";
import {
  createWorkflowStatusController,
  runLiveTask,
  runLiveChatLoop,
  type LiveController,
  type WorkflowStatusController,
} from "@cr/ui";
import {
  envOrConfig,
  loadCRConfig,
  listReviewRequests as rbListRequests,
  getCurrentUser as rbGetCurrentUser,
} from "@cr/core";
import { getOriginRemoteUrl } from "@cr/core";
import { listMergeRequests, remoteToProjectPath } from "@cr/core";
import { repoRootFromModule } from "@cr/core";
import {
  getFlag,
  getWorkflowHeadingAndDescription,
  getWorkflowResultTitle,
  hasFlag,
  readStdinDiff,
  type ReviewWorkflowKind,
} from "../cliHelpers.js";
import {
  maybePostReviewComment,
  maybePostReviewBoardComment,
  runReviewWorkflow,
  runReviewBoardWorkflow,
  type ReviewWorkflowInput,
} from "@cr/workflows";
import { answerReviewChatQuestion, runReviewChatWorkflow } from "@cr/workflows";
import type { WorkflowMode, MergeRequestState } from "@cr/core";
import { runReviewSummarizeWorkflow } from "@cr/workflows";

async function askForFeedbackIteration(): Promise<string | null> {
  return askForOptionalFeedback({
    confirmMessage: "Do you want to provide feedback to improve the review comment?",
  });
}

async function resolveInteractiveRemoteSelection(input: ReviewWorkflowInput): Promise<boolean> {
  const config = await loadCRConfig();

  if (input.provider === "reviewboard") {
    const rbUrl = envOrConfig("RB_URL", config.rbUrl, "");
    const rbToken = envOrConfig("RB_TOKEN", config.rbToken, "");
    if (!rbUrl || !rbToken) {
      throw new Error(
        "Missing Review Board configuration. Run `cr init --rb` or set RB_URL/RB_TOKEN."
      );
    }

    const rbStatusMap: Record<MergeRequestState, "pending" | "submitted" | "all"> = {
      opened: "pending",
      closed: "all", // RB doesn't have a direct 'closed' state that is common, 'discarded' is another
      merged: "submitted",
      all: "all",
    };

    const fromUser = getFlag(process.argv, "from", "", "-f") || undefined;
    printDivider();
    const spinner = createSpinner("Loading review requests...").start();
    let rrs: any[] = [];

    try {
      rrs = await rbListRequests(rbUrl, rbToken, rbStatusMap[input.state] || "pending", fromUser);

      if (rrs.length === 0 && !fromUser && input.state === "opened") {
        // If no global pending requests found, fetch specifically for the current user
        const user = await rbGetCurrentUser(rbUrl, rbToken);

        // 1. Outgoing (from the user)
        const outgoing = await rbListRequests(rbUrl, rbToken, "pending", user.username);

        // 2. Incoming (directly to the user)
        const incomingDirectUrl = `/api/review-requests/?status=pending&to-users-directly=${encodeURIComponent(user.username)}&expand=submitter`;
        const incomingDirectResp = await (
          await import("@cr/core")
        ).rbRequest<{ review_requests: any[] }>(rbUrl, rbToken, incomingDirectUrl);
        const incomingDirect = incomingDirectResp.review_requests ?? [];

        // 3. Incoming (via groups)
        const incomingGroupsUrl = `/api/review-requests/?status=pending&to-users=${encodeURIComponent(user.username)}&expand=submitter`;
        const incomingGroupsResp = await (
          await import("@cr/core")
        ).rbRequest<{ review_requests: any[] }>(rbUrl, rbToken, incomingGroupsUrl);
        const incomingGroups = incomingGroupsResp.review_requests ?? [];

        // Combine and deduplicate by ID
        const allRrs = [...outgoing, ...incomingDirect, ...incomingGroups];
        const seenIds = new Set<number>();
        rrs = allRrs.filter((rr) => {
          if (seenIds.has(rr.id)) return false;
          seenIds.add(rr.id);
          return true;
        });
      }
    } finally {
      spinner.stopAndPersist({
        symbol: COLORS.green + DOT + COLORS.reset,
        text: "Review requests loaded.",
      });
    }

    if (rrs.length === 0) {
      throw new Error(`No ${rbStatusMap[input.state] || "pending"} review requests found.`);
    }
    const choices = rrs.map((rr) => ({
      title: `#${rr.id} [by ${rr.submitter?.username || "unknown"}] ${rr.summary}`,
      value: rr.id,
    }));
    const selection = await promptWithFrame(
      {
        type: "autocomplete",
        name: "requestId",
        message: "Select review request (type to search)",
        choices,
        suggest: (input: string, choices: Array<{ title: string; value?: number }>) => {
          const searchTerm = input.toLowerCase();
          return Promise.resolve(
            choices.filter((choice) => choice.title.toLowerCase().includes(searchTerm))
          );
        },
      },
      { onCancel: () => true }
    );
    if (!selection.requestId) return false;
    input.mrIid = Number(selection.requestId);
    return true;
  }

  const gitlabUrl = envOrConfig("GITLAB_URL", config.gitlabUrl, "");
  const gitlabKey = envOrConfig("GITLAB_KEY", config.gitlabKey, "");
  if (!gitlabUrl || !gitlabKey) {
    throw new Error("Missing GitLab configuration. Run `cr init` or set GITLAB_URL/GITLAB_KEY.");
  }

  const repoUrl = input.url ?? (await getOriginRemoteUrl(input.repoPath));
  const projectPath = remoteToProjectPath(repoUrl);
  const mrs = await listMergeRequests(gitlabUrl, gitlabKey, projectPath, input.state);
  if (mrs.length === 0) {
    throw new Error("No merge requests found.");
  }
  if (mrs.length === 1) {
    input.mrIid = mrs[0].iid;
    return true;
  }

  // Use autocomplete for searchable MR selection
  const choices = mrs.map((mr) => ({
    title: `!${mr.iid} [${mr.state}] ${mr.title}`,
    value: mr.iid,
  }));

  const selection = await promptWithFrame(
    {
      type: "autocomplete",
      name: "mrIid",
      message: "Select merge request (type to search)",
      choices,
      suggest: (input: string, choices: Array<{ title: string; value?: number }>) => {
        const searchTerm = input.toLowerCase();
        return Promise.resolve(
          choices.filter((choice) => choice.title.toLowerCase().includes(searchTerm))
        );
      },
    },
    { onCancel: () => true }
  );
  if (!selection.mrIid) {
    return false;
  }
  input.mrIid = Number(selection.mrIid);
  return true;
}

async function confirmInteractiveStartIfNeeded(args: {
  workflow: ReviewWorkflowKind;
  ui: LiveController;
  workflowResultTitle: string;
}): Promise<boolean> {
  if (args.workflow === "summarize") {
    return true;
  }

  if (args.workflow === "review") {
    const itemType = args.workflowResultTitle.includes("Review Request")
      ? "review request"
      : "merge request";
    const confirm = await promptWithFrame(
      {
        type: "confirm",
        name: "runReview",
        message: `Do you want to run the code review for this ${itemType}?`,
        initial: false,
      },
      { onCancel: () => true }
    );
    if (!confirm.runReview) {
      args.ui.warning("Code review cancelled by user. No actions were taken.");
      args.ui.setResult(args.workflowResultTitle, "Status: Cancelled.");
      return false;
    }
    return true;
  }

  const confirm = await promptWithFrame(
    {
      type: "confirm",
      name: "startChat",
      message: "Do you want to ask questions about this merge request?",
      initial: false,
    },
    { onCancel: () => true }
  );
  if (!confirm.startChat) {
    args.ui.warning("Interactive chat cancelled by user. No actions were taken.");
    args.ui.setResult(args.workflowResultTitle, "Status: Cancelled.");
    return false;
  }
  return true;
}

async function runChatFlow(args: {
  input: ReviewWorkflowInput;
  repoRoot: string;
  workflowResultTitle: string;
  ui: LiveController;
  status: WorkflowStatusController;
}): Promise<void> {
  const { input, repoRoot, workflowResultTitle, ui, status } = args;
  const chatContext = await runReviewChatWorkflow({
    ...input,
    status: status.status,
    events: status.events,
  });
  await runLiveChatLoop({
    chatContext,
    workflowResultTitle,
    ui,
    answerQuestion: (question, history) =>
      answerReviewChatQuestion({
        repoRoot,
        context: chatContext,
        question,
        history,
        events: status.events,
      }),
  });
}

async function maybePostReviewNotes(args: {
  input: ReviewWorkflowInput;
  result: Awaited<ReturnType<typeof runReviewWorkflow>>;
  ui: LiveController;
}): Promise<{ postedSummaryNoteId?: string; postedInlineCount: number }> {
  if (args.input.workflow !== "review") {
    return { postedInlineCount: 0 };
  }

  const config = await loadCRConfig();

  if (args.input.provider === "reviewboard") {
    const rbToken = envOrConfig("RB_TOKEN", config.rbToken, "");
    if (!rbToken) return { postedInlineCount: 0 };

    let shouldPost = !args.input.local;
    if (shouldPost && args.input.mode === "interactive") {
      const response = await promptWithFrame(
        {
          type: "confirm",
          name: "shouldPost",
          message: "Post this review comment to Review Board?",
          initial: false,
        },
        { onCancel: () => true }
      );
      shouldPost = Boolean(response.shouldPost);
    }
    if (!shouldPost) return { postedInlineCount: 0 };

    const posted = await maybePostReviewBoardComment(
      args.result,
      args.input.mode,
      shouldPost,
      rbToken
    );
    if (!posted) return { postedInlineCount: 0 };
    return {
      postedSummaryNoteId: posted.summaryNoteId,
      postedInlineCount: posted.inlineNoteIds.length,
    };
  }

  const gitlabKey = envOrConfig("GITLAB_KEY", config.gitlabKey, "");
  if (!gitlabKey) {
    return { postedInlineCount: 0 };
  }

  let shouldPost = !args.input.local;
  if (shouldPost && args.input.mode === "interactive") {
    const response = await promptWithFrame(
      {
        type: "confirm",
        name: "shouldPost",
        message: "Post this review comment to GitLab?",
        initial: false,
      },
      { onCancel: () => true }
    );
    shouldPost = Boolean(response.shouldPost);
  }
  if (!shouldPost) {
    return { postedInlineCount: 0 };
  }

  const posted = await maybePostReviewComment(args.result, args.input.mode, shouldPost, gitlabKey);
  if (!posted) {
    return { postedInlineCount: 0 };
  }

  const postedSummaryNoteId = posted.summaryNoteId;
  const postedInlineCount = posted.inlineNoteIds.length;

  return { postedSummaryNoteId, postedInlineCount };
}

async function runSummaryFlow(args: {
  input: ReviewWorkflowInput;
  workflowResultTitle: string;
  ui: LiveController;
  status: WorkflowStatusController;
}): Promise<void> {
  const { input, workflowResultTitle, ui, status } = args;
  const result = await runReviewSummarizeWorkflow({
    ...input,
    status: status.status,
    events: status.events,
  });
  status.stop();
  printReviewSummary(result);
  ui.setResult(workflowResultTitle, `Context: ${result.contextLabel}`);
}

async function runReviewFlow(args: {
  input: ReviewWorkflowInput;
  workflowResultTitle: string;
  ui: LiveController;
  status: WorkflowStatusController;
}): Promise<void> {
  const { input, workflowResultTitle, ui, status } = args;
  const runOnce = async (userFeedback?: string) => {
    if (input.provider === "reviewboard") {
      return runReviewBoardWorkflow({
        ...input,
        userFeedback,
        status: status.status,
        events: status.events,
      });
    }
    return runReviewWorkflow({
      ...input,
      userFeedback,
      status: status.status,
      events: status.events,
    });
  };
  let result = await runOnce();
  while (true) {
    status.stop();
    printReviewComment(result);

    if (input.mode !== "interactive") {
      break;
    }
    const nextFeedback = await askForFeedbackIteration();
    if (!nextFeedback) {
      break;
    }
    ui.info("Regenerating review with your feedback...");
    result = await runOnce(nextFeedback);
  }

  const posted = await maybePostReviewNotes({ input, result, ui });
  const postSummary =
    posted.postedInlineCount > 0 || posted.postedSummaryNoteId
      ? `\n\nPosted: ${
          posted.postedInlineCount > 0 ? `${posted.postedInlineCount} inline comment(s)` : ""
        }${
          posted.postedInlineCount > 0 && posted.postedSummaryNoteId ? " + " : ""
        }${posted.postedSummaryNoteId ? `summary note ${posted.postedSummaryNoteId}` : ""}`
      : "";
  const outputBody = `Context: ${result.contextLabel}${postSummary}`;
  ui.setResult(workflowResultTitle, outputBody);
}

async function runReviewWorkflowTask(args: {
  input: ReviewWorkflowInput;
  repoRoot: string;
  workflowResultTitle: string;
  ui: LiveController;
}): Promise<void> {
  const { input, repoRoot, workflowResultTitle, ui } = args;

  if (!input.local && input.mode === "interactive") {
    const didSelectMergeRequest = await resolveInteractiveRemoteSelection(input);
    if (!didSelectMergeRequest) {
      const itemType = input.provider === "reviewboard" ? "Review request" : "Merge request";
      ui.warning(`${itemType} selection cancelled by user. No actions were taken.`);
      ui.setResult(workflowResultTitle, "Status: Cancelled.");
      return;
    }

    const shouldContinue = await confirmInteractiveStartIfNeeded({
      workflow: input.workflow,
      ui,
      workflowResultTitle,
    });
    if (!shouldContinue) {
      return;
    }
  }
  let status = createWorkflowStatusController({
    ui,
    workflow: "review",
  });
  try {
    if (input.workflow === "chat") {
      status = createWorkflowStatusController({
        ui,
        workflow: "reviewChat",
      });
      await runChatFlow({
        input,
        repoRoot,
        workflowResultTitle,
        ui,
        status,
      });
      return;
    }

    if (input.workflow === "summarize") {
      status = createWorkflowStatusController({
        ui,
        workflow: "reviewSummarize",
      });
      await runSummaryFlow({
        input,
        workflowResultTitle,
        ui,
        status,
      });
    } else {
      await runReviewFlow({
        input,
        workflowResultTitle,
        ui,
        status,
      });
    }
  } finally {
    status.close();
  }
}

export async function runReviewCommand(args: string[]): Promise<void> {
  if (args.includes("--help") || args.includes("-h")) {
    printCommandHelp([
      {
        title: "USAGE",
        lines: ["cr review [options]"],
      },
      {
        title: "OPTIONS",
        lines: [
          "--workflow, -w <type>  Workflow type: default, summarize, chat",
          "                       default: Code review for merge request",
          "                       summarize: Summary of MR changes",
          "                       chat: Interactive Q&A over MR context",
          "",
          "--path, -p <path>      Path to repository (default: current directory)",
          "--url, -u <url>        GitLab merge request URL",
          "--from, -f <user>      Filter Review Board requests by user",
          "--rb                   Use Review Board provider",
          "--mode, -m <mode>      Mode: interactive or ci (default: interactive)",
          "--local                Review uncommitted changes via git diff",
          "--state, -s <state>    MR state filter: opened, closed, merged, all (default: opened)",
          "--inline-comments      Post inline review comments to GitLab/ReviewBoard",
        ],
      },
      {
        title: "EXAMPLES",
        lines: [
          "cr review",
          "cr review --workflow summarize",
          "cr review --workflow chat",
          "cr review --rb",
          "cr review --rb --from username",
          "cr review --path /path/to/repo",
          "cr review --url https://gitlab.com/org/repo/-/merge_requests/123",
          "cr review --local",
          "git diff | cr review --local",
          "cr review --state all",
        ],
      },
      {
        title: "WORKFLOWS",
        lines: [
          "default     Analyze merge request and generate detailed review comments",
          "summarize   Generate a concise summary of all changes in the MR",
          "chat        Interactive Q&A session about the merge request",
        ],
      },
    ]);
    return;
  }

  const mode: WorkflowMode =
    getFlag(args, "mode", "interactive", "-m") === "ci" ? "ci" : "interactive";
  const repoPath = path.resolve(getFlag(args, "path", ".", "-p"));
  const url = getFlag(args, "url", "", "-u") || undefined;
  const workflowRaw = getFlag(args, "workflow", "default", "-w");
  const stateRaw = getFlag(args, "state", "opened", "-s");
  const local = hasFlag(args, "local");
  const inlineComments = hasFlag(args, "inline-comments");
  const rb = hasFlag(args, "rb");
  const repoRoot = repoRootFromModule(import.meta.url);
  const stdinDiff = await readStdinDiff();

  if (workflowRaw === "chat" && (local || rb)) {
    printAlert({
      title: "Unsupported Combination",
      message: "The --local or --rb option is not supported in chat mode.",
      tone: "error",
    });
    process.exitCode = 1;
    return;
  }

  const workflow: ReviewWorkflowKind =
    workflowRaw === "chat" ? "chat" : workflowRaw === "summarize" ? "summarize" : "review";
  const state = ["opened", "closed", "merged", "all"].includes(stateRaw)
    ? (stateRaw as "opened" | "closed" | "merged" | "all")
    : "opened";

  const input: ReviewWorkflowInput = {
    repoPath,
    repoRoot,
    mode,
    workflow,
    local,
    inlineComments,
    url,
    state,
    stdinDiff,
    provider: rb ? "reviewboard" : "gitlab",
  };
  const intro = getWorkflowHeadingAndDescription(workflow, local, input.provider);
  const workflowResultTitle = getWorkflowResultTitle(workflow, local, input.provider);

  try {
    await runLiveTask(
      intro.heading,
      async (ui) =>
        runReviewWorkflowTask({
          input,
          repoRoot,
          workflowResultTitle,
          ui,
        }),
      intro.description
    );
  } catch {
    // runLiveTask already prints the error once; avoid duplicate output here.
    process.exitCode = 1;
  }
}
