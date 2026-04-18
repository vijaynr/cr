import { html, type TemplateResult } from "lit";
import { ChevronDown } from "lucide";
import "./cr-icon.js";

type CollapsibleCardArgs = {
  summary: TemplateResult;
  body: TemplateResult;
  open?: boolean;
  rootClass?: string;
  cardClass?: string;
  summaryClass?: string;
  bodyClass?: string;
};

function joinClasses(...values: Array<string | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function renderCollapsibleCard(args: CollapsibleCardArgs) {
  return html`
    <details
      class=${joinClasses(
        "rounded-lg border border-border bg-card overflow-hidden",
        args.rootClass,
        args.cardClass,
      )}
      ?open=${args.open ?? true}
    >
      <summary
        class=${joinClasses(
          "list-none cursor-pointer px-4 py-3 hover:bg-muted/50 transition-colors [&::-webkit-details-marker]:hidden",
          args.summaryClass,
        )}
      >
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0 flex-1">${args.summary}</div>
          <span class="shrink-0 text-muted-foreground transition-transform duration-200 [[open]>&]:rotate-180">
            <cr-icon .icon=${ChevronDown} .size=${16}></cr-icon>
          </span>
        </div>
      </summary>
      <div
        class=${joinClasses(
          "px-4 pb-4 pt-0 border-t border-border",
          args.bodyClass,
        )}
      >
        ${args.body}
      </div>
    </details>
  `;
}
