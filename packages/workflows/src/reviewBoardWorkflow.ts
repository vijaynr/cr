import {
  createRuntimeLlmClient,
  createReviewBoardClient,
  createRuntimeReviewBoardClient,
  loadWorkflowRuntime,
  runWorkflow,
  loadPrompt,
  type LlmClient,
  type ReviewBoardClient,
  type ReviewWorkflowInput,
  type ReviewWorkflowResult,
  type WorkflowRuntime,
} from "@cr/core";
import { createWorkflowPhaseReporter } from "./workflowEvents.js";
import { injectMergeRequestContextIntoTemplate } from "./reviewWorkflowHelper.js";

const WORKFLOW_NAME = "review";

type ReviewBoardContext = {
  requestId: number;
  request: Awaited<ReturnType<ReviewBoardClient["getReviewRequest"]>>;
  diffSet: { id: number; revision: number };
  files: Array<{ id: number; source_file: string; dest_file: string }>;
};

type ReviewBoardGraphState = {
  input: ReviewWorkflowInput;
  runtime: WorkflowRuntime | null;
  llm: LlmClient | null;
  rb: ReviewBoardClient | null;
  context: ReviewBoardContext | null;
  result: ReviewWorkflowResult | null;
  pendingFeedback: string;
  feedbackUsed: boolean;
};

export async function runReviewBoardWorkflow(
  input: ReviewWorkflowInput & { userFeedback?: string }
): Promise<ReviewWorkflowResult> {
  const initialState: ReviewBoardGraphState = {
    input,
    runtime: null,
    llm: null,
    rb: null,
    context: null,
    result: null,
    pendingFeedback: input.userFeedback ?? "",
    feedbackUsed: false,
  };

  const finalState = await runWorkflow<ReviewBoardGraphState>({
    initialState,
    steps: {
      init: async () => {
        const runtime = await loadWorkflowRuntime();
        const llm = createRuntimeLlmClient(runtime);
        const rb = createRuntimeReviewBoardClient(runtime);
        return { runtime, llm, rb };
      },
      loadContext: async (state) => {
        const rb = state.rb!;
        const requestId = state.input.mrIid!;
        const phaseReporter = createWorkflowPhaseReporter(WORKFLOW_NAME, state.input.events);
        phaseReporter.started("load_mr_context", "Loading Review Board context...");

        const request = await rb.getReviewRequest(requestId);
        const diffSet = await rb.getLatestDiffSet(requestId);
        if (!diffSet) {
          throw new Error(`No diffs found for review request #${requestId}`);
        }
        const files = await rb.getFileDiffs(requestId, diffSet.id);

        phaseReporter.completed("load_mr_context", "Loaded Review Board context.");
        return { context: { requestId, request, diffSet, files } };
      },
      generateReview: async (state) => {
        const rb = state.rb!;
        const llm = state.llm!;
        const context = state.context!;
        const phaseReporter = createWorkflowPhaseReporter(WORKFLOW_NAME, state.input.events);
        phaseReporter.started("generate_review", "Analyzing Review Board changes...");

        // RB doesn't easily expose individual commits like GitLab MRs in one call,
        // and we are disabling inline comments for now.
        const rawDiff = await rb.getRawDiff(context.requestId, context.diffSet.revision);

        const template = await loadPrompt("review.txt", state.input.repoRoot);
        let prompt = injectMergeRequestContextIntoTemplate(template, {
          mrContent: `${context.request.summary}\n\n${context.request.description}`,
          mrChanges: rawDiff || context.files.map((f) => f.dest_file).join("\n"),
          mrCommits: "N/A", // Not easily available for RB
        });

        const effectiveFeedback = state.pendingFeedback;
        if (effectiveFeedback?.trim()) {
          prompt = `Human feedback for this re-run:\n${effectiveFeedback.trim()}\n\n${prompt}`;
        }

        const reviewOutput = await llm.generate(prompt);

        phaseReporter.completed("generate_review", "Generated review analysis.");

        return {
          result: {
            output: reviewOutput,
            contextLabel: `Review Request #${context.requestId}`,
            inlineComments: [],
            rbUrl: state.runtime?.rbUrl,
            mrIid: context.requestId,
          },
        };
      },
    },
    routes: {
      init: "loadContext",
      loadContext: "generateReview",
      generateReview: "end",
    },
    start: "init",
    end: "end",
  });

  return finalState.result!;
}

export async function maybePostReviewBoardComment(
  result: ReviewWorkflowResult,
  _mode: string,
  enabled: boolean,
  rbToken: string
): Promise<{ summaryNoteId?: string; inlineNoteIds: string[] } | null> {
  if (!enabled || !result.rbUrl || !result.mrIid) return null;

  const rb = createReviewBoardClient(result.rbUrl, rbToken);
  const requestId = result.mrIid;

  // 1. Create a review
  const summaryBody = result.overallSummary || result.output;
  const review = await rb.createReview(requestId, summaryBody);

  const inlineNoteIds: string[] = [];
  // 2. Add diff comments
  for (const inline of result.inlineComments) {
    // We need the fileDiffId which we should have stashed in the inline comment object
    const fileDiffId = "id" in inline && typeof inline.id === "number" ? inline.id : undefined;
    if (fileDiffId) {
      await rb.addDiffComment(
        requestId,
        review.id,
        fileDiffId,
        inline.line,
        1, // num_lines, default to 1
        inline.comment
      );
      inlineNoteIds.push(`comment-${fileDiffId}-${inline.line}`);
    }
  }

  // 3. Publish the review
  await rb.publishReview(requestId, review.id);

  return { summaryNoteId: String(review.id), inlineNoteIds };
}
