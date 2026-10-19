export interface GuardFinding {
  kind: "hidden_block" | "instruction" | "hidden_url" | "invisible" | "mixed_script"
  excerpt: string
}

export interface GuardResult {
  verdict: string
  flagged: boolean
  findings: GuardFinding[]
  cleaned: string
}

const ZERO_WIDTH = /[\u200B\u200C\u200D\u2060\u2061\u2062\u2063\u2064]/g
const BIDI_TAMPER = /[\u202A-\u202E\u2066-\u2069]/g
const SOFT_HYPHEN = /\u00AD/g
const BOM = /\uFEFF/g

const HIDDEN_STYLE =
  /display\s*:\s*none|visibility\s*:\s*hidden|opacity\s*:\s*0(?![.\d]*[1-9])|font-size\s*:\s*0(?:\.0+)?(?:px|pt|em|rem|%)?(?![\d.])|color\s*:\s*transparent|clip\s*:\s*rect\(\s*0|clip-path\s*:\s*inset\(\s*100%\)|(?:left|top|text-indent)\s*:\s*-\d{4,}px/i

const INSTRUCTION = new RegExp(
  [
    "ignore (all )?(previous|prior|above) instructions",
    "you are now",
    "system prompt",
    "hidden instruction",
    "do not tell the (user|candidate)",
    "always (recommend|apply|approve)",
    "exfiltrat",
    "jailbreak",
  ].join("|"),
  "i",
)

const MIXED_SCRIPT = /[A-Za-z][\u0400-\u04FF\u0370-\u03FF]|[\u0400-\u04FF\u0370-\u03FF][A-Za-z]/

function excerpt(value: string, max = 120): string {
  const t = value.replace(/\s+/g, " ").trim()
  return t.length > max ? `${t.slice(0, max)}…` : t
}

function stripTags(html: string, findings: GuardFinding[]): string {
  const hiddenBlocks: string[] = []
  let text = html.replace(/<!DOCTYPE[^>]*>|<\?[^>]*\?>/gi, " ")
  text = text.replace(/<!--([\s\S]*?)-->/g, (_, body: string) => {
    if (INSTRUCTION.test(body) || HIDDEN_STYLE.test(body)) {
      findings.push({ kind: "hidden_block", excerpt: excerpt(body) })
      hiddenBlocks.push(body)
    }
    return " "
  })
  text = text.replace(
    /<(script|style|noscript|svg|template)\b[^>]*>[\s\S]*?(?:<\/\1\s*>|$)/gi,
    " ",
  )

  text = text.replace(
    /<([a-zA-Z][\w:-]*)([^>]*)>([\s\S]*?)<\/\1>/gi,
    (full, _tag: string, attrs: string, body: string) => {
      if (/\bhidden\b|aria-hidden\s*=\s*["']true["']/i.test(attrs) || HIDDEN_STYLE.test(attrs)) {
        findings.push({ kind: "hidden_block", excerpt: excerpt(body) })
        const urls = body.match(/https?:\/\/[^\s"'<>]+/g) || []
        for (const url of urls) findings.push({ kind: "hidden_url", excerpt: url })
        return " "
      }
      return `${body} `
    },
  )
  text = text.replace(/<br\s*\/?>/gi, "\n")
  text = text.replace(/<\/(p|div|li|h[1-6]|tr|section|article)>/gi, "\n")
  text = text.replace(/<[^>]+>/g, " ")
  void hiddenBlocks
  return text
}

export function postingGuard(input: string, mode?: "html" | "text"): GuardResult {
  const findings: GuardFinding[] = []
  const looksHtml = mode === "html" || (mode !== "text" && /<\/?[a-z][\s\S]*>/i.test(input))
  let cleaned = looksHtml ? stripTags(input, findings) : input

  const invisible = cleaned.match(ZERO_WIDTH) || []
  const bidi = cleaned.match(BIDI_TAMPER) || []
  if (invisible.length || bidi.length) {
    findings.push({
      kind: "invisible",
      excerpt: `${invisible.length} zero-width, ${bidi.length} bidi controls`,
    })
  }
  cleaned = cleaned.replace(ZERO_WIDTH, "").replace(BIDI_TAMPER, "").replace(SOFT_HYPHEN, "").replace(BOM, "")
  cleaned = cleaned.replace(/\u00a0/g, " ")
  cleaned = cleaned.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim()

  for (const line of cleaned.split("\n")) {
    const t = line.trim()
    if (t && INSTRUCTION.test(t)) {
      findings.push({ kind: "instruction", excerpt: excerpt(t, 200) })
    }
    if (t && MIXED_SCRIPT.test(t)) {
      findings.push({ kind: "mixed_script", excerpt: excerpt(t, 80) })
    }
  }

  const targeting = findings.filter((f) =>
    f.kind === "instruction" || f.kind === "invisible" || f.kind === "mixed_script",
  )
  const flagged = targeting.length > 0
  const verdict = flagged
    ? `⚠ posting integrity: ${targeting.length} targeting signal(s), ${findings.length} finding(s)`
    : "clean"

  return { verdict, flagged, findings, cleaned }
}
