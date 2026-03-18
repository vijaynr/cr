import { LitElement, css, html, nothing } from "lit";
import { unsafeSVG } from "lit/directives/unsafe-svg.js";
import type { IconNode } from "lucide";

export class CrIcon extends LitElement {
  static properties = {
    icon: { attribute: false },
    label: {},
    size: { type: Number },
    strokeWidth: { type: Number, attribute: "stroke-width" },
  };

  static styles = css`
    :host {
      display: inline-flex;
      inline-size: var(--icon-size, 1.1rem);
      block-size: var(--icon-size, 1.1rem);
      color: currentColor;
      flex: 0 0 auto;
    }

    svg {
      inline-size: 100%;
      block-size: 100%;
      stroke: currentColor;
    }
  `;

  declare icon: IconNode | null;
  declare label: string;
  declare size: number;
  declare strokeWidth: number;

  constructor() {
    super();
    this.icon = null;
    this.label = "";
    this.size = 18;
    this.strokeWidth = 2;
  }

  render() {
    const markup = this.iconMarkup;
    if (!markup) {
      return nothing;
    }

    this.style.setProperty("--icon-size", `${this.size}px`);

    return html`${unsafeSVG(markup)}`;
  }

  private get iconMarkup() {
    if (!this.icon) {
      return "";
    }

    const children = this.icon
      .map(
        ([tag, attrs]) =>
          `<${tag} ${Object.entries(attrs)
            .map(([key, value]) => `${key}="${String(value)}"`)
            .join(" ")}></${tag}>`
      )
      .join("");

    const ariaHidden = this.label ? "false" : "true";
    const ariaLabel = this.label ? ` aria-label="${this.label}" role="img"` : "";

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${this.size}" height="${this.size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${this.strokeWidth}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="${ariaHidden}"${ariaLabel}>${children}</svg>`;
  }
}

customElements.define("cr-icon", CrIcon);
