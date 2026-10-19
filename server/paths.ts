import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"

const here = path.dirname(fileURLToPath(import.meta.url))
export const REPO_ROOT = path.resolve(here, "..")

export function dataDir(): string {
  if (process.env.JOBDESK_DATA) return path.resolve(process.env.JOBDESK_DATA)
  return path.join(REPO_ROOT, "data")
}

export function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true })
}

export function atomicWrite(file: string, contents: string): void {
  ensureDir(path.dirname(file))
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`
  fs.writeFileSync(tmp, contents, "utf8")
  fs.renameSync(tmp, file)
}

export function readJson<T>(file: string, fallback: T): T {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")) as T
  } catch {
    return fallback
  }
}

export function tmpFile(prefix: string, ext = ".txt"): string {
  return path.join(os.tmpdir(), `jobdesk-${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}${ext}`)
}
