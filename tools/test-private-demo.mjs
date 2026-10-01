/** Test the staged Site behind a cookie gate; no artwork enters this repository. */
import { createServer } from "node:http";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import assert from "node:assert/strict";

const [distArg, playwrightArg, outputArg, engine = "chromium"] = process.argv.slice(2);
if (!distArg || !playwrightArg || !outputArg)
  throw new Error("Supply staged Site directory, Playwright module, output directory and optional browser engine");
const dist = path.resolve(distArg), output = path.resolve(outputArg);
const pw = await import(pathToFileURL(path.resolve(playwrightArg)).href);
const requests = [], errors = [];
const server = createServer(async (req, res) => {
  const url = new URL(req.url, "http://test");
  let relative = decodeURIComponent(url.pathname).slice(1);
  if (!path.extname(relative)) relative += ".html";
  const file = path.resolve(dist, relative);
  if (!file.startsWith(dist + path.sep)) { res.writeHead(404); res.end(); return; }
  res.setHeader("cache-control", "no-store");
  if (relative.startsWith("cards/")) {
    const authenticated = req.headers.cookie?.includes("demo_session=test-only") ?? false;
    requests.push({ path: relative, authenticated });
    if (!authenticated) { res.writeHead(401); res.end("Sign in"); return; }
  }
  try {
    const data = await readFile(file);
    const ext = path.extname(file);
    res.setHeader("content-type", ({ ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".webp": "image/webp", ".png": "image/png" })[ext] ?? "application/octet-stream");
    if (ext === ".html") res.setHeader("set-cookie", "demo_session=test-only; HttpOnly; SameSite=Lax; Path=/");
    res.end(data);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
let browser;
try {
  const anonymous = await fetch(origin + "/cards/cards.json");
  assert.equal(anonymous.status, 401);
  browser = await pw[engine].launch({ headless: true, ...(engine === "chromium" ? { channel: "msedge" } : {}) });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, hasTouch: true, isMobile: true });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(origin + "/together");
  await page.waitForFunction(() => window.portableCards?.ready && window.portableCards.stage.diagnostics().activeViews === 2, null, { timeout: 60000 });
  const diagnostics = await page.evaluate(() => window.portableCards.stage.diagnostics());
  assert.ok(diagnostics.textures >= 30, "Both cards' textures must load");
  assert.equal(await page.locator("#cardStatus").isVisible(), false);
  await mkdir(output, { recursive: true });
  const neutral = await page.screenshot({ path: path.join(output, `private-${engine}-neutral.png`) });
  await page.locator("#turn").press("End");
  assert.equal(await page.locator("#turnValue").textContent(), "11°");
  await page.waitForFunction(() => window.portableCards.stage.diagnostics().scheduledFrames === 0);
  const turned = await page.screenshot({ path: path.join(output, `private-${engine}-turned.png`) });
  assert.notDeepEqual(neutral, turned, "Rotation must visibly change the rendered card page");
  await page.locator("#reset").click();
  assert.equal(await page.locator("#turnValue").textContent(), "0°");
  await page.locator("#panorama").scrollIntoViewIfNeeded();
  await page.evaluate(() => {
    window.touchTurns = [];
    new MutationObserver(() => window.touchTurns.push(document.getElementById("turnValue").textContent))
      .observe(document.getElementById("turnValue"), { childList: true });
  });
  const box = await page.locator("#panorama").boundingBox();
  await page.touchscreen.tap(box.x + box.width * 0.8, box.y + box.height * 0.4);
  assert.ok(await page.evaluate(() => window.touchTurns.some((value) => value !== "0°")), "Touch input must turn the cards");
  const failed = await browser.newPage({ viewport: { width: 390, height: 844 } });
  failed.on("pageerror", (error) => errors.push(error.message));
  await failed.route("**/cards/**/integrity.json", (route) => route.fulfill({ status: 503, body: "Temporary failure" }));
  await failed.goto(origin + "/together");
  await failed.locator("#retryCards").waitFor({ state: "visible" });
  assert.match(await failed.locator("#cardStatus").textContent(), /couldn't load/);
  assert.equal(await failed.locator("#turn").isDisabled(), true);
  assert.equal(await failed.locator("#retryCards").isEnabled(), true);
  await failed.unroute("**/cards/**/integrity.json");
  await failed.locator("#retryCards").click();
  await failed.waitForFunction(() => window.portableCards?.ready, null, { timeout: 60000 });
  assert.equal(await failed.locator("#turn").isEnabled(), true);
  assert.deepEqual(errors, []);
  assert.ok(requests.some((r) => r.path.endsWith(".webp") && r.authenticated));
  const report = { engine, browser: browser.version(), diagnostics, checks: ["anonymous denied", "both protected card packages rendered", "rotation visibly changes page", "reset", "touch input", "failure is visible", "retry recovers"], errors, note: "Desktop mobile emulation, not physical iPhone qualification." };
  await writeFile(path.join(output, `private-${engine}.json`), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser?.close();
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
}
