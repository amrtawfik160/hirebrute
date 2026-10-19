import { spawn } from "node:child_process"
import fs from "node:fs"
import { tmpFile } from "../paths.ts"

export async function which(bin: string): Promise<string | null> {
  const cmd = process.platform === "win32" ? "where" : "which"
  try {
    const { stdout, code } = await run(cmd, [bin], { timeoutMs: 4000 })
    if (code === 0 && stdout.trim()) return stdout.trim().split("\n")[0]
  } catch {
    /* ignore */
  }
  return null
}

export function run(
  command: string,
  args: string[],
  opts: { timeoutMs?: number; input?: string; cwd?: string; env?: NodeJS.ProcessEnv } = {},
): Promise<{ stdout: string; stderr: string; code: number }> {
  const timeoutMs = opts.timeoutMs ?? 120_000
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: opts.cwd,
      env: { ...process.env, ...opts.env },
      stdio: ["pipe", "pipe", "pipe"],
    })
    let stdout = ""
    let stderr = ""
    const timer = setTimeout(() => {
      child.kill("SIGKILL")
      reject(new Error(`${command} timed out after ${timeoutMs}ms`))
    }, timeoutMs)
    child.stdout.on("data", (d) => {
      stdout += String(d)
    })
    child.stderr.on("data", (d) => {
      stderr += String(d)
    })
    child.on("error", (err) => {
      clearTimeout(timer)
      reject(err)
    })
    child.on("close", (code) => {
      clearTimeout(timer)
      resolve({ stdout, stderr, code: code ?? 1 })
    })
    if (opts.input) child.stdin.write(opts.input)
    child.stdin.end()
  })
}

export async function runPromptCli(opts: {
  bin: string
  args: string[]
  prompt: string
  timeoutMs?: number
}): Promise<string> {
  const file = tmpFile("prompt", ".txt")
  fs.writeFileSync(file, opts.prompt, "utf8")
  try {
    const args = opts.args.map((a) => (a === "$PROMPT_FILE" ? file : a === "$PROMPT" ? opts.prompt : a))
    const { stdout, stderr, code } = await run(opts.bin, args, { timeoutMs: opts.timeoutMs ?? 180_000 })
    if (code !== 0) {
      throw new Error(`${opts.bin} exited ${code}: ${stderr || stdout}`.slice(0, 2000))
    }
    return (stdout || stderr).trim()
  } finally {
    fs.rmSync(file, { force: true })
  }
}
