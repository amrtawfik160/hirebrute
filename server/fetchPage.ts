import * as cheerio from "cheerio"

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"

export async function fetchPage(url: string): Promise<{ html: string; status: number; finalUrl: string }> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": UA,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(20_000),
  })
  const html = await res.text()
  return { html, status: res.status, finalUrl: res.url }
}

export function extractReadable(html: string): string {
  const $ = cheerio.load(html)
  $("script,style,noscript,svg,template,nav,footer,header").remove()
  const main = $("article, main, [role=main], .job-description, .posting, #job, .description").first()
  const text = (main.length ? main : $("body")).text()
  return text.replace(/\u00a0/g, " ").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim()
}

export function extractMeta(html: string, url: string): { title?: string; company?: string } {
  const $ = cheerio.load(html)
  const ogTitle = $('meta[property="og:title"]').attr("content")
  const title = ogTitle || $("h1").first().text() || $("title").text()
  const company =
    $('meta[property="og:site_name"]').attr("content") ||
    $('[class*="company"]').first().text() ||
    new URL(url).hostname.replace(/^www\./, "")
  return { title: title?.trim(), company: company?.trim() }
}
