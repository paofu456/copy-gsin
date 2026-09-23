import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(process.argv[2] || "public");
const htmlFiles = [];

async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) await walk(target);
    else if (/\.html?$/i.test(entry.name)) htmlFiles.push(target);
  }
}

function decodeCloudflareEmail(value) {
  if (!/^[0-9a-f]+$/i.test(value) || value.length < 4 || value.length % 2 !== 0) return null;
  const key = Number.parseInt(value.slice(0, 2), 16);
  let result = "";
  for (let index = 2; index < value.length; index += 2) {
    result += String.fromCharCode(Number.parseInt(value.slice(index, index + 2), 16) ^ key);
  }
  return result;
}

function restoreProtectedEmails(html) {
  let output = html.replace(
    /<a\b([^>]*?)href=["']\/cdn-cgi\/l\/email-protection#([0-9a-f]+)["']([^>]*)>[\s\S]*?<\/a>/gi,
    (whole, before, encoded, after) => {
      const email = decodeCloudflareEmail(encoded);
      return email ? `<a${before}href="mailto:${email}"${after}>${email}</a>` : whole;
    },
  );
  output = output.replace(
    /<a\b([^>]*?)data-cfemail=["']([0-9a-f]+)["']([^>]*)>[\s\S]*?<\/a>/gi,
    (whole, before, encoded, after) => {
      const email = decodeCloudflareEmail(encoded);
      if (!email) return whole;
      const attributes = `${before}${after}`
        .replace(/\s+href\s*=\s*(?:["'][^"']*["']|[^\s>]+)/gi, "")
        .replace(/\s+data-cfemail\s*=\s*(?:["'][^"']*["']|[^\s>]+)/gi, "");
      return `<a${attributes} href="mailto:${email}">${email}</a>`;
    },
  );
  output = output.replace(
    /<span\b[^>]*data-cfemail=["']([0-9a-f]+)["'][^>]*>[\s\S]*?<\/span>/gi,
    (whole, encoded) => decodeCloudflareEmail(encoded) ?? whole,
  );
  return output;
}

function sanitizeHtml(html) {
  let output = restoreProtectedEmails(html);
  output = output
    .replace(/<script\b[^>]*data-static-contact-guard[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<script\b[^>]*src=["'][^"']*(?:cloudflare-static\/email-decode|cloudflareinsights|cnzz|pw\.cnzz)[^"']*["'][^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<script\b[^>]*>[\s\S]*?(?:cnzz|cloudflareinsights|pw\.cnzz)[\s\S]*?<\/script>/gi, "")
    .replace(/<form\b([^>]*)>/gi, (whole, attributes) => {
      const safeAttributes = attributes
        .replace(/\s+(?:action|method|onsubmit)\s*=\s*(?:["'][^"']*["']|[^\s>]+)/gi, "")
        .trimEnd();
      return `<form${safeAttributes} data-static-form>`;
    });

  const csp = `<meta http-equiv="Content-Security-Policy" content="default-src 'self' data: blob:; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; font-src 'self' data:; media-src 'self' blob:; connect-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'self'; form-action 'none'">`;
  if (!/http-equiv=["']Content-Security-Policy["']/i.test(output)) {
    output = /<head\b[^>]*>/i.test(output)
      ? output.replace(/<head\b[^>]*>/i, (tag) => `${tag}\n${csp}`)
      : `${csp}\n${output}`;
  }

  const runtime = `<script src="/static-runtime.js" defer></script>`;
  if (!/src=["']\/static-runtime\.js["']/i.test(output)) {
    output = /<\/body>/i.test(output) ? output.replace(/<\/body>/i, `${runtime}\n</body>`) : `${output}\n${runtime}`;
  }
  return output;
}

await walk(root);
let changed = 0;
for (const file of htmlFiles) {
  const source = await readFile(file, "utf8");
  const output = sanitizeHtml(source);
  if (output !== source) {
    await writeFile(file, output, "utf8");
    changed += 1;
  }
}

const runtime = `(() => {
  const message = "当前为静态展示版本，内容不会提交或发送。";
  function notify() {
    let notice = document.getElementById("static-site-notice");
    if (!notice) {
      notice = document.createElement("div");
      notice.id = "static-site-notice";
      notice.setAttribute("role", "status");
      Object.assign(notice.style, {
        position: "fixed", left: "50%", bottom: "32px", transform: "translateX(-50%)",
        zIndex: "2147483647", padding: "12px 20px", color: "#fff", background: "rgba(0,0,0,.82)",
        font: "14px/1.5 Arial, sans-serif", borderRadius: "3px", boxShadow: "0 4px 16px rgba(0,0,0,.22)",
        opacity: "0", transition: "opacity .2s ease", pointerEvents: "none"
      });
      document.body.appendChild(notice);
    }
    notice.textContent = message;
    notice.style.opacity = "1";
    clearTimeout(notice._timer);
    notice._timer = setTimeout(() => { notice.style.opacity = "0"; }, 2400);
  }
  document.addEventListener("submit", (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
    notify();
  }, true);
})();
`;
await writeFile(path.join(root, "static-runtime.js"), runtime, "utf8");
console.log(JSON.stringify({ htmlFiles: htmlFiles.length, changed, runtime: "static-runtime.js" }, null, 2));
