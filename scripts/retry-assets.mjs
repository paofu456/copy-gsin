import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const projectRoot = process.cwd();
const publicDir = path.join(projectRoot, "public");
const logPath = path.join(projectRoot, "docs", "research", "szgsin", "mirror-log.json");
const log = JSON.parse(await readFile(logPath, "utf8"));
const queue = [...new Set(log.errors.filter((entry) => entry.type === "asset").map((entry) => entry.url))];
const recovered = [];
const remaining = log.errors.filter((entry) => entry.type !== "asset");

function targetFor(url) {
  const parsed = new URL(url);
  if (parsed.origin !== "https://www.szgsin.com") throw new Error(`Unexpected origin: ${parsed.origin}`);
  const target = path.resolve(publicDir, ...decodeURIComponent(parsed.pathname).replace(/^\/+/, "").split("/"));
  const relative = path.relative(publicDir, target);
  if (relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) throw new Error(`Unsafe target: ${target}`);
  return target;
}

async function download(url) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90000);
    try {
      const response = await fetch(url, {
        redirect: "follow",
        signal: controller.signal,
        headers: {
          "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140 Safari/537.36",
          accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
          "cache-control": "no-cache",
        },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const contentType = response.headers.get("content-type") || "";
      if (!contentType.startsWith("image/")) throw new Error(`Unexpected content type: ${contentType}`);
      const body = Buffer.from(await response.arrayBuffer());
      if (body.length < 32) throw new Error(`Response too small: ${body.length}`);
      const target = targetFor(url);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, body);
      return { url, output: path.relative(publicDir, target), bytes: body.length, contentType };
    } catch (error) {
      lastError = error;
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, attempt * 1500));
    } finally {
      clearTimeout(timeout);
    }
  }
  throw lastError;
}

let cursor = 0;
async function worker() {
  while (cursor < queue.length) {
    const url = queue[cursor++];
    try {
      const result = await download(url);
      recovered.push(result);
      console.log(`recovered ${recovered.length}/${queue.length} ${result.output}`);
    } catch (error) {
      remaining.push({ type: "asset", url, error: String(error) });
      console.error(`failed ${url}: ${error}`);
    }
  }
}

await Promise.all([worker(), worker()]);
log.assets.push(...recovered);
log.assets.sort((a, b) => a.url.localeCompare(b.url, "en"));
log.errors = remaining;
await writeFile(logPath, JSON.stringify(log, null, 2), "utf8");
console.log(JSON.stringify({ attempted: queue.length, recovered: recovered.length, remainingErrors: remaining.length }, null, 2));
if (remaining.some((entry) => entry.type === "asset")) process.exitCode = 1;
