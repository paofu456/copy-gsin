import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const origin = "https://www.szgsin.com";
const rootDir = process.cwd();
const researchDir = path.join(rootDir, "docs", "research", "szgsin");
const screenshotDir = path.join(rootDir, "docs", "design-references", "szgsin");
const maxPages = 800;

const seeds = [
  "/",
  "/page/gsjs.html",
  "/page/fzlc.html",
  "/article/gsry.html",
  "/article/zzzs.html",
  "/page/lxwm.html",
  "/article/gjg.html",
  "/article/mkhgjg.html",
  "/article/zpsjz.html",
  "/article/zpsgjgcsyycp.html",
  "/article/gjgxcbscp.html",
  "/page/zpsgjgqbjztx.html",
  "/download/jszl.html",
  "/article/gsxw.html",
  "/article/hyzx.html",
];

const representativePages = [
  ["home", "/"],
  ["about", "/page/gsjs.html"],
  ["business", "/article/gjg.html"],
  ["project-detail", "/article/detail/77.html"],
  ["innovation", "/page/zpsgjgqbjztx.html"],
  ["news", "/article/gsxw.html"],
  ["contact", "/page/lxwm.html"],
];

const viewports = [
  ["desktop", { width: 1440, height: 900 }],
  ["tablet", { width: 768, height: 1024 }],
  ["mobile", { width: 390, height: 844 }],
];

function normalizeUrl(candidate, base = origin) {
  try {
    const url = new URL(candidate, base);
    if (url.origin !== origin) return null;
    if (!["http:", "https:"].includes(url.protocol)) return null;
    url.hash = "";
    url.search = "";
    url.pathname = url.pathname.replace(/\/{2,}/g, "/");
    if (/\.(?:css|js|mjs|json|xml|txt|pdf|zip|rar|7z|docx?|xlsx?|pptx?|jpe?g|png|gif|webp|svg|ico|mp4|webm|mp3|woff2?|ttf|eot)$/i.test(url.pathname)) return null;
    if (/^\/(?:admin|backup|bin|config|include|skin|tools)(?:\/|$)/i.test(url.pathname)) return null;
    return url.href;
  } catch {
    return null;
  }
}

function absoluteAsset(candidate, base) {
  try {
    const url = new URL(candidate, base);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    return url.href;
  } catch {
    return null;
  }
}

function decodeHtml(value) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function textFrom(html, pattern) {
  const match = html.match(pattern);
  if (!match) return "";
  return decodeHtml(match[1].replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, " "));
}

function extractAttributes(html, attribute) {
  const values = [];
  const expression = new RegExp(`${attribute}\\s*=\\s*["']([^"']+)["']`, "gi");
  for (const match of html.matchAll(expression)) values.push(match[1]);
  return values;
}

function pageType(pathname) {
  if (pathname === "/") return "home";
  if (/\/article\/detail\/[^/]+\.html$/i.test(pathname)) return "detail";
  if (/\/p\d+\.html$/i.test(pathname)) return "pagination";
  if (pathname.startsWith("/article/")) return "article-list";
  if (pathname.startsWith("/page/")) return "page";
  if (pathname.startsWith("/download/")) return "download-list";
  return "other";
}

async function fetchHtml(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);
  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: { "user-agent": "copy-gsin-authorized-static-rebuild/1.0" },
    });
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) {
      return { ok: false, status: response.status, contentType, html: "" };
    }
    return { ok: response.ok, status: response.status, contentType, html: await response.text() };
  } catch (error) {
    return { ok: false, status: 0, contentType: "", html: "", error: String(error) };
  } finally {
    clearTimeout(timeout);
  }
}

async function crawl() {
  const queue = seeds.map((entry) => normalizeUrl(entry)).filter(Boolean);
  const queued = new Set(queue);
  const visited = new Map();
  const assets = new Map();
  const errors = [];
  let cursor = 0;

  async function worker() {
    while (cursor < queue.length && visited.size < maxPages) {
      const index = cursor++;
      const url = queue[index];
      if (!url || visited.has(url)) continue;
      const result = await fetchHtml(url);
      if (!result.ok) {
        const current = new URL(url);
        errors.push({ url, status: result.status, contentType: result.contentType, error: result.error ?? "" });
        visited.set(url, {
          url,
          pathname: current.pathname,
          status: result.status,
          title: "",
          description: "",
          heading: "",
          type: pageType(current.pathname),
        });
        continue;
      }

      const html = result.html;
      const current = new URL(url);
      const record = {
        url,
        pathname: current.pathname,
        status: result.status,
        title: textFrom(html, /<title[^>]*>([\s\S]*?)<\/title>/i),
        description: html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i)?.[1] ?? "",
        heading: textFrom(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i) || textFrom(html, /<h[2-4][^>]*>([\s\S]*?)<\/h[2-4]>/i),
        type: pageType(current.pathname),
      };
      visited.set(url, record);

      for (const href of extractAttributes(html, "href")) {
        const normalized = normalizeUrl(href, url);
        if (normalized && !queued.has(normalized) && queued.size < maxPages) {
          queued.add(normalized);
          queue.push(normalized);
        }
      }

      for (const attribute of ["src", "poster"]) {
        for (const value of extractAttributes(html, attribute)) {
          const assetUrl = absoluteAsset(value, url);
          if (assetUrl) assets.set(assetUrl, { url: assetUrl, sourcePage: current.pathname });
        }
      }
      for (const match of html.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/gi)) {
        const assetUrl = absoluteAsset(match[1], url);
        if (assetUrl) assets.set(assetUrl, { url: assetUrl, sourcePage: current.pathname });
      }
    }
  }

  await Promise.all(Array.from({ length: 6 }, () => worker()));
  return {
    pages: [...visited.values()].sort((a, b) => a.pathname.localeCompare(b.pathname, "en")),
    assets: [...assets.values()].sort((a, b) => a.url.localeCompare(b.url, "en")),
    errors,
  };
}

async function captureReferences() {
  const browser = await chromium.launch({ headless: true });
  const styleRecords = {};
  const behaviorRecords = {};
  async function navigate(page, url) {
    try {
      await page.goto(url, { waitUntil: "commit", timeout: 45000 });
      await page.waitForLoadState("domcontentloaded", { timeout: 20000 }).catch(() => {});
      await page.waitForTimeout(1500);
      return true;
    } catch (error) {
      console.warn(`Reference navigation failed for ${url}: ${error.message}`);
      return false;
    }
  }
  try {
    for (const [viewportName, viewport] of viewports) {
      const context = await browser.newContext({ viewport, deviceScaleFactor: 1, locale: "zh-CN" });
      const page = await context.newPage();
      page.setDefaultTimeout(20000);

      for (const [name, pathname] of representativePages) {
        const url = `${origin}${pathname}`;
        if (!(await navigate(page, url))) continue;
        await page.screenshot({ path: path.join(screenshotDir, `${name}-${viewportName}.png`), fullPage: name !== "home" });

        if (viewportName === "desktop") {
          styleRecords[name] = await page.evaluate(() => {
            const selectors = ["body", "header", ".header", ".head", "nav", ".nav", "footer", ".footer", "h1", "h2", "a"];
            const properties = [
              "display", "position", "width", "height", "maxWidth", "padding", "margin", "gap",
              "fontFamily", "fontSize", "fontWeight", "lineHeight", "letterSpacing", "color",
              "backgroundColor", "backgroundImage", "border", "borderRadius", "boxShadow",
              "opacity", "transform", "transition", "overflow", "zIndex",
            ];
            const output = {};
            for (const selector of selectors) {
              const element = document.querySelector(selector);
              if (!element) continue;
              const computed = getComputedStyle(element);
              output[selector] = Object.fromEntries(properties.map((property) => [property, computed[property]]));
            }
            return output;
          });
        }
      }

      if (viewportName === "desktop") {
        if (!(await navigate(page, `${origin}/`))) continue;
        const homeStates = [];
        for (let index = 1; index <= 5; index += 1) {
          if (!(await navigate(page, `${origin}/#page${index}`))) continue;
          await page.screenshot({ path: path.join(screenshotDir, `home-page${index}-desktop.png`), fullPage: false });
          homeStates.push({ index, url: page.url() });
        }
        behaviorRecords.home = {
          model: "full-page vertical snap navigation with hash states",
          capturedStates: homeStates,
          viewport,
        };
      }
      await context.close();
    }
  } finally {
    await browser.close();
  }
  return { styleRecords, behaviorRecords };
}

async function main() {
  await mkdir(researchDir, { recursive: true });
  await mkdir(screenshotDir, { recursive: true });

  const crawlResult = await crawl();
  await writeFile(path.join(researchDir, "routes.json"), JSON.stringify(crawlResult.pages, null, 2));
  await writeFile(path.join(researchDir, "assets.json"), JSON.stringify(crawlResult.assets, null, 2));
  await writeFile(path.join(researchDir, "crawl-errors.json"), JSON.stringify(crawlResult.errors, null, 2));

  const grouped = Object.groupBy(crawlResult.pages, (page) => page.type);
  const routeMap = [
    "# Route map",
    "",
    `Captured ${crawlResult.pages.length} public HTML routes from ${origin}.`,
    "",
    ...Object.entries(grouped).flatMap(([type, pages]) => [
      `## ${type}`,
      "",
      ...pages.map((page) => `- \`${page.pathname}\` — ${page.title || page.heading || "Untitled"} (${page.status})`),
      "",
    ]),
  ].join("\n");
  await writeFile(path.join(researchDir, "ROUTE_MAP.md"), routeMap);

  const { styleRecords, behaviorRecords } = await captureReferences();
  await writeFile(path.join(researchDir, "computed-styles.json"), JSON.stringify(styleRecords, null, 2));
  await writeFile(path.join(researchDir, "BEHAVIORS.md"), [
    "# Observed behaviors",
    "",
    "## Home",
    "",
    "- Interaction model: full-page vertical sections controlled by wheel/keyboard/hash navigation.",
    "- Hero: time-driven image carousel with previous/next controls and slide indicators.",
    "- Side tools: hover/click disclosure for QR code, phone, contact, and back-to-top actions.",
    "- Captured states: `#page1` through `#page5` at 1440×900.",
    "",
    "## Inner pages",
    "",
    "- Shared fixed-height header and active navigation state.",
    "- Full-width image banner with breadcrumb overlay.",
    "- Horizontal category navigation followed by document-flow content.",
    "- Project/news lists use server-shaped pagination URLs that will be generated statically.",
    "",
    "```json",
    JSON.stringify(behaviorRecords, null, 2),
    "```",
  ].join("\n"));

  console.log(JSON.stringify({
    pages: crawlResult.pages.length,
    assets: crawlResult.assets.length,
    errors: crawlResult.errors.length,
    screenshots: representativePages.length * viewports.length + 5,
  }, null, 2));
}

await main();
