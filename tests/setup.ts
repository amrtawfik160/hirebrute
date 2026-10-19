import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { beforeEach } from "vitest"
import { clearStoreCache } from "../server/store.ts"

process.env.JOBDESK_DATA = path.join(os.tmpdir(), `jobdesk-vitest-${process.pid}`)

beforeEach(() => {
  clearStoreCache()
  fs.rmSync(process.env.JOBDESK_DATA!, { recursive: true, force: true })
})
