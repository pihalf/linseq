import type { LinearIssue } from "./types";
import {
  fetchIssue,
  fetchMyIssues,
  fetchTeams,
  searchIssues,
  createIssue,
  createComment,
  fetchWorkflowStates,
  updateIssueState,
} from "./linear-api";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format an issue as a block string with an optional link arrow. */
function formatIssueBlock(issue: LinearIssue): string {
  return `[[${issue.identifier}]] - ${issue.title} [->](${issue.url})`;
}

/** Build block properties for an issue (status, priority, deadline, cycle). */
function issueProperties(issue: LinearIssue): Record<string, string> {
  const props: Record<string, string> = {};
  if (logseq.settings?.showStatusInBlocks !== false) {
    props["linear-status"] = issue.state.name;
    props["linear-priority"] = issue.priorityLabel;
    if (issue.dueDate) {
      props["linear-due"] = issue.dueDate;
    }
    if (issue.cycle) {
      const cycleEnd = issue.cycle.endsAt?.split("T")[0] ?? "";
      props["linear-cycle"] = `Sprint ${issue.cycle.number}${cycleEnd ? ` (ends ${cycleEnd})` : ""}`;
    }
    if (issue.project) {
      props["linear-project"] = issue.project.name;
    }
    const prs = issue.attachments?.filter((a) => a.sourceType === "github") ?? [];
    if (prs.length > 0) {
      props["linear-pr"] = prs.map((pr) => `[${pr.title}](${pr.url})`).join(", ");
    }
  }
  return props;
}

/** Extract the first TEAM-NNN identifier from text. */
function extractIssueId(text: string): string | null {
  const match = text.match(/\b([A-Z]{1,5}-\d+)\b/);
  return match ? match[1] : null;
}

// ---------------------------------------------------------------------------
// Slash commands
// ---------------------------------------------------------------------------

async function linearInsert(): Promise<void> {
  // Logseq plugin SDK has no native input prompt; use Electron's prompt()
  const identifier = prompt("Enter Linear issue ID (e.g. AI-690):");
  if (!identifier) return;

  try {
    const issue = await fetchIssue(identifier.trim().toUpperCase());
    const block = await logseq.Editor.getCurrentBlock();
    if (!block) return;

    await logseq.Editor.updateBlock(block.uuid, formatIssueBlock(issue), {
      properties: issueProperties(issue),
    });

    logseq.UI.showMsg(`Linked ${issue.identifier}`, "success");
  } catch (err) {
    console.error("[linear]", err);
    logseq.UI.showMsg(`Error: ${err instanceof Error ? err.message : String(err)}`, "error");
  }
}

async function linearMyIssues(): Promise<void> {
  try {
    const issues = await fetchMyIssues();
    const block = await logseq.Editor.getCurrentBlock();
    if (!block) return;

    await logseq.Editor.updateBlock(block.uuid, "My Linear Issues");

    // Collect all blocks first, then insert in one batch to avoid duplicates
    const children = issues.map((issue) => ({
      content: `TODO [[${issue.identifier}]] - ${issue.title}`,
      properties: issueProperties(issue),
    }));

    await logseq.Editor.insertBatchBlock(block.uuid, children, {
      sibling: false,
    });

    logseq.UI.showMsg(`Inserted ${issues.length} issues`, "success");
  } catch (err) {
    console.error("[linear]", err);
    logseq.UI.showMsg(`Error: ${err instanceof Error ? err.message : String(err)}`, "error");
  }
}

async function linearSearch(): Promise<void> {
  const query = prompt("Search Linear issues:");
  if (!query) return;

  try {
    const issues = await searchIssues(query);
    const block = await logseq.Editor.getCurrentBlock();
    if (!block) return;

    await logseq.Editor.updateBlock(
      block.uuid,
      `Linear search: "${query}"`,
    );

    const children = issues.map((issue) => ({
      content: formatIssueBlock(issue),
      properties: issueProperties(issue),
    }));

    await logseq.Editor.insertBatchBlock(block.uuid, children, {
      sibling: false,
    });

    logseq.UI.showMsg(`Found ${issues.length} issues`, "success");
  } catch (err) {
    console.error("[linear]", err);
    logseq.UI.showMsg(`Error: ${err instanceof Error ? err.message : String(err)}`, "error");
  }
}

async function linearCreate(): Promise<void> {
  const title = prompt("New issue title:");
  if (!title) return;

  const teamKey =
    (logseq.settings?.defaultTeam as string | undefined) || "AI";

  try {
    const issue = await createIssue(teamKey, title);
    const block = await logseq.Editor.getCurrentBlock();
    if (!block) return;

    await logseq.Editor.updateBlock(block.uuid, formatIssueBlock(issue), {
      properties: issueProperties(issue),
    });

    logseq.UI.showMsg(
      `Created ${issue.identifier}: ${issue.title}`,
      "success",
    );
  } catch (err) {
    console.error("[linear]", err);
    logseq.UI.showMsg(`Error: ${err instanceof Error ? err.message : String(err)}`, "error");
  }
}

async function linearDone(): Promise<void> {
  try {
    const block = await logseq.Editor.getCurrentBlock();
    if (!block) {
      logseq.UI.showMsg("No active block", "warning");
      return;
    }

    const identifier = extractIssueId(block.content);
    if (!identifier) {
      logseq.UI.showMsg(
        "No Linear issue ID found in this block (expected TEAM-123 pattern)",
        "warning",
      );
      return;
    }

    const issue = await fetchIssue(identifier);

    // Resolve the team from the identifier prefix
    const teamKey = identifier.split("-")[0];
    const allTeams = await fetchTeams();
    const team = allTeams.find(
      (t) => t.key.toLowerCase() === teamKey.toLowerCase(),
    );
    if (!team) {
      logseq.UI.showMsg(`Team "${teamKey}" not found`, "error");
      return;
    }

    const states = await fetchWorkflowStates(team.id);
    const doneState = states.find((s) => s.type === "completed");
    if (!doneState) {
      logseq.UI.showMsg("No 'completed' state found for this team", "error");
      return;
    }

    const success = await updateIssueState(issue.id, doneState.id);
    if (!success) {
      logseq.UI.showMsg("Failed to update issue state", "error");
      return;
    }

    // Update block properties to reflect new status
    await logseq.Editor.upsertBlockProperty(
      block.uuid,
      "linear-status",
      doneState.name,
    );

    // Swap TODO -> DONE in block content if present
    if (block.content.startsWith("TODO ")) {
      await logseq.Editor.updateBlock(
        block.uuid,
        block.content.replace(/^TODO /, "DONE "),
      );
    }

    logseq.UI.showMsg(
      `${identifier} marked as ${doneState.name}`,
      "success",
    );
  } catch (err) {
    console.error("[linear]", err);
    logseq.UI.showMsg(`Error: ${err instanceof Error ? err.message : String(err)}`, "error");
  }
}

async function linearComment(): Promise<void> {
  try {
    const block = await logseq.Editor.getCurrentBlock();
    if (!block) {
      logseq.UI.showMsg("No active block", "warning");
      return;
    }

    const identifier = extractIssueId(block.content);
    if (!identifier) {
      logseq.UI.showMsg(
        "No Linear issue ID found in this block (expected TEAM-123 pattern)",
        "warning",
      );
      return;
    }

    const comment = prompt(`Comment on ${identifier}:`);
    if (!comment) return;

    const issue = await fetchIssue(identifier);
    const success = await createComment(issue.id, comment);

    if (success) {
      logseq.UI.showMsg(`Comment posted on ${identifier}`, "success");
    } else {
      logseq.UI.showMsg("Failed to post comment", "error");
    }
  } catch (err) {
    console.error("[linear]", err);
    logseq.UI.showMsg(`Error: ${err instanceof Error ? err.message : String(err)}`, "error");
  }
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

export function registerCommands(): void {
  // Slash commands
  logseq.Editor.registerSlashCommand("linear", linearInsert);
  logseq.Editor.registerSlashCommand("linear-my-issues", linearMyIssues);
  logseq.Editor.registerSlashCommand("linear-search", linearSearch);
  logseq.Editor.registerSlashCommand("linear-create", linearCreate);
  logseq.Editor.registerSlashCommand("linear-done", linearDone);
  logseq.Editor.registerSlashCommand("linear-comment", linearComment);

  // Command palette
  logseq.App.registerCommandPalette(
    {
      key: "linear-insert",
      label: "Linear: Insert issue link",
      keybinding: { binding: "mod+shift+l" },
    },
    linearInsert,
  );

  logseq.App.registerCommandPalette(
    {
      key: "linear-my-issues",
      label: "Linear: List my assigned issues",
    },
    linearMyIssues,
  );

  logseq.App.registerCommandPalette(
    {
      key: "linear-search",
      label: "Linear: Search issues",
    },
    linearSearch,
  );

  logseq.App.registerCommandPalette(
    {
      key: "linear-create",
      label: "Linear: Create new issue",
    },
    linearCreate,
  );

  logseq.App.registerCommandPalette(
    {
      key: "linear-done",
      label: "Linear: Mark issue as Done",
    },
    linearDone,
  );

  logseq.App.registerCommandPalette(
    {
      key: "linear-comment",
      label: "Linear: Post comment on issue",
    },
    linearComment,
  );

  console.log("[linear] Commands registered.");
}
