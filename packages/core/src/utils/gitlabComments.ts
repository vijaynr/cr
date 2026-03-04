import type {
  GitLabDiscussion,
  GitLabInlineComment,
} from "../types/gitlab.js";
import { gitlabRequest, getMergeRequest } from "./gitlab.js";

export async function addMergeRequestComment(
  baseUrl: string,
  token: string,
  projectPath: string,
  mrIid: number,
  body: string
): Promise<string> {
  const encodedProject = encodeURIComponent(projectPath);
  const endpoint = `/api/v4/projects/${encodedProject}/merge_requests/${mrIid}/notes`;
  const response = await gitlabRequest<{ id: number; body: string }>(baseUrl, token, endpoint, {
    method: "POST",
    body: JSON.stringify({ body }),
  });
  return `note_${response.id}`;
}

export async function getMergeRequestInlineComments(
  baseUrl: string,
  token: string,
  projectPath: string,
  mrIid: number
): Promise<GitLabInlineComment[]> {
  const encodedProject = encodeURIComponent(projectPath);
  const endpoint = `/api/v4/projects/${encodedProject}/merge_requests/${mrIid}/discussions?per_page=100`;
  const discussions = await gitlabRequest<GitLabDiscussion[]>(baseUrl, token, endpoint);
  const mr = await getMergeRequest(baseUrl, token, projectPath, mrIid);
  const currentBase = mr.diff_refs?.base_sha;
  const currentStart = mr.diff_refs?.start_sha;
  const currentHead = mr.diff_refs?.head_sha;

  const inlineComments: GitLabInlineComment[] = [];

  for (const discussion of discussions) {
    if (discussion.resolved === true) {
      continue;
    }
    const notes = discussion.notes ?? [];
    for (const note of notes) {
      if (note.system === true || note.resolved === true) {
        continue;
      }

      const position = note.position;
      if (!position || position.position_type !== "text") {
        continue;
      }

      if (currentHead && position.head_sha && position.head_sha !== currentHead) {
        continue;
      }
      if (currentStart && position.start_sha && position.start_sha !== currentStart) {
        continue;
      }
      if (currentBase && position.base_sha && position.base_sha !== currentBase) {
        continue;
      }

      const filePath = position.new_path ?? position.old_path;
      const line = position.new_line ?? position.old_line;
      if (!filePath || !line) {
        continue;
      }

      inlineComments.push({
        filePath,
        line,
        positionType: position.new_line ? "new" : "old",
        body: (note.body ?? "").trim(),
      });
    }
  }

  return inlineComments;
}

export async function addInlineMergeRequestComment(
  baseUrl: string,
  token: string,
  projectPath: string,
  mrIid: number,
  body: string,
  filePath: string,
  line: number,
  positionType: "new" | "old" = "new"
): Promise<string> {
  const encodedProject = encodeURIComponent(projectPath);
  const mr = await getMergeRequest(baseUrl, token, projectPath, mrIid);
  const diffRefs = mr.diff_refs;

  if (!diffRefs?.base_sha || !diffRefs.start_sha || !diffRefs.head_sha) {
    throw new Error("Merge request diff refs are missing; cannot create inline comment.");
  }

  const position: Record<string, string | number> = {
    position_type: "text",
    base_sha: diffRefs.base_sha,
    start_sha: diffRefs.start_sha,
    head_sha: diffRefs.head_sha,
  };

  if (positionType === "old") {
    position.old_path = filePath;
    position.old_line = line;
  } else {
    position.new_path = filePath;
    position.new_line = line;
  }

  try {
    const discussionEndpoint = `/api/v4/projects/${encodedProject}/merge_requests/${mrIid}/discussions`;
    const discussion = await gitlabRequest<GitLabDiscussion>(baseUrl, token, discussionEndpoint, {
      method: "POST",
      body: JSON.stringify({ body, position }),
    });

    const noteId = discussion.notes?.[0]?.id;
    return noteId ? `note_${noteId}` : "discussion_created";
  } catch {
    const noteEndpoint = `/api/v4/projects/${encodedProject}/merge_requests/${mrIid}/notes`;
    const note = await gitlabRequest<{ id: number }>(baseUrl, token, noteEndpoint, {
      method: "POST",
      body: JSON.stringify({ body, position }),
    });
    return `note_${note.id}`;
  }
}
