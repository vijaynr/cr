import { LitElement, html } from "lit";

export class CrConfigCard extends LitElement {
  static properties = {
    label: {},
    value: {},
    note: {},
  };

  override createRenderRoot() { return this; }

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
      <div class="card bg-base-200 border border-base-300">
        <div class="card-body gap-2">
          <div class="text-xs font-bold uppercase tracking-widest text-base-content/40">${this.label}</div>
          <h3 class="text-lg font-bold">${this.value || "Not configured"}</h3>
          ${this.note ? html`<p class="text-sm text-base-content/50">${this.note}</p>` : ""}
        </div>
      </div>
    `;
  }
}

customElements.define("cr-config-card", CrConfigCard);
