import { expect, test, type Page } from "@playwright/test"

const CV = `Name: Jordan Hale
Email: jordan.hale@example.com
Phone: +1 415 555 0199
Location: Berlin, DE
Headline: Platform engineer who keeps deploy bars honest
Skills: Go
Skill: span sampling
Project: Nightly Gate
`

test.describe.configure({ mode: "serial" })

function providerCard(page: Page, label: string) {
  return page.getByText(label, { exact: true }).locator("xpath=ancestor::div[contains(@class,'border-2')][1]")
}

async function open(page: Page, name: string) {
  await page.getByRole("link", { name, exact: true }).click()
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible()
}

test("profile save survives reload and CV paste updates the fields", async ({ page }) => {
  await page.goto("/")
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible()
  await expect(page.getByText("This workspace starts empty")).toBeVisible()
  const health = await page.request.get("/api/health")
  expect(await health.json()).toMatchObject({ demo: false, provider: null, profile: null })
  await open(page, "Profile")
  await expect(page.getByLabel("Name")).toHaveValue("")
  await expect(page.getByText("sample candidate")).toHaveCount(0)
  await page.getByLabel("Headline").fill("Eval lead on this machine")
  await page.getByRole("button", { name: "Save profile" }).click()
  await expect(page.getByText("Profile saved on this machine")).toBeVisible()
  await page.reload()
  await expect(page.getByLabel("Headline")).toHaveValue("Eval lead on this machine")

  await page.getByLabel("CV or notes").fill(CV)
  await page.getByRole("button", { name: "Ingest text" }).click()
  await expect(page.getByText("Sources stored")).toBeVisible()
  await expect(page.getByLabel("Name")).toHaveValue("Jordan Hale")
  await expect(page.getByLabel("Email")).toHaveValue("jordan.hale@example.com")
  await expect(page.getByLabel("Primary skills")).toHaveValue(/Go/)
  await expect(page.getByText("sample candidate")).toHaveCount(0)
})

test("settings detects all 9 providers, fake CLIs, and a saved key", async ({ page }) => {
  await page.goto("/settings")
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible()
  const labels = [
    "Claude Code CLI",
    "Codex CLI",
    "Grok CLI",
    "Anthropic API",
    "OpenAI API",
    "xAI API (Grok)",
    "Gemini API",
    "OpenRouter",
    "Offline test mode",
  ]
  for (const label of labels) {
    await expect(page.getByText(label, { exact: true })).toBeVisible()
  }
  for (const label of ["Claude Code CLI", "Codex CLI", "Grok CLI"]) {
    await expect(providerCard(page, label)).toContainText(/Found/)
    await expect(providerCard(page, label).getByText("ready", { exact: true })).toBeVisible()
  }
  await expect(page.getByText("No provider is selected")).toBeVisible()
  await expect(providerCard(page, "Offline test mode").getByRole("button", { name: "Use" })).toBeVisible()

  await page.getByLabel("Anthropic API API key").fill("sk-test-key-12345678")
  await page.getByRole("button", { name: "Save keys" }).click()
  await expect(page.getByText("Keys saved locally")).toBeVisible()
  await expect(page.getByText("sk-••••5678")).toBeVisible()
  await expect(providerCard(page, "Anthropic API").getByText("ready", { exact: true })).toBeVisible()

  for (const label of labels.filter((label) => label !== "Offline test mode")) {
    await providerCard(page, label).getByRole("button", { name: "Use" }).click()
    await expect(providerCard(page, label).getByRole("button", { name: "Active" })).toBeVisible()
  }
  await providerCard(page, "Offline test mode").getByRole("button", { name: "Use" }).click()
  await expect(providerCard(page, "Offline test mode").getByRole("button", { name: "Active" })).toBeVisible()
})

test("demo scrape lists jobs, rank shows the gates, and Remotive returns a live posting", async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem("hirebrute-scraped", "1"))
  await page.goto("/portals")
  await page.getByLabel("Offline test board enabled").click()
  for (const name of ["Remotive", "Arbeitnow", "Remote OK", "The Muse", "freehire.me"]) {
    await page.getByLabel(`${name} enabled`).click()
  }
  await page.goto("/jobs")
  await expect(page.getByText("No jobs stored yet")).toBeVisible()
  await page.getByRole("button", { name: "Scrape jobs" }).first().click()
  await expect(page.getByText(/new jobs from mock/)).toBeVisible()
  await expect(page.getByText("Lumenfold")).toBeVisible()

  await open(page, "Rank")
  await page.getByRole("button", { name: "Rank new jobs" }).click()
  await expect(page.getByText(/on the shortlist/)).toBeVisible()
  const lumen = page.locator("article").filter({ hasText: "Lumenfold" })
  await expect(lumen.getByText("Language FAIL")).toBeVisible()
  await expect(lumen.getByText("0/100")).toBeVisible()
  const paper = page.locator("article").filter({ hasText: "Paperkite" })
  await expect(paper.getByText("Location FAIL")).toBeVisible()

  await page.goto("/portals")
  await page.getByLabel("Remotive enabled").click()
  await page.goto("/jobs")
  await page.getByRole("button", { name: "Scrape jobs" }).click()
  await expect(page.getByText(/from mock, remotive|from remotive, mock/)).toBeVisible({ timeout: 30_000 })
  await expect(page.locator("article").filter({ hasText: "remotive" }).first()).toBeVisible()
})

test("a dead posting URL errors, then a sample draft shows CV, cover, review, and ATS", async ({ page }) => {
  await page.goto("/apply")
  await page.getByLabel("Posting URL").fill("http://127.0.0.1:1/missing-posting")
  await page.getByRole("button", { name: "Evaluate fit" }).click()
  await expect(page.getByText(/fetch failed|ECONNREFUSED|network|Evaluate failed|connect/i)).toBeVisible()
  await page.getByLabel("Posting URL").fill("")
  await page.getByRole("button", { name: "Load sample posting" }).click()
  await page.getByRole("button", { name: "Evaluate fit" }).click()
  await expect(page.getByText("Northstar Robotics").last()).toBeVisible()
  await expect(page.getByText("Language PASS")).toBeVisible()
  await page.getByRole("button", { name: "Draft CV + cover" }).click()
  await expect(page.getByText("Draft saved as drafted")).toBeVisible()
  await expect(page.getByText(/Jordan Hale/)).toBeVisible()
  await page.getByRole("tab", { name: "CV" }).click()
  await expect(page.getByText("jordan.hale@example.com")).toBeVisible()
  await page.getByRole("tab", { name: "ATS check" }).click()
  await expect(page.getByText(/Name found/)).toBeVisible()
  await expect(page.getByText(/Email found/)).toBeVisible()
  await expect(page.getByText("Opening is specific. Keep the 14% faithfulness number")).toBeVisible()
})

test("applications can be marked sent, moved to interview, and followed up", async ({ page }) => {
  await page.goto("/applications")
  await expect(page.getByRole("heading", { name: "Northstar Robotics" })).toBeVisible()
  await expect(page.getByText("Staff AI Engineer, Evaluation · not sent")).toBeVisible()
  await page.getByRole("button", { name: "Mark sent" }).click()
  await expect(page.getByText("marked sent")).toBeVisible()
  await expect(page.getByText(/applied \d{4}-\d{2}-\d{2}/)).toBeVisible()

  await page.getByLabel("Status for Northstar Robotics").click()
  await page.getByRole("option", { name: "Interview" }).click()
  await expect(page.getByText("is now interview")).toBeVisible()

  await page.getByRole("button", { name: "Write follow-up" }).click()
  await expect(page.getByText("Follow-up copied and logged")).toBeVisible()
})

test("interview pack, upskill, and expand write back to the profile", async ({ page }) => {
  await page.goto("/interview")
  await expect(page.getByLabel("Application")).toBeVisible()
  await page.getByLabel("Stage").fill("onsite")
  await page.getByRole("button", { name: "Build pack" }).click()
  await expect(page.getByText("Interview pack ready")).toBeVisible()
  await expect(page.getByText("Tell me about a launch you stopped.")).toBeVisible()
  await expect(page.getByText("Ask them", { exact: true })).toBeVisible()

  await open(page, "Upskill")
  await page.getByRole("button", { name: "Aggregate heatmap" }).click()
  await expect(page.getByText("robotics perception")).toBeVisible()
  await page.getByLabel("Targeted skill").fill("warehouse robotics")
  await page.getByRole("button", { name: "Targeted" }).click()
  await expect(page.getByText("warehouse robotics").first()).toBeVisible()

  await open(page, "Expand")
  await page.getByRole("button", { name: "Propose additions" }).click()
  await expect(page.getByText("Nothing new.")).toBeVisible()
  await expect(page.getByText("Nightly Gate")).toBeVisible()
  await page.getByRole("button", { name: "Accept selected" }).click()
  await expect(page.getByText("Accepted additions were appended")).toBeVisible()

  await open(page, "Profile")
  await expect(page.getByLabel("Primary skills")).toHaveValue(/span sampling/)
})

test("dashboard counts sent work and the HTML export includes the company", async ({ page }) => {
  await page.goto("/")
  await expect(page.getByText("Sent", { exact: true }).locator("xpath=following-sibling::p")).toHaveText("1")
  await expect(page.getByText("Drafted", { exact: true }).locator("xpath=following-sibling::p")).toHaveText("0")
  await expect(page.getByText("Northstar Robotics", { exact: true })).toBeVisible()
  const html = await page.request.get("/api/export/html")
  expect(html.ok()).toBeTruthy()
  expect(await html.text()).toContain("Northstar Robotics")
})

test("gmail paste approval and the notion snapshot update the tracker", async ({ page }) => {
  await page.goto("/sync")
  await page.getByPlaceholder("Paste full email bodies").fill(
    "From: recruiter@northstar.test\n\nWe are pleased to offer you the Staff AI Engineer role at Northstar Robotics.",
  )
  await page.getByRole("button", { name: "Propose updates" }).click()
  await expect(page.getByText("proposals. Nothing written yet.")).toBeVisible()
  await expect(page.getByText("→ offer")).toBeVisible()
  await page.getByRole("button", { name: "Approve selected" }).click()
  await expect(page.getByText("Approved rows written")).toBeVisible()

  await page.getByRole("button", { name: "Build snapshot" }).click()
  await expect(page.getByText("Edits in Notion never flow back")).toBeVisible()
  await expect(page.getByText(/Northstar Robotics · .* · offer/)).toBeVisible()
})

test("portals, templates, and history record the local changes", async ({ page }) => {
  await page.goto("/portals")
  await page.getByLabel("Offline test board enabled").click()
  await page.getByLabel("Feed name").fill("Example jobs")
  await page.getByLabel("RSS or JSON URL").fill("https://example.com/jobs.rss")
  await page.getByRole("button", { name: "Add feed" }).click()
  await expect(page.getByText("Example jobs")).toBeVisible()
  await page.getByLabel("Template name").fill("Compact CV")
  await page.getByRole("button", { name: "Add template" }).click()
  await expect(page.getByText("Compact CV")).toBeVisible()

  await open(page, "History")
  await expect(page.getByText("Added template Compact CV")).toBeVisible()
  await expect(page.getByText(/Drafted|Ranked|Scraped/).first()).toBeVisible()
})

test("a wrong reset word changes nothing, RESET clears, and empty pages say so", async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem("hirebrute-scraped", "1"))
  await page.goto("/profile")
  await expect(page.getByLabel("Name")).toHaveValue("Jordan Hale")
  await open(page, "Settings")
  await page.getByPlaceholder("RESET").fill("nope")
  await page.getByRole("button", { name: "Reset" }).click()
  await expect(page.getByText("Nothing was changed.")).toBeVisible()
  await open(page, "Profile")
  await expect(page.getByLabel("Name")).toHaveValue("Jordan Hale")

  await open(page, "Settings")
  await page.getByPlaceholder("RESET").fill("RESET")
  await page.getByRole("button", { name: "Reset" }).click()
  await expect(page.getByText("Reset complete")).toBeVisible()

  await open(page, "Jobs")
  await expect(page.getByText("No jobs stored yet")).toBeVisible()
  await open(page, "Applications")
  await expect(page.getByText("Tracker is empty")).toBeVisible()
  await open(page, "Interview")
  await expect(page.getByText("No live processes")).toBeVisible()
  await page.goto("/")
  await expect(page.getByText("No applications yet")).toBeVisible()
  await expect(page.getByText("Sent", { exact: true }).locator("xpath=following-sibling::p")).toHaveText("0")

  await open(page, "Sync")
  await page.getByPlaceholder("Paste full email bodies").fill(
    "From: recruiter@example.com\n\nWe are pleased to offer you the role at Nowhere Inc.",
  )
  await page.getByRole("button", { name: "Propose updates" }).click()
  await expect(page.getByText("No applications in the tracker")).toBeVisible()
})
