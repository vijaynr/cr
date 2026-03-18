import { css } from "lit";

export const dashboardThemeStyles = css`
  :host {
    --bg: #0c1117;
    --bg-strong: #121923;
    --bg-contrast: #e8edf5;
    --panel: rgba(17, 24, 34, 0.96);
    --panel-solid: #111826;
    --panel-muted: #161e2a;
    --surface: rgba(23, 31, 43, 0.98);
    --surface-muted: #1a2431;
    --surface-raised: rgba(28, 38, 51, 0.98);
    --line: rgba(148, 163, 184, 0.14);
    --line-strong: rgba(148, 163, 184, 0.28);
    --ink: #e6edf6;
    --ink-soft: #a7b3c5;
    --ink-faint: #7f8ca1;
    --accent: #3b82f6;
    --accent-strong: #2563eb;
    --accent-soft: rgba(59, 130, 246, 0.16);
    --accent-glow: rgba(59, 130, 246, 0.28);
    --success: #22c55e;
    --success-soft: rgba(34, 197, 94, 0.14);
    --danger: #ef4444;
    --danger-soft: rgba(239, 68, 68, 0.14);
    --shadow-sm: 0 8px 18px rgba(3, 7, 18, 0.35);
    --shadow: 0 18px 40px rgba(3, 7, 18, 0.42);
    --shadow-lg: 0 28px 56px rgba(3, 7, 18, 0.5);
    --radius-xs: 8px;
    --radius-sm: 10px;
    --radius-md: 12px;
    --radius-lg: 16px;
    color: var(--ink);
    font-family:
      "Space Grotesk",
      "IBM Plex Sans",
      "Avenir Next",
      "Segoe UI",
      sans-serif;
    line-height: 1.5;
  }

  * {
    box-sizing: border-box;
  }

  h1,
  h2,
  h3,
  h4,
  p {
    margin: 0;
  }

  h1,
  h2,
  h3 {
    font-family:
      "Space Grotesk",
      "IBM Plex Sans",
      "Segoe UI",
      sans-serif;
    font-weight: 700;
    letter-spacing: -0.03em;
    line-height: 1.08;
  }

  code,
  pre,
  .mono {
    font-family:
      "IBM Plex Mono",
      "SFMono-Regular",
      "SF Mono",
      "Menlo",
      monospace;
  }

  .muted {
    color: var(--ink-soft);
  }

  .subtle {
    color: var(--ink-faint);
  }

  .eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    color: var(--ink-soft);
    font-size: 0.76rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .eyebrow::before {
    content: "";
    width: 8px;
    height: 8px;
    border-radius: 2px;
    background: var(--accent);
    box-shadow: none;
  }

  .panel,
  .surface {
    background: var(--panel);
    border: 1px solid var(--line);
    box-shadow: var(--shadow);
    backdrop-filter: blur(10px);
  }

  .surface {
    background: var(--surface);
  }

  .badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-height: 28px;
    padding: 0 10px;
    border-radius: 999px;
    border: 1px solid var(--line);
    background: rgba(148, 163, 184, 0.08);
    color: var(--ink-soft);
    font-size: 0.82rem;
    font-weight: 650;
  }

  .badge[data-tone="accent"] {
    border-color: rgba(184, 106, 25, 0.18);
    background: var(--accent-soft);
    color: var(--accent-strong);
  }

  .badge[data-tone="success"] {
    border-color: rgba(44, 106, 83, 0.22);
    background: var(--success-soft);
    color: var(--success);
  }

  .badge[data-tone="danger"] {
    border-color: rgba(154, 65, 50, 0.22);
    background: var(--danger-soft);
    color: var(--danger);
  }

  button,
  input,
  textarea,
  select {
    font: inherit;
  }

  button:focus-visible,
  input:focus-visible,
  textarea:focus-visible,
  select:focus-visible,
  a:focus-visible {
    outline: 3px solid var(--accent-glow);
    outline-offset: 2px;
  }

  .button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-height: 42px;
    padding: 0 16px;
    border-radius: var(--radius-xs);
    border: 1px solid var(--line);
    background: var(--surface-raised);
    color: var(--ink);
    cursor: pointer;
    transition:
      border-color 140ms ease,
      background 140ms ease,
      transform 140ms ease,
      box-shadow 140ms ease;
    text-decoration: none;
    box-shadow: var(--shadow-sm);
  }

  .button:hover {
    background: #1d2735;
    border-color: var(--line-strong);
    transform: translateY(-1px);
  }

  .button:disabled {
    opacity: 0.55;
    cursor: progress;
    transform: none;
    box-shadow: none;
  }

  .button[data-tone="primary"] {
    border-color: var(--accent-strong);
    background: linear-gradient(180deg, #3b82f6, #2563eb);
    color: white;
  }

  .button[data-tone="primary"]:hover {
    background: linear-gradient(180deg, #5b9cff, #2563eb);
  }

  .button[data-tone="ghost"] {
    background: transparent;
    box-shadow: none;
  }

  .button[data-tone="danger"] {
    border-color: rgba(154, 65, 50, 0.2);
    background: var(--danger-soft);
    color: var(--danger);
  }

  .field,
  .textarea,
  .select {
    width: 100%;
    min-height: 46px;
    padding: 12px 14px;
    border-radius: var(--radius-xs);
    border: 1px solid var(--line);
    background: #0f1621;
    color: var(--ink);
    transition:
      border-color 140ms ease,
      background 140ms ease,
      box-shadow 140ms ease;
  }

  .field:hover,
  .textarea:hover,
  .select:hover {
    border-color: var(--line-strong);
  }

  .field:focus,
  .textarea:focus,
  .select:focus {
    border-color: rgba(59, 130, 246, 0.42);
    background: #0f1621;
    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.14);
    outline: none;
  }

  .textarea {
    min-height: 120px;
    resize: vertical;
  }

  .notice {
    padding: 14px 16px;
    border: 1px solid var(--line);
    border-radius: var(--radius-xs);
    background: rgba(148, 163, 184, 0.07);
    color: var(--ink-soft);
  }

  .notice[data-tone="warning"] {
    border-color: rgba(217, 118, 18, 0.22);
    background: var(--accent-soft);
    color: var(--accent-strong);
  }

  .notice[data-tone="error"] {
    border-color: rgba(154, 65, 50, 0.2);
    background: var(--danger-soft);
    color: var(--danger);
  }

  .notice[data-tone="success"] {
    border-color: rgba(44, 106, 83, 0.2);
    background: var(--success-soft);
    color: var(--success);
  }
`;
