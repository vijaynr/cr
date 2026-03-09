/**
 * Lightweight workflow runner - replaces LangGraph
 * No dependencies, ~50 lines of code
 */
import { logger } from "./logger.js";

export type WorkflowStep<S> = (state: S) => Promise<Partial<S>>;
export type ConditionalRoute<S> = (state: S) => string;

/**
 * Simple sequential workflow runner
 */
export async function runSequentialWorkflow<S>(
  initialState: S,
  steps: WorkflowStep<S>[]
): Promise<S> {
  let state = initialState;
  for (const step of steps) {
    const updates = await step(state);
    state = { ...state, ...updates };
  }
  return state;
}

/**
 * Workflow with conditional branching and loops
 */
export async function runWorkflow<S>(config: {
  initialState: S;
  steps: Record<string, WorkflowStep<S>>;
  routes: Record<string, string | ConditionalRoute<S>>;
  start: string;
  end: string;
}): Promise<S> {
  const { initialState, steps, routes, start, end } = config;
  let state = initialState;
  let currentNode = start;

  while (currentNode !== end) {
    const step = steps[currentNode];
    if (!step) {
      throw new Error(`Workflow step "${currentNode}" not found`);
    }

    logger.debug("workflow", `→ ${currentNode}`);
    try {
      const updates = await step(state);
      state = { ...state, ...updates };
      logger.debug("workflow", `✓ ${currentNode}`);
    } catch (err) {
      logger.error(
        "workflow",
        `✗ ${currentNode}`,
        err instanceof Error ? err : new Error(String(err))
      );
      throw err;
    }

    // Determine next node
    const route = routes[currentNode];
    if (typeof route === "string") {
      currentNode = route;
    } else if (typeof route === "function") {
      currentNode = route(state);
    } else {
      throw new Error(`No route defined for node "${currentNode}"`);
    }
  }

  return state;
}
