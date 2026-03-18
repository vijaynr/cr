import { LitElement, css, html } from "lit";
import type { IconNode } from "lucide";
import { dashboardThemeStyles } from "../styles.js";
import "./cr-icon.js";

type StatTone = "default" | "accent" | "success";

export class CrStatCard extends LitElement {
  static properties = {
    eyebrow: {},
    value: {},
    note: {},
    tone: {},
    icon: { attribute: false },
  };

  static styles = [
    dashboardThemeStyles,
    css`
      :host {
        display: block;
      }

      .card {
        display: grid;
        gap: 12px;
        min-height: 100%;
        padding: 18px;
        border-radius: var(--radius-md);
        border-left: 3px solid transparent;
      }

      .card[data-tone="accent"] {
        border-left-color: var(--accent);
      }

      .card[data-tone="success"] {
        border-left-color: var(--success);
      }

      strong {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        font-size: clamp(1.8rem, 3vw, 2.6rem);
        font-weight: 700;
        line-height: 1;
        letter-spacing: -0.04em;
      }

      p {
        margin: 0;
      }
    `,
  ];

  declare eyebrow: string;
  declare value: string;
  declare note: string;
  declare tone: StatTone;
  declare icon: IconNode | null;

  constructor() {
    super();
    this.eyebrow = "";
    this.value = "";
    this.note = "";
    this.tone = "default";
    this.icon = null;
  }

  render() {
    return html`
      <section class="card panel" data-tone=${this.tone}>
        <span class="eyebrow">${this.eyebrow}</span>
        <strong>
          ${this.icon ? html`<cr-icon .icon=${this.icon} .size=${18}></cr-icon>` : ""}
          ${this.value}
        </strong>
        <p class="muted">${this.note}</p>
      </section>
    `;
  }
}

customElements.define("cr-stat-card", CrStatCard);
