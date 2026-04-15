import { fetchIssue } from "./linear-api";

/**
 * Register the `{{renderer :linear, TEAM-NNN}}` macro handler.
 *
 * Usage in Logseq blocks:
 *   {{renderer :linear, AI-690}}
 *
 * This renders an inline badge showing the issue identifier, title,
 * and a colored status dot.
 */
export function registerAutoLink(): void {
  logseq.App.onMacroRendererSlotted(async ({ slot, payload }) => {
    const [type, identifier] = payload.arguments;
    if (type !== ":linear" || !identifier) return;

    const id = identifier.trim().toUpperCase();
    if (!/^[A-Z]{1,5}-\d+$/.test(id)) return;

    logseq.provideUI({
      key: `linear-${id}-${slot}`,
      slot,
      template: `<span style="opacity:0.5;font-size:0.9em;">Loading ${id}...</span>`,
      reset: true,
    });

    try {
      const issue = await fetchIssue(id);
      const safeColor = sanitizeColor(issue.state.color);

      logseq.provideUI({
        key: `linear-${id}-${slot}`,
        slot,
        template: `
          <a href="${escapeHtml(issue.url)}" target="_blank"
             style="
               display:inline-flex;
               align-items:center;
               gap:4px;
               padding:1px 6px;
               border-radius:4px;
               background:#f0f0f0;
               color:#333;
               text-decoration:none;
               font-size:0.9em;
               border:1px solid #ddd;
             ">
            <span style="
              display:inline-block;
              width:8px;height:8px;
              border-radius:50%;
              background:${safeColor};
              margin-right:4px;
              vertical-align:middle;
            "></span>
            <strong>${escapeHtml(issue.identifier)}</strong>
            <span style="opacity:0.7;">${escapeHtml(issue.title)}</span>
          </a>
        `,
        reset: true,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logseq.provideUI({
        key: `linear-${id}-${slot}`,
        slot,
        template: `<span style="color:red;font-size:0.9em;">${escapeHtml(id)}: ${escapeHtml(msg)}</span>`,
        reset: true,
      });
    }
  });

  logseq.Editor.registerSlashCommand("linear-link", async () => {
    try {
      const block = await logseq.Editor.getCurrentBlock();
      if (!block) return;

      const match = block.content.match(/\b([A-Z]{1,5}-\d+)\b/);
      if (!match) {
        logseq.UI.showMsg(
          "No issue ID found in current block (expected TEAM-123 pattern)",
          "warning",
        );
        return;
      }

      const identifier = match[1];
      const newContent = block.content.replace(
        identifier,
        `{{renderer :linear, ${identifier}}}`,
      );
      await logseq.Editor.updateBlock(block.uuid, newContent);
      logseq.UI.showMsg(`Wrapped ${identifier} in Linear renderer`, "success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logseq.UI.showMsg(`Error: ${msg}`, "error");
    }
  });
}

/** Escape HTML special characters to prevent injection. */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Validate a CSS color value to prevent injection. */
function sanitizeColor(color: string): string {
  return /^#[0-9a-fA-F]{3,8}$/.test(color) ? color : "#888";
}
