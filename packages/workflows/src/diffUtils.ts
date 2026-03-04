export type DiffHunkRow =
  | { kind: "new"; line: number; content: string }
  | { kind: "old"; line: number; content: string }
  | { kind: "context"; oldLine: number; newLine: number; content: string };

export type DiffHunk = {
  header: string;
  oldStart: number;
  newStart: number;
  lines: DiffHunkRow[];
  newChangedLines: number[];
  oldChangedLines: number[];
};

export function parseDiffHunks(diffText: string): DiffHunk[] {
  const hunks: DiffHunk[] = [];
  let currentHunk: DiffHunk | null = null;
  let oldLine = 0;
  let newLine = 0;

  for (const line of diffText.split(/\r?\n/)) {
    if (line.startsWith("@@")) {
      const match = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(line);
      if (!match) {
        continue;
      }
      oldLine = Number.parseInt(match[1], 10);
      newLine = Number.parseInt(match[2], 10);
      currentHunk = {
        header: line,
        oldStart: oldLine,
        newStart: newLine,
        lines: [],
        newChangedLines: [],
        oldChangedLines: [],
      };
      hunks.push(currentHunk);
      continue;
    }

    if (line.startsWith("+++") || line.startsWith("---")) {
      continue;
    }

    if (line.startsWith("+")) {
      currentHunk?.newChangedLines.push(newLine);
      currentHunk?.lines.push({ kind: "new", line: newLine, content: line.slice(1) });
      newLine += 1;
      continue;
    }

    if (line.startsWith("-")) {
      currentHunk?.oldChangedLines.push(oldLine);
      currentHunk?.lines.push({ kind: "old", line: oldLine, content: line.slice(1) });
      oldLine += 1;
      continue;
    }

    const content = line.startsWith(" ") ? line.slice(1) : line;
    currentHunk?.lines.push({ kind: "context", oldLine, newLine, content });
    oldLine += 1;
    newLine += 1;
  }

  return hunks;
}
