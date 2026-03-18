import { LitElement, css, html } from "lit";
import { dashboardThemeStyles } from "../styles.js";

export class CrConfigCard extends LitElement {
  static properties = {
    label: {},
    value: {},
    note: {},
  };

  static styles = [
    dashboardThemeStyles,
    css`
      :host {
        display: block;
      }

      .panel {
        display: grid;
        gap: 12px;
        min-height: 100%;
        padding: 18px;
        border-radius: var(--radius-md);
      }

      h3 {
        font-size: 1.4rem;
      }

      p {
        margin: 0;
      }
    `,
  ];

  declare label: string;
  declare value: string;
  declare note: string;

  constructor() {
    super();
    this.label = "";
    this.value = "";
    this.note = "";
  }

  render() {
    return html`
      <section class="panel">
        <div class="eyebrow">${this.label}</div>
        <h3>${this.value || "Not configured"}</h3>
        ${this.note ? html`<p class="muted">${this.note}</p>` : ""}
      </section>
    `;
  }
}

customElements.define("cr-config-card", CrConfigCard);
