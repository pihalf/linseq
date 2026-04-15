import "@logseq/libs";
import { settingsSchema } from "./settings";
import { registerCommands } from "./commands";
import { registerAutoLink } from "./auto-link";
import { fetchViewer, fetchMyIssues } from "./linear-api";

function registerToolbar(issueCount?: number): void {
  const badge = issueCount !== undefined && issueCount > 0
    ? `<span style="position:absolute;top:0;right:-2px;min-width:14px;height:14px;
        border-radius:7px;background:#5e6ad2;color:#fff;font-size:9px;font-weight:700;
        display:flex;align-items:center;justify-content:center;padding:0 3px;
        border:1.5px solid var(--ls-primary-background-color,#1e1e2e);">${issueCount}</span>`
    : "";

  logseq.App.registerUIItem("toolbar", {
    key: "linear-toolbar",
    template: `
      <a class="button" title="Linear: ${issueCount ?? "?"} active issues"
         style="position:relative;display:flex;align-items:center;">
        <svg width="18" height="18" viewBox="0 0 100 100" fill="currentColor">
          <path d="M2.8 68.1c-.2-.6-.4-1.2-.5-1.8L22 86.3c-.6-.2-1.2-.3-1.8-.5L2.8 68.1zM0 55.5l30.7 30.7c-.4-.5-.8-1-1.2-1.5L1.5 56.7c-.5-.4-1-0.8-1.5-1.2zM3.8 77l19.7 19.7c-1-.5-2-.9-3-1.5L5.3 80c-.5-1-1-2-1.5-3zM8.2 84.3l8.3 8.3c-1.3-.9-2.6-1.9-3.8-3-1.1-1.2-2.1-2.5-3-3.8l-1.5-1.5zM35.5 100c-1.8-.2-3.6-.5-5.3-.9l-29-29c-.4-1.7-.7-3.5-.9-5.3L35.5 100zM50 98.5L1.5 50c-.1.9-.2 1.8-.2 2.7L47.3 98.7c.9 0 1.8-.1 2.7-.2zM1.5 43.6L56.4 98.5c1.7-.2 3.4-.5 5-1L2.5 38.6c-.5 1.6-.8 3.3-1 5zM4.5 32.4l63.1 63.1c1.5-.5 3-1.1 4.5-1.8L6.3 27.9c-.7 1.5-1.3 3-1.8 4.5zM9.4 23.5l67.1 67.1c1.3-.7 2.6-1.4 3.8-2.2L11.6 19.7c-.8 1.2-1.5 2.5-2.2 3.8zM16.3 16.3c-.8.8-1.5 1.7-2.2 2.5L85.8 90.5c.9-.7 1.7-1.4 2.5-2.2L16.3 16.3zM90.5 85.8L14.2 9.5c-1.3.7-2.6 1.5-3.8 2.3L90.5 85.8zM95.5 77.6L22.4 4.5c-1.5.5-3 1.1-4.5 1.8l75.8 75.8c.7-1.5 1.3-3 1.8-4.5zM97.5 66.4L33.6 2.5c-1.7.3-3.4.6-5 1l67.9 67.9c.4-1.6.7-3.3 1-5zM98.5 53.6L46.4 1.5c-.9-.1-1.8-.1-2.7-.2L98.7 52.3c0-.9-.1-1.8-.2-2.7z"/>
        </svg>
        ${badge}
      </a>
    `,
  });
}

async function refreshToolbar(): Promise<void> {
  try {
    const issues = await fetchMyIssues(50);
    registerToolbar(issues.length);
  } catch {
    registerToolbar(undefined);
  }
}

async function main(): Promise<void> {
  logseq.useSettingsSchema(settingsSchema);
  registerToolbar();
  console.log("[linear] Plugin loaded.");

  setTimeout(() => {
    try {
      registerCommands();
      registerAutoLink();
    } catch (err) {
      console.error("[linear] Registration failed:", err);
    }

    const apiKey = logseq.settings?.linearApiKey as string | undefined;
    if (!apiKey) {
      console.log("[linear] No API key configured.");
      return;
    }

    fetchViewer()
      .then((viewer) => {
        console.log(`[linear] Authenticated as ${viewer.name}`);
        return refreshToolbar();
      })
      .catch((err) => {
        console.error("[linear] Auth check failed:", err);
      });
  }, 500);
}

logseq.ready(main).catch(console.error);
