import { css } from "lit";

// Only used by cr-diff-viewer for code line highlighting
export const diffCodeStyles = css`
  .diff-line[data-kind="add"] { background: rgba(34, 197, 94, 0.12); }
  .diff-line[data-kind="remove"] { background: rgba(239, 68, 68, 0.12); }
  .diff-line[data-kind="header"] { background: rgba(148, 163, 184, 0.08); color: #94a3b8; }
  .diff-line[data-active="true"] { outline: 1px solid rgba(59, 130, 246, 0.5); outline-offset: -1px; }
`;

// Kept for backward compat — components no longer use this
export const dashboardThemeStyles = css``;
