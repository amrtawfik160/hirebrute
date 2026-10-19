import fs from "node:fs"
import PDFDocument from "pdfkit"
import type { AtsReport, Profile } from "../shared/types.ts"
import { tokenize } from "../shared/fit.ts"
import { ensureDir } from "./paths.ts"

export function markdownToPlain(md: string): string {
  return md
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^[-*]\s+/gm, "• ")
    .replace(/\r/g, "")
    .trim()
}

const STOP = new Set([
  "the",
  "and",
  "for",
  "with",
  "you",
  "your",
  "our",
  "will",
  "are",
  "this",
  "that",
  "from",
  "have",
  "has",
  "experience",
  "required",
  "requirements",
  "nice",
  "plus",
  "about",
  "role",
  "team",
  "work",
  "working",
  "years",
])

export function extractKeywords(posting: string): string[] {
  const lines = posting.split("\n")
  const bag: string[] = []
  for (const line of lines) {
    if (!/^[-*•]/.test(line.trim()) && !/python|typescript|rag|evaluat|retriev/i.test(line)) continue
    for (const tok of tokenize(line)) {
      if (tok.length < 3 || STOP.has(tok)) continue
      bag.push(tok)
    }
  }
  const seen = new Set<string>()
  const out: string[] = []
  for (const k of bag) {
    if (seen.has(k)) continue
    seen.add(k)
    out.push(k)
    if (out.length >= 16) break
  }
  if (!out.some((k) => k.includes("python")) && /python/i.test(posting)) out.unshift("python")
  return out
}

export function atsCheck(cvMarkdown: string, profile: Profile, posting: string): AtsReport {
  const text = markdownToPlain(cvMarkdown)
  const lower = text.toLowerCase()
  const nameFound = Boolean(profile.name) && lower.includes(profile.name.toLowerCase())
  const emailFound = Boolean(profile.email) && lower.includes(profile.email.toLowerCase())
  const digits = (profile.phone || "").replace(/\D/g, "")
  const phoneFound = digits.length >= 7 && text.replace(/\D/g, "").includes(digits.slice(-7))
  const keywords = extractKeywords(posting)
  const profileBlob = [
    ...profile.skills.primary,
    ...profile.skills.secondary,
    ...profile.skills.domain,
    ...profile.experience.flatMap((e) => e.bullets),
  ]
    .join(" ")
    .toLowerCase()
  const keywordCoverage = keywords.map((keyword) => ({
    keyword,
    present: lower.includes(keyword.toLowerCase()),
    supported: profileBlob.includes(keyword.toLowerCase()),
  }))
  const present = keywordCoverage.filter((k) => k.present).length
  const coverageScore = keywordCoverage.length ? Math.round((present / keywordCoverage.length) * 100) : 100
  const pageCount = text.length > 4200 ? 3 : text.length > 2200 ? 2 : 1
  const garbledGlyphs = /�|\ufffd/.test(text)
  const notes: string[] = []
  if (!nameFound) notes.push("Name is missing from the extractable text layer.")
  if (!emailFound) notes.push("Email is missing from the extractable text layer.")
  if (pageCount > 2) notes.push("CV looks longer than two pages.")
  if (garbledGlyphs) notes.push("Replacement glyphs found. Export again as text, not an image.")
  return {
    contactPresent: nameFound && emailFound,
    emailFound,
    phoneFound,
    nameFound,
    garbledGlyphs,
    readingOrderOk: true,
    keywordCoverage,
    coverageScore,
    pageCount,
    notes,
  }
}

export function writePdf(markdown: string, dest: string): Promise<void> {
  ensureDir(dest.slice(0, dest.lastIndexOf("/")) || ".")
  const plain = markdownToPlain(markdown)
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "LETTER", margin: 54, info: { Title: "Job Desk document" } })
    const stream = fs.createWriteStream(dest)
    doc.pipe(stream)
    doc.font("Times-Roman").fontSize(11)
    for (const para of plain.split(/\n{2,}/)) {
      doc.text(para.trim(), { align: "left", paragraphGap: 8 })
    }
    doc.end()
    stream.on("finish", () => resolve())
    stream.on("error", reject)
  })
}
