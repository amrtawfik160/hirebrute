import { chromium } from "playwright"
import fs from "node:fs"
import path from "node:path"

const WEB = "http://127.0.0.1:4317"
const out = path.resolve("docs/screenshots")
const artifacts = fs.existsSync("/opt/cursor/artifacts") ? "/opt/cursor/artifacts" : null
fs.mkdirSync(out, { recursive: true })

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

async function shot(name, url) {
  await page.goto(url, { waitUntil: "networkidle", timeout: 20000 })
  await page.waitForTimeout(400)
  const dest = path.join(out, name)
  await page.screenshot({ path: dest, fullPage: true })
  if (artifacts) await page.screenshot({ path: path.join(artifacts, name), fullPage: true })
  console.log("wrote", dest)
}

await shot("dashboard.png", `${WEB}/`)
await shot("profile.png", `${WEB}/profile`)
await shot("jobs.png", `${WEB}/jobs`)
await shot("settings.png", `${WEB}/settings`)
await shot("applications.png", `${WEB}/applications`)

await page.setViewportSize({ width: 1440, height: 900 })
await page.goto(`${WEB}/apply`, { waitUntil: "networkidle" })
await page.getByRole("button", { name: "Load sample posting" }).click()
await page.getByRole("button", { name: "Evaluate fit" }).click()
await page.getByText(/\/100/).first().waitFor({ timeout: 15000 })
await page.getByRole("button", { name: "Draft CV + cover" }).click()
await page.getByRole("tab", { name: "Cover letter" }).waitFor({ timeout: 20000 })
await page.waitForTimeout(400)
const applyShot = path.join(out, "apply.png")
await page.screenshot({ path: applyShot, fullPage: true })
if (artifacts) await page.screenshot({ path: path.join(artifacts, "apply.png"), fullPage: true })
console.log("wrote", applyShot)

await page.setViewportSize({ width: 390, height: 844 })
await shot("dashboard-mobile.png", `${WEB}/`)

await browser.close()
