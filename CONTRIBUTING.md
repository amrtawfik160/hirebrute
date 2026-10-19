# Contributing

Job Desk is a local app. Changes should keep keys and profile text out of git.

## Setup

Install Node 22 or newer, then:

```bash
npm install
npm run dev
```

The UI is http://127.0.0.1:4317. The API is http://127.0.0.1:4318.

Use the mock provider unless you are testing a live model. Put any key in Settings. Do not commit `data/store.json`, `.env`, or a screenshot that shows a key.

## Checks

```bash
npm test
npm run lint
npm run check:secrets
```

`npm test` covers fit gates, ranking, drafts, dashboard math, and the mock provider. Run the app and click through a change that touches the UI.

## What to change

- Domain rules belong in `shared/` when both the server and the tests need them.
- HTTP handlers belong in `server/app.ts`. Workflow code belongs in `server/workflows/`.
- Provider calls go through `generate()` in `server/providers/registry.ts`. Do not call a vendor SDK from a React component.
- A new job board needs a public API or a public feed. Do not add a scraper for a site whose terms forbid it.

## Pull requests

Open an issue first for a large change. A pull request should say what you ran. Include a screenshot when the change is visible.

Do not add generated files under `data/`, and do not add `node_modules/`.
