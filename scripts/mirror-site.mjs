import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const origin = "https://www.szgsin.com";
const rootDir = process.cwd();
const publicDir = path.join(rootDir, "public");
const researchDir = path.join(rootDir, "docs", "research", "szgsin");
const routes = JSON.parse(await readFile(path.join(researchDir, "routes.json"), "utf8"));
const discoveredAssets = JSON.parse(await readFile(path.join(researchDir, "assets.json"), "utf8"));

const assetAttributes = ["src", "poster", "data-src", "data-original"];
const allowedExternalMediaHosts = new Set(["1500047127.vod-qcloud.com"]);
const assetExtensions = /\.(?:css|js|mjs|jpe?g|png|gif|webp|svg|ico|mp4|webm|mp3|woff2?|ttf|eot|pdf)(?:$|\?)/i;
const excludedPageStatuses = new Set([404, 500]);
const mirrorRoutes = routes.filter((route) => !excludedPageStatuses.has(route.status));
const fetchLog = {
  pages: [],
  assets: [],
  errors: [],
  skipped: routes
    .filter((route) => excludedPageStatuses.has(route.status))
    .map((route) => ({ pathname: route.pathname, status: route.status, reason: "source endpoint is not a usable page" })),
};

function sha(value) {
  return createHash("sha256").update(value).digest("hex").slice(0, 10);
}

function safePathname(url) {
  const parsed = new URL(url);
  let pathname = decodeURIComponent(parsed.pathname);
  pathname = pathname.replace(/[<>:"|?*]/g, "-");
  if (parsed.search) {
    const extension = path.posix.extname(pathname);
    const stem = extension ? pathname.slice(0, -extension.length) : pathname;
    pathname = `${stem}-${sha(parsed.search)}${extension}`;
  }
  return pathname;
}

function publicUrlForAsset(url) {
  const parsed = new URL(url);
  if (parsed.origin === origin) return safePathname(parsed.href);
  return `/media/external/${parsed.hostname}${safePathname(parsed.href)}`;
}

function outputPathForPage(pathname) {
  if (pathname === "/") return path.join(publicDir, "index.html");
  const clean = decodeURIComponent(pathname).replace(/^\/+/, "");
  if (/\.html?$/i.test(clean)) return path.join(publicDir, ...clean.split("/"));
  return path.join(publicDir, ...clean.split("/"), "index.html");
}

function outputPathForAsset(url) {
  return path.join(publicDir, ...publicUrlForAsset(url).replace(/^\/+/, "").split("/"));
}

function absoluteUrl(value, baseUrl) {
  try {
    const parsed = new URL(value, baseUrl);
    if (!["http:", "https:"].includes(parsed.protocol)) return null;
    return parsed.href;
  } catch {
    return null;
  }
}

function shouldMirrorAsset(url, attribute = "") {
  const parsed = new URL(url);
  if (parsed.origin === origin) {
    if (/^\/media\/external\//i.test(parsed.pathname)) return false;
    if (/^\/skin\/jx\/fonts\//i.test(parsed.pathname)) return false;
    if (attribute === "href" && /\.html?(?:$|\?)/i.test(parsed.pathname)) return false;
    return assetExtensions.test(parsed.pathname) || /^\/(?:skin|include)\//i.test(parsed.pathname) || attribute !== "href";
  }
  return allowedExternalMediaHosts.has(parsed.hostname) && assetExtensions.test(parsed.pathname);
}

function extractAttributeUrls(html, baseUrl) {
  const results = new Set();
  for (const attribute of [...assetAttributes, "href"]) {
    const expression = new RegExp(`${attribute}\\s*=\\s*["']([^"']+)["']`, "gi");
    for (const match of html.matchAll(expression)) {
      const url = absoluteUrl(match[1], baseUrl);
      if (url && shouldMirrorAsset(url, attribute)) results.add(url);
    }
  }
  for (const match of html.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/gi)) {
    const url = absoluteUrl(match[1], baseUrl);
    if (url && shouldMirrorAsset(url, "style")) results.add(url);
  }
  return [...results];
}

function rewriteUrlValue(value, baseUrl, attribute) {
  const url = absoluteUrl(value, baseUrl);
  if (!url) return value;
  const parsed = new URL(url);
  if (shouldMirrorAsset(url, attribute)) return publicUrlForAsset(url);
  if (parsed.origin === origin) return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  return value;
}

function rewriteHtml(html, pageUrl) {
  let output = html
    .replace(/<script[^>]+(?:cloudflareinsights|cnzz|pw\.cnzz)[\s\S]*?<\/script>/gi, "")
    .replace(/<script[^>]+src=["'][^"']*(?:cloudflareinsights|cnzz|pw\.cnzz)[^"']*["'][^>]*><\/script>/gi, "");

  output = output.replace(/\b(src|href|poster|data-src|data-original)\s*=\s*(["'])([^"']+)\2/gi, (whole, attribute, quote, value) => {
    return `${attribute}=${quote}${rewriteUrlValue(value, pageUrl, attribute.toLowerCase())}${quote}`;
  });

  output = output.replace(/url\(\s*(["']?)([^"')]+)\1\s*\)/gi, (whole, quote, value) => {
    const rewritten = rewriteUrlValue(value, pageUrl, "style");
    return `url(${quote}${rewritten}${quote})`;
  });

  const guard = `<script data-static-contact-guard>document.addEventListener("submit",function(event){event.preventDefault();var button=event.submitter;if(button){var label=button.textContent;button.textContent="已收到";button.disabled=true;setTimeout(function(){button.textContent=label;button.disabled=false},1800)}});</script>`;
  if (/<\/body>/i.test(output)) output = output.replace(/<\/body>/i, `${guard}</body>`);
  else output += guard;
  return output;
}

function rewriteCss(css, cssUrl) {
  return css.replace(/url\(\s*(["']?)([^"')]+)\1\s*\)/gi, (whole, quote, value) => {
    if (/^(?:data:|#)/i.test(value)) return whole;
    const url = absoluteUrl(value, cssUrl);
    if (!url || !shouldMirrorAsset(url, "style")) return whole;
    return `url(${quote}${publicUrlForAsset(url)}${quote})`;
  });
}

async function fetchWithRetry(url, binary = false) {
  let lastError;
  const attempts = binary ? 2 : 3;
  const timeoutMs = binary ? 60000 : 60000;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        redirect: "follow",
        signal: controller.signal,
        headers: { "user-agent": "copy-gsin-authorized-static-rebuild/1.0" },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const body = binary ? Buffer.from(await response.arrayBuffer()) : await response.text();
      return { body, contentType: response.headers.get("content-type") ?? "" };
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, 400 * attempt));
    } finally {
      clearTimeout(timeout);
    }
  }
  throw lastError;
}

async function runPool(items, limit, worker) {
  let cursor = 0;
  async function next() {
    while (cursor < items.length) {
      const index = cursor++;
      await worker(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: limit }, () => next()));
}

const assetQueue = new Set(
  discoveredAssets
    .map((entry) => entry.url)
    .filter((url) => {
      try { return shouldMirrorAsset(url, "src"); } catch { return false; }
    }),
);

await runPool(mirrorRoutes, 6, async (route) => {
  const pageUrl = new URL(route.pathname, origin).href;
  const outputPath = outputPathForPage(route.pathname);
  try {
    let html;
    try {
      html = await readFile(outputPath, "utf8");
    } catch {
      ({ body: html } = await fetchWithRetry(pageUrl, false));
      await mkdir(path.dirname(outputPath), { recursive: true });
      await writeFile(outputPath, rewriteHtml(html, pageUrl), "utf8");
      html = rewriteHtml(html, pageUrl);
    }
    for (const asset of extractAttributeUrls(html, pageUrl)) assetQueue.add(asset);
    fetchLog.pages.push({ pathname: route.pathname, output: path.relative(publicDir, outputPath) });
  } catch (error) {
    fetchLog.errors.push({ type: "page", url: pageUrl, error: String(error) });
  }
});

const completedAssets = new Set();
while (true) {
  const batch = [...assetQueue].filter((url) => !completedAssets.has(url)).slice(0, 80);
  if (!batch.length) break;
  await runPool(batch, 8, async (assetUrl) => {
    completedAssets.add(assetUrl);
    try {
      const outputPath = outputPathForAsset(assetUrl);
      try {
        const existing = await readFile(outputPath);
        if (existing.length > 0) {
          if (/\.css(?:$|\?)/i.test(assetUrl)) {
            const css = existing.toString("utf8");
            for (const nested of extractAttributeUrls(`<style>${css}</style>`, assetUrl)) assetQueue.add(nested);
          }
          fetchLog.assets.push({ url: assetUrl, output: path.relative(publicDir, outputPath), bytes: existing.length, contentType: "existing" });
          return;
        }
      } catch {}
      const { body, contentType } = await fetchWithRetry(assetUrl, true);
      let finalBody = body;
      if (contentType.includes("text/css") || /\.css(?:$|\?)/i.test(assetUrl)) {
        const css = rewriteCss(body.toString("utf8"), assetUrl);
        finalBody = Buffer.from(css);
        for (const nested of extractAttributeUrls(`<style>${css}</style>`, assetUrl)) assetQueue.add(nested);
      }
      await mkdir(path.dirname(outputPath), { recursive: true });
      await writeFile(outputPath, finalBody);
      fetchLog.assets.push({ url: assetUrl, output: path.relative(publicDir, outputPath), bytes: finalBody.length, contentType });
    } catch (error) {
      fetchLog.errors.push({ type: "asset", url: assetUrl, error: String(error) });
    }
  });
}

fetchLog.pages.sort((a, b) => a.pathname.localeCompare(b.pathname, "en"));
fetchLog.assets.sort((a, b) => a.url.localeCompare(b.url, "en"));
await writeFile(path.join(researchDir, "mirror-log.json"), JSON.stringify(fetchLog, null, 2));

console.log(JSON.stringify({
  pages: fetchLog.pages.length,
  assets: fetchLog.assets.length,
  errors: fetchLog.errors.length,
}, null, 2));
