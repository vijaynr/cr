import { css } from "lit";

export const dashboardThemeStyles = css`
  :host {
    --paper: rgba(255, 251, 243, 0.82);
    --ink: #1f2923;
    --muted: #5c695e;
    --line: rgba(31, 41, 35, 0.14);
    --accent: #335c4c;
    --accent-soft: rgba(51, 92, 76, 0.1);
    --danger: #8a3b2f;
    color: var(--ink);
  }

  h1,
  h2,
  h3,
  p {
    margin: 0;
  }

  .muted,
  .provider-meta,
  .request-meta {
    color: var(--muted);
  }

  .panel,
  .provider,
  .request {
    backdrop-filter: blur(8px);
    background: var(--paper);
    border: 1px solid var(--line);
    border-radius: 22px;
    box-shadow: 0 18px 45px rgba(54, 60, 48, 0.08);
  }

  .eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
    color: var(--muted);
    font-size: 0.84rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .eyebrow::before {
    content: "";
    width: 10px;
    height: 10px;
    border-radius: 999px;
    background: var(--accent);
    box-shadow: 0 0 0 6px var(--accent-soft);
  }

  .empty,
  .error {
    padding: 14px;
    border-radius: 16px;
    border: 1px dashed var(--line);
    background: rgba(255, 255, 255, 0.4);
    color: var(--muted);
  }

  .error {
    color: var(--danger);
    border-color: rgba(138, 59, 47, 0.2);
    background: rgba(138, 59, 47, 0.06);
  }
`;
