import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { MoonStar, SunMedium } from "lucide";
import type { UITheme } from "../types.js";
import "./cr-icon.js";

@customElement("cr-theme-toggle")
export class CrThemeToggle extends LitElement {
  @property() theme: UITheme = "dark";

  override createRenderRoot() {
    return this;
  }

  render() {
    const isDark = this.theme === "dark";
    const nextLabel = isDark ? "Switch to light mode" : "Switch to dark mode";

    return html`
      <button
        type="button"
        class="inline-flex items-center justify-center w-8 h-8 rounded-md border border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
        @click=${this.toggle}
        aria-label=${nextLabel}
        title=${nextLabel}
      >
        <cr-icon
          .icon=${isDark ? SunMedium : MoonStar}
          .size=${15}
        ></cr-icon>
      </button>
    `;
  }

  private toggle() {
    this.dispatchEvent(
      new CustomEvent("theme-toggle", { bubbles: true, composed: true })
    );
  }
}
