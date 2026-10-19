import { execSync } from "node:child_process"
import fs from "node:fs"

const TEXT = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".mjs",
  ".cjs",
  ".json",
  ".md",
  ".yml",
  ".yaml",
  ".txt",
  ".html",
  ".css",
  ".svg",
  ".example",
])

const PATTERNS = [
  { name: "Anthropic key", re: /sk-ant-[A-Za-z0-9_-]{16,}/ },
  { name: "OpenAI key", re: /sk-proj-[A-Za-z0-9_-]{16,}/ },
  { name: "OpenRouter key", re: /sk-or-v1-[A-Za-z0-9_-]{16,}/ },
  { name: "xAI key", re: /xai-[A-Za-z0-9]{16,}/ },
  { name: "Google API key", re: /AIza[0-9A-Za-z_-]{20,}/ },
  { name: "AWS access key", re: /AKIA[0-9A-Z]{16}/ },
  { name: "GitHub token", re: /ghp_[A-Za-z0-9]{20,}/ },
  { name: "GitHub fine-grained token", re: /github_pat_[A-Za-z0-9_]{20,}/ },
  { name: "private key block", re: /-----BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY-----/ },
]

const listed = execSync("git ls-files -z --cached --others --exclude-standard", { encoding: "utf8" })
  .split("\0")
  .filter(Boolean)
const files = [...new Set(listed)]

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g

function allowedEmail(email) {
  const domain = email.slice(email.lastIndexOf("@") + 1).toLowerCase()
  return domain === "example.com" || domain === "example.org" || domain === "example.net" || domain.endsWith(".test")
}

const hits = []
for (const file of files) {
  const localData = file.startsWith("data/") && file !== "data/.gitkeep"
  if (localData) {
    hits.push(`${file}: local data must stay untracked`)
    continue
  }
  if (file === ".env" || (file.startsWith(".env.") && file !== ".env.example") || file.endsWith(".env")) {
    hits.push(`${file}: env file with possible secrets`)
  }
  const ext = file.includes(".") ? file.slice(file.lastIndexOf(".")) : ""
  if (!TEXT.has(ext) && ext !== "") continue
  let text = ""
  try {
    text = fs.readFileSync(file, "utf8")
  } catch {
    continue
  }
  for (const pattern of PATTERNS) {
    pattern.re.lastIndex = 0
    if (pattern.re.test(text)) hits.push(`${file}: ${pattern.name}`)
  }
  const emails = text.match(EMAIL) || []
  for (const email of emails) {
    if (!allowedEmail(email)) hits.push(`${file}: unexpected email ${email}`)
  }
}

if (hits.length) {
  console.error("Secret check failed:")
  for (const hit of hits) console.error(`  ${hit}`)
  process.exit(1)
}

console.log(`Secret check passed for ${files.length} files.`)
