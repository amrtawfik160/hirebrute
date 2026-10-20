import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { defineConfig } from "@playwright/test"

const data = fs.mkdtempSync(path.join(os.tmpdir(), "jobdesk-e2e-"))
const bins = path.join(data, "bins")
fs.mkdirSync(bins, { recursive: true })
for (const name of ["claude", "codex", "grok"]) {
  const file = path.join(bins, name)
  fs.writeFileSync(file, `#!/bin/sh\nprintf '%s\\n' "ok-${name}"\n`)
  fs.chmodSync(file, 0o755)
}

const apiPort = 4393
const webPort = 4392

export default defineConfig({
  testDir: "e2e",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  use: {
    baseURL: `http://127.0.0.1:${webPort}`,
    viewport: { width: 1280, height: 800 },
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: `JOBDESK_DATA="${data}" JOBDESK_API_PORT=${apiPort} PATH="${bins}:$PATH" npx tsx server/index.ts`,
      url: `http://127.0.0.1:${apiPort}/api/health`,
      reuseExistingServer: false,
      timeout: 30_000,
    },
    {
      command: `JOBDESK_API_PORT=${apiPort} PORT=${webPort} npx vite --host 127.0.0.1 --port ${webPort} --strictPort`,
      url: `http://127.0.0.1:${webPort}`,
      reuseExistingServer: false,
      timeout: 30_000,
    },
  ],
})
