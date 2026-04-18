import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { Input } from "@mariozechner/mini-lit/dist/Input.js";
import type { InputType } from "@mariozechner/mini-lit/dist/Input.js";

@customElement("cr-config-input")
export class CrConfigInput extends LitElement {
  @property() label = "";
  @property() note = "";
  @property() value = "";
  @property() type = "text";
  @property({ attribute: "input-mode" }) inputMode: string = "text";

  override createRenderRoot() {
    return this;
  }

  render() {
    return html`
      <div class="flex flex-col gap-1">
        ${Input({
          size: "sm",
          label: this.label,
          type: this.type as InputType,
          value: this.value,
          className: "font-mono w-full",
          onInput: (e) => this.handleInput(e),
        })}
        ${this.note
          ? html`<div class="text-xs text-muted-foreground">${this.note}</div>`
          : ""}
      </div>
    `;
  }

  private handleInput(e: Event) {
    this.dispatchEvent(
      new CustomEvent("value-change", {
        detail: (e.target as HTMLInputElement).value,
        bubbles: true,
        composed: true,
      })
    );
  }
}
