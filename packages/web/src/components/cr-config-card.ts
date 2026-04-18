import { LitElement, html } from "lit";

export class CrConfigCard extends LitElement {
  static properties = { label: {}, value: {}, note: {} };
  override createRenderRoot() { return this; }
  declare label: string;
  declare value: string;
  declare note: string;
  constructor() { super(); this.label = ""; this.value = ""; this.note = ""; }

  render() {
    return html`
      <div class="rounded-lg border border-border bg-card p-4 flex flex-col gap-2 shadow-sm">
        <span class="text-[0.7rem] font-semibold tracking-widest uppercase text-muted-foreground">${this.label}</span>
        <div class="text-sm font-semibold text-foreground break-words">${this.value || "Not configured"}</div>
        ${this.note ? html`<div class="text-xs text-muted-foreground leading-relaxed">${this.note}</div>` : ""}
      </div>
    `;
  }
}
customElements.define("cr-config-card", CrConfigCard);
