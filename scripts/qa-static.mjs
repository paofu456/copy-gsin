import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const baseUrl = process.argv[2] || "http://127.0.0.1:4321";
const outputDir = path.join(process.cwd(), "docs", "design-references", "szgsin", "local-qa");
const cases = [
  { name: "home", pathname: "/", viewport: { width: 1440, height: 900 }, wait: 3500 },
  { name: "company", pathname: "/page/gsjs.html", viewport: { width: 1440, height: 900 } },
  { name: "product-list", pathname: "/article/gjg.html", viewport: { width: 1440, height: 900 } },
  { name: "product-detail", pathname: "/article/detail/77.html", viewport: { width: 1440, height: 900 } },
  { name: "system", pathname: "/page/zpsgjgqbjztx.html", viewport: { width: 1440, height: 900 } },
  { name: "news", pathname: "/article/gsxw.html", viewport: { width: 1440, height: 900 } },
  { name: "contact", pathname: "/page/lxwm.html", viewport: { width: 1440, height: 900 } },
  { name: "home-mobile-crop", pathname: "/", viewport: { width: 390, height: 844 }, wait: 2500 },
  { name: "contact-mobile-crop", pathname: "/page/lxwm.html", viewport: { width: 390, height: 844 } },
];

await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];
for (const testCase of cases) {
  const page = await browser.newPage({ viewport: testCase.viewport });
  const consoleErrors = [];
  const failedRequests = [];
  const externalRequests = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("requestfailed", (request) => failedRequests.push({ url: request.url(), error: request.failure()?.errorText }));
  page.on("request", (request) => {
    const requestUrl = new URL(request.url());
    if (requestUrl.origin !== new URL(baseUrl).origin) externalRequests.push(request.url());
  });
  const response = await page.goto(`${baseUrl}${testCase.pathname}`, { waitUntil: "load", timeout: 60000 });
  await page.waitForTimeout(testCase.wait || 1500);
  const metrics = await page.evaluate(() => ({
    title: document.title,
    bodyWidth: document.body.scrollWidth,
    bodyHeight: document.body.scrollHeight,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    images: document.images.length,
    incompleteImages: [...document.images].filter((image) => !image.complete || image.naturalWidth === 0).map((image) => image.currentSrc || image.src),
  }));
  const screenshot = path.join(outputDir, `${testCase.name}-${testCase.viewport.width}.png`);
  await page.screenshot({ path: screenshot, fullPage: false });
  results.push({
    ...testCase,
    status: response?.status(),
    metrics,
    consoleErrors: [...new Set(consoleErrors)],
    failedRequests: [...new Map(failedRequests.map((item) => [item.url, item])).values()],
    externalRequests: [...new Set(externalRequests)],
    screenshot: path.relative(process.cwd(), screenshot),
  });
  await page.close();
}

const interactionPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await interactionPage.goto(`${baseUrl}/`, { waitUntil: "load", timeout: 60000 });
await interactionPage.waitForTimeout(1800);
const beforeWheel = await interactionPage.locator(".section.active").getAttribute("data-anchor");
await interactionPage.mouse.wheel(0, 900);
await interactionPage.waitForTimeout(1100);
const afterWheel = await interactionPage.locator(".section.active").getAttribute("data-anchor");
await interactionPage.locator(".search-off").click();
await interactionPage.waitForTimeout(400);
const searchOpened = await interactionPage.locator(".search-box").isVisible();
const toolbarBefore = await interactionPage.locator(".gr_kefu").getAttribute("class");
await interactionPage.locator(".kf-shqi").click();
await interactionPage.waitForTimeout(300);
const toolbarAfter = await interactionPage.locator(".gr_kefu").getAttribute("class");
const interaction = {
  fullPageEnabled: await interactionPage.locator("html.fp-enabled").count() === 1,
  beforeWheel,
  afterWheel,
  wheelChangedSection: Boolean(beforeWheel && afterWheel && beforeWheel !== afterWheel),
  searchOpened,
  toolbarToggled: toolbarBefore !== toolbarAfter,
  videoHref: await interactionPage.locator(".vide-play a").getAttribute("href"),
};
await interactionPage.close();
await browser.close();

const reportPath = path.join(outputDir, "report.json");
await writeFile(reportPath, JSON.stringify({ pages: results, interaction }, null, 2), "utf8");
const summary = results.map((result) => ({
  name: result.name,
  status: result.status,
  consoleErrors: result.consoleErrors.length,
  failedRequests: result.failedRequests.length,
  externalRequests: result.externalRequests.length,
  incompleteImages: result.metrics.incompleteImages.length,
  body: `${result.metrics.bodyWidth}x${result.metrics.bodyHeight}`,
}));
console.log(JSON.stringify({ report: path.relative(process.cwd(), reportPath), pages: summary, interaction }, null, 2));
if (
  results.some((result) => result.status !== 200 || result.externalRequests.length) ||
  !interaction.fullPageEnabled || !interaction.wheelChangedSection || !interaction.searchOpened || !interaction.toolbarToggled
) process.exitCode = 1;
