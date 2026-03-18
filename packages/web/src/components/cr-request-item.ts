import { LitElement, css, html } from "lit";
import { dashboardThemeStyles } from "../styles.js";
import type { DashboardRequest, ProviderId } from "../types.js";

function getRequestPrefix(provider: ProviderId, id: DashboardRequest["id"]): string {
  return provider === "gitlab" ? `!${id}` : `#${id}`;
}

export class CrRequestItem extends LitElement {
  static properties = {
    provider: {},
    item: { attribute: false },
  };

  static styles = [
    dashboardThemeStyles,
    css`
      :host {
        display: block;
      }

      .request {
        display: grid;
        gap: 10px;
        padding: 16px;
        border-radius: 10px;
        border: 1px solid var(--line);
        background: var(--surface);
      }

      a {
        color: inherit;
        text-decoration: none;
      }

      a:hover {
        text-decoration: underline;
      }

      .request-title {
        font-size: 1.02rem;
        font-weight: 600;
        line-height: 1.3;
      }

      .request-meta {
        display: grid;
        gap: 4px;
        font-size: 0.92rem;
      }
    `,
  ];

  declare provider: ProviderId;
  declare item: DashboardRequest;

  constructor() {
    super();
    this.provider = "gitlab";
    this.item = {
      id: "",
      title: "",
      url: "#",
    };
  }

  render() {
    return html`
      <article class="request">
        <a href=${this.item.url} target="_blank" rel="noreferrer">
          <div class="request-title">${getRequestPrefix(this.provider, this.item.id)} ${this.item.title}</div>
        </a>
        <div class="request-meta">
          ${
            this.item.state
              ? html`<div>State: ${this.item.state}${this.item.draft ? " • draft" : ""}</div>`
              : ""
          }
          ${this.item.author ? html`<div>Author: ${this.item.author}</div>` : ""}
          ${
            this.item.sourceBranch || this.item.targetBranch
              ? html`<div>
                Branches:
                ${this.item.sourceBranch || "?"}
                ${this.item.targetBranch ? html` → ${this.item.targetBranch}` : ""}
              </div>`
              : ""
          }
          ${this.item.repository ? html`<div>Repository: ${this.item.repository}</div>` : ""}
          ${this.item.updatedAt ? html`<div>Updated: ${this.item.updatedAt}</div>` : ""}
        </div>
      </article>
    `;
  }
}

customElements.define("cr-request-item", CrRequestItem);
