import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

const projectRoot = process.cwd();
const root = path.resolve(process.argv[2] || "public");
const routes = JSON.parse(await readFile(path.join(projectRoot, "docs", "research", "szgsin", "routes.json"), "utf8"));
const expectedRoutes = routes.filter((route) => ![404, 500].includes(route.status));
const htmlFiles = [];
const cssFiles = [];
const failures = [];

async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) await walk(target);
    else if (/\.html?$/i.test(entry.name)) htmlFiles.push(target);
    else if (/\.css$/i.test(entry.name)) cssFiles.push(target);
  }
}

function insideRoot(target) {
  const relative = path.relative(root, target);
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative));
}

function pageFileForRoute(pathname) {
  if (pathname === "/") return path.join(root, "index.html");
  const clean = decodeURIComponent(pathname).replace(/^\/+/, "");
  return /\.html?$/i.test(clean)
    ? path.join(root, ...clean.split("/"))
    : path.join(root, ...clean.split("/"), "index.html");
}

async function existsAsFile(target) {
  if (!insideRoot(target)) return false;
  try { return (await stat(target)).isFile(); } catch { return false; }
}

async function resolveLocal(value, sourceFile, allowRouteResolution) {
  const clean = value.split(/[?#]/)[0];
  if (!clean) return true;
  const rawTarget = clean.startsWith("/")
    ? path.resolve(root, ...clean.replace(/^\/+/, "").split("/"))
    : path.resolve(path.dirname(sourceFile), clean);
  if (await existsAsFile(rawTarget)) return true;
  if (!allowRouteResolution || path.extname(rawTarget)) return false;
  if (await existsAsFile(`${rawTarget}.html`)) return true;
  return existsAsFile(path.join(rawTarget, "index.html"));
}

function isIgnored(value) {
  return /^(?:mailto:|tel:|javascript:|tencent:|data:|blob:|#)/i.test(value);
}

function isExternal(value) {
  return /^(?:https?:)?\/\//i.test(value);
}

async function checkReference(value, sourceFile, kind) {
  if (!value || isIgnored(value)) return;
  if (isExternal(value)) {
    if (kind !== "navigation") failures.push({ type: "external-resource", file: path.relative(root, sourceFile), reference: value });
    return;
  }
  if (!(await resolveLocal(value, sourceFile, kind === "navigation"))) {
    failures.push({ type: "missing-reference", file: path.relative(root, sourceFile), reference: value });
  }
}

await walk(root);
for (const route of expectedRoutes) {
  const target = pageFileForRoute(route.pathname);
  if (!(await existsAsFile(target))) failures.push({ type: "missing-route", route: route.pathname, expected: path.relative(root, target) });
}

for (const file of htmlFiles) {
  const html = await readFile(file, "utf8");
  const htmlForReferences = html.replace(/(<script\b[^>]*>)[\s\S]*?<\/script>/gi, "$1</script>");
  for (const match of htmlForReferences.matchAll(/\b(src|poster|data-src|data-original|href)\s*=\s*["']([^"']+)["']/gi)) {
    const attribute = match[1].toLowerCase();
    await checkReference(match[2], file, attribute === "href" ? "navigation" : "resource");
  }
  for (const match of htmlForReferences.matchAll(/\bsrcset\s*=\s*["']([^"']+)["']/gi)) {
    for (const entry of match[1].split(",")) await checkReference(entry.trim().split(/\s+/)[0], file, "resource");
  }
  for (const match of htmlForReferences.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/gi)) await checkReference(match[1], file, "resource");
  if (/cloudflare-static\/email-decode|cloudflareinsights|cnzz|pw\.cnzz/i.test(html)) {
    failures.push({ type: "forbidden-tracker", file: path.relative(root, file) });
  }
  if (/<form\b[^>]*(?:action|method|onsubmit)\s*=/i.test(htmlForReferences)) {
    failures.push({ type: "active-form", file: path.relative(root, file) });
  }
}

for (const file of cssFiles) {
  const css = await readFile(file, "utf8");
  for (const match of css.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/gi)) await checkReference(match[1], file, "resource");
  for (const match of css.matchAll(/@import\s+(?:url\()?\s*["']([^"']+)["']/gi)) await checkReference(match[1], file, "resource");
}

if (htmlFiles.length !== expectedRoutes.length) {
  failures.push({ type: "html-count", expected: expectedRoutes.length, actual: htmlFiles.length });
}
if (failures.length) {
  console.error(JSON.stringify(failures.slice(0, 100), null, 2));
  throw new Error(`${failures.length} static-site integrity checks failed`);
}
console.log(JSON.stringify({ routes: expectedRoutes.length, htmlFiles: htmlFiles.length, cssFiles: cssFiles.length, failures: 0 }, null, 2));
