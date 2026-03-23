import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { Github, Gitlab } from "lucide";
import type { ProviderId } from "../types.js";
import "./cr-icon.js";

@customElement("cr-provider-icon")
export class CrProviderIcon extends LitElement {
  @property() provider: ProviderId = "gitlab";
  @property({ type: Number }) size = 16;

  override createRenderRoot() {
    return this;
  }

  private renderReviewBoardIcon() {
    const size = this.size;
    const fontSize = Math.max(Math.round(size * 0.44), 7);

    return html`
      <svg
        width=${size}
        height=${size}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <rect
          x="2.5"
          y="2.5"
          width="19"
          height="19"
          rx="6"
          fill="currentColor"
          fill-opacity="0.12"
          stroke="currentColor"
          stroke-opacity="0.4"
        />
        <path
          d="M8 16.2V7.8h4.15c2.16 0 3.35 1.09 3.35 2.77 0 1.14-.62 1.92-1.61 2.33l2.18 3.3h-2.18l-1.84-2.9H9.96v2.9H8Zm1.96-4.54h1.95c1.02 0 1.57-.41 1.57-1.17 0-.77-.55-1.17-1.57-1.17H9.96v2.34Z"
          fill="currentColor"
        />
        <text
          x="15.7"
          y="16.1"
          fill="currentColor"
          font-size=${fontSize}
          font-weight="700"
          letter-spacing="-0.03em"
          text-anchor="middle"
        >
          B
        </text>
      </svg>
    `;
  }

  render() {
    if (this.provider === "gitlab") {
      return html`<cr-icon .icon=${Gitlab} .size=${this.size}></cr-icon>`;
    }

    if (this.provider === "github") {
      return html`<cr-icon .icon=${Github} .size=${this.size}></cr-icon>`;
    }

    return this.renderReviewBoardIcon();
  }
}
