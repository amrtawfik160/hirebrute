# Job Desk

Local-first job search. The app runs on your machine, stores keys in `data/store.json`, and talks to models through a small Node server so the browser never sees a secret.

It clones the workflow from [MadsLorentzen/ai-job-search](https://github.com/MadsLorentzen/ai-job-search) and adds a UI, provider switching, history, and export.

## What you can do

1. Build a profile from pasted documents, a CV, or an interview.
2. Search public job boards and a built-in demo board.
3. Rank postings against the original five-dimension fit framework, including language and eligibility gates.
4. Evaluate a posting, then draft a CV and cover letter with a reviewer pass and an ATS text check.
5. Track outcomes, prep interviews, follow up, and plan upskilling.
6. Export JSON, CSV, HTML, or a zip. Nothing is uploaded unless you paste it into Gmail or Notion sync yourself.

## Run it

You need Node 22+.

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:4317](http://127.0.0.1:4317). The UI is on 4317. The API is on 4318.

First launch loads a demo profile (Amira Cole) so scrape, rank, and apply work with the mock provider. Replace it from Profile when you are ready.

```bash
npm test
npm run lint
```

## Where data lives

| Path | What |
|------|------|
| `data/store.json` | Profile, jobs, applications, settings, keys |
| `data/applications/` | Drafted CV and cover letter files |
| `data/documents/` | Uploaded source texts |

Git ignores `data/` except `data/.gitkeep`. Do not commit keys.

To wipe state, use Reset in Settings and type `RESET`.

## Providers

Pick one active provider on Settings. Detection runs on the server.

| Provider | How it authenticates |
|----------|----------------------|
| Mock (offline) | Always on. Use this for tests and for a first run. |
| Claude Code CLI | Local `claude` binary. Uses your Claude subscription. No API key stored. |
| Codex CLI | Local `codex` binary. Uses your ChatGPT subscription. |
| Grok CLI | Local `grok` binary if installed. |
| Anthropic API | Key from console.anthropic.com |
| OpenAI API | Key from platform.openai.com |
| xAI API | Key from console.x.ai |
| Gemini API | Key from aistudio.google.com |
| OpenRouter | Key from openrouter.ai |

CLI install checks:

```bash
which claude
which codex
which grok
```

If a binary is missing, Settings shows it as not installed. The mock provider still works.

## Job boards

Built-in boards: Demo, Remotive, Arbeitnow, Remote OK, The Muse, freehire.me. Turn them off on Portals. Add an RSS or JSON endpoint if you have a public search URL.

This app does not scrape LinkedIn. LinkedIn's terms disallow that. Paste a posting or use a public API instead.

## Original workflow map

| Original command | Job Desk page |
|------------------|---------------|
| `/setup` | Profile |
| `/scrape` | Jobs |
| `/rank` | Rank |
| `/apply` | Apply |
| `/interview` | Interview |
| `/outcome` | Applications |
| `/upskill` | Upskill |
| `/expand` | Expand |
| `/html-report` | Dashboard |
| `/add-template` | Templates |
| `/add-portal` | Portals |
| `/gmail-sync` | Sync (paste emails, approve a batch) |
| `/notion-sync` | Sync (export a snapshot, optional token) |
| `/reset` | Settings |

LaTeX is optional. Job Desk writes markdown and an ATS-readable PDF so you can run without TeX.

## Screenshots

See `docs/screenshots/` after a local run. Main screens: Dashboard, Profile, Jobs, Apply, Settings.

## License

MIT. The original framework is also MIT.
