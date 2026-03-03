import chatPrompt from "../../../../resources/prompts/chat.txt" with { type: "text" };
import mrPrompt from "../../../../resources/prompts/mr.txt" with { type: "text" };
import reviewPrompt from "../../../../resources/prompts/review.txt" with { type: "text" };
import summarizePrompt from "../../../../resources/prompts/summarize.txt" with { type: "text" };

export const bundledPrompts = {
  "chat.txt": chatPrompt,
  "mr.txt": mrPrompt,
  "review.txt": reviewPrompt,
  "summarize.txt": summarizePrompt,
} as const;
