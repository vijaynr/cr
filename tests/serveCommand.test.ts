import { describe, expect, it, mock } from "bun:test";

const printCommandHelpMock = mock(() => {});
const printErrorMock = mock(() => {});

mock.module("@cr/ui", () => ({
  printCommandHelp: printCommandHelpMock,
  printError: printErrorMock,
}));

mock.module("@cr/webhook", () => ({
  startWebhookServer: async () => ({}),
}));

const { runServeCommand } = await import("../packages/cli/src/commands/serveCommand.js");

describe("serveCommand help", () => {
  it("documents Review Board mode and setup guidance", async () => {
    await runServeCommand(["--help"]);

    expect(printCommandHelpMock).toHaveBeenCalledTimes(1);
    const sections = printCommandHelpMock.mock.calls[0]?.[0] as Array<{ title: string; lines: string[] }>;
    const options = sections.find((section) => section.title === "OPTIONS")?.lines.join("\n") ?? "";
    const examples = sections.find((section) => section.title === "EXAMPLES")?.lines.join("\n") ?? "";

    expect(options).toContain("GitLab or Review Board events");
    expect(options).toContain("gitlab or reviewboard");
    expect(examples).toContain("--mode reviewboard");
    expect(examples).toContain("review_request_published");
    expect(examples).toContain("HMAC secret");
  });
});
