import { createReadStream } from "node:fs";
import { realpath, stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";

const root = path.resolve(process.argv[2] || "public");
const realRoot = await realpath(root);
const port = Number(process.argv[3] || 4321);
const types = {
  ".html": "text/html; charset=utf-8", ".htm": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif", ".svg": "image/svg+xml",
  ".webp": "image/webp", ".ico": "image/x-icon", ".mp4": "video/mp4", ".webm": "video/webm", ".mp3": "audio/mpeg",
  ".woff": "font/woff", ".woff2": "font/woff2", ".ttf": "font/ttf", ".eot": "application/vnd.ms-fontobject", ".pdf": "application/pdf",
};

function contained(target) {
  const relative = path.relative(realRoot, target);
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative));
}

async function resolveRequest(pathname) {
  const decoded = decodeURIComponent(pathname).replace(/\\/g, "/");
  const initial = path.resolve(realRoot, `.${decoded}`);
  if (!contained(initial)) return null;
  const candidates = path.extname(initial) ? [initial] : [initial, `${initial}.html`, path.join(initial, "index.html")];
  for (const candidate of candidates) {
    try {
      let file = candidate;
      const info = await stat(file);
      if (info.isDirectory()) file = path.join(file, "index.html");
      const resolved = await realpath(file);
      if (contained(resolved) && (await stat(resolved)).isFile()) return resolved;
    } catch {}
  }
  return null;
}

createServer(async (request, response) => {
  if (!request.method || !["GET", "HEAD"].includes(request.method)) {
    response.writeHead(405, { "content-type": "text/plain; charset=utf-8", allow: "GET, HEAD" });
    response.end("Method not allowed");
    return;
  }
  try {
    const url = new URL(request.url, `http://${request.headers.host || "127.0.0.1"}`);
    const file = await resolveRequest(url.pathname);
    if (!file) throw new Error("Not found");
    const info = await stat(file);
    const headers = {
      "content-type": types[path.extname(file).toLowerCase()] || "application/octet-stream",
      "accept-ranges": "bytes",
      "content-length": info.size,
    };
    let start = 0;
    let end = info.size - 1;
    let status = 200;
    const range = request.headers.range?.match(/^bytes=(\d*)-(\d*)$/);
    if (range) {
      start = range[1] ? Number(range[1]) : 0;
      end = range[2] ? Number(range[2]) : end;
      if (start > end || end >= info.size) {
        response.writeHead(416, { "content-range": `bytes */${info.size}` });
        response.end();
        return;
      }
      status = 206;
      headers["content-range"] = `bytes ${start}-${end}/${info.size}`;
      headers["content-length"] = end - start + 1;
    }
    response.writeHead(status, headers);
    if (request.method === "HEAD") response.end();
    else createReadStream(file, { start, end }).on("error", () => response.destroy()).pipe(response);
  } catch {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
}).listen(port, "127.0.0.1", () => {
  console.log(`Static site available at http://127.0.0.1:${port}`);
});
