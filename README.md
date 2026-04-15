<p align="center">
  <img src="logo.png" width="80" height="80" alt="Logseq Linear logo" />
</p>

<h1 align="center">LinSeq</h1>

<p align="center">Link issues, post comments, and track sprints — directly from your Logseq journal.</p>

---

## Install

1. Search **"LinSeq"** in the Logseq plugin marketplace (**Plugins > Marketplace**) and click Install.
2. Go to **Plugins > Linear > Settings** and paste your [Linear API key](https://linear.app/settings/api).
3. Set your **Default Team** (e.g. `AI`, `EDA`, `SW`).

<details>
<summary>Manual install (from source)</summary>

```bash
git clone https://github.com/pihalf/linseq.git
cd logseq-plugin-linear
npm install && npx vite build
```

In Logseq: **Settings > Advanced > Developer mode** (on) → **Plugins > Load unpacked** → select the `dist/` folder.

</details>

## Commands

### Slash commands

Type `/` in any block:

| Command | What it does |
|---------|-------------|
| `/linear` | Insert an issue by ID (e.g. `AI-690`) with status, priority, cycle, due date, and PR link |
| `/linear-my-issues` | List all your assigned non-completed issues as TODO blocks |
| `/linear-search` | Search issues by text |
| `/linear-create` | Create a new issue in your default team |
| `/linear-done` | Mark the issue in the current block as Done in Linear |
| `/linear-comment` | Post a comment on the issue in the current block |
| `/linear-link` | Wrap an issue ID with the inline renderer macro |

### Keyboard shortcut

**Cmd+Shift+L** — insert an issue link (same as `/linear`).

### Toolbar

The Linear icon shows a badge with your active issue count.

### Inline renderer

Type `{{renderer :linear, AI-690}}` in any block for an inline badge with the issue title and a colored status dot.

## Example workflow

**Morning standup:**

1. Type `/linear-my-issues` to pull in your assigned tickets:
   ```
   - TODO [[AI-690]] - Investigation; Stimulus Direct to SV vs CocoTB?
     linear-status:: In Progress
     linear-priority:: No priority
     linear-project:: Nectar and Normal CLI
     linear-cycle:: Sprint 37 (ends 2026-04-11)
     linear-pr:: [AI-690: SV vs CocoTB comparison](https://github.com/...)
   ```
2. Post an update: cursor on the issue → `/linear-comment` → type your message
3. Close it out: `/linear-done` → flips TODO to DONE in Logseq and marks Done in Linear

**Quick issue creation:**

1. While writing, realize something needs tracking
2. `/linear-create` → "Fix flaky timeout in stimulus runner"
3. Issue is created in Linear and linked in your journal

## Block properties

Inserted issues include these queryable properties:

| Property | Example |
|----------|---------|
| `linear-status` | In Progress |
| `linear-priority` | Medium |
| `linear-due` | 2026-04-15 |
| `linear-cycle` | Sprint 37 (ends 2026-04-11) |
| `linear-project` | Conductor |
| `linear-pr` | [PR title](https://github.com/...) |

Query them with Logseq's built-in system:

```
{{query (property linear-status "In Progress")}}
```

## Settings

| Setting | Description |
|---------|-------------|
| **Linear API Key** | Your personal API key ([get one here](https://linear.app/settings/api)) |
| **Default Team** | Team key for new issues (e.g. `AI`, `EDA`, `SW`) |
| **Show Status in Blocks** | Add status/priority/cycle/PR properties to inserted blocks |

## Requirements

- Logseq desktop app
- Linear account with API key

## License

MIT
