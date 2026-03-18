import { LitElement, html } from "lit";
import type { IconNode } from "lucide";
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

  override createRenderRoot() { return this; }

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

  private get toneClass() {
    if (this.tone === "accent") return "border-l-4 border-primary";
    if (this.tone === "success") return "border-l-4 border-success";
    return "border-l-4 border-transparent";
  }

  render() {
    return html`
      <div class="stat bg-base-200 rounded-xl ${this.toneClass}">
        <div class="stat-title text-base-content/60">${this.eyebrow}</div>
        <div class="stat-value text-3xl font-bold tracking-tight flex items-center gap-2">
          ${this.icon ? html`<cr-icon .icon=${this.icon} .size=${22}></cr-icon>` : ""}
          ${this.value}
        </div>
        <div class="stat-desc text-base-content/50">${this.note}</div>
      </div>
    `;
  }
}

customElements.define("cr-stat-card", CrStatCard);
