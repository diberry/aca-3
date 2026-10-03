import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";

const root = path.resolve(process.argv[2] ?? ".");
const port = Number(process.env.PORT ?? process.argv[3] ?? 8080);
const prefix = process.env.STATIC_URL_PREFIX ?? "";
const spaFallback = process.env.SPA_FALLBACK === "true";

const contentTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml"],
]);

function resolveRequestPath(url) {
  const pathname = decodeURIComponent(new URL(url, "http://localhost").pathname);
  if (prefix && !pathname.startsWith(`${prefix}/`) && pathname !== prefix) {
    return null;
  }
  const stripped = prefix && pathname.startsWith(prefix) ? pathname.slice(prefix.length) : pathname;
  const relative =
    stripped === "/" || stripped === "" ? "index.html" : stripped.replace(/^\/+/, "");
  const resolved = path.resolve(root, relative);
  return resolved.startsWith(`${root}${path.sep}`) || resolved === root ? resolved : null;
}

const server = createServer(async (request, response) => {
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405).end("Method not allowed");
    return;
  }

  let filePath = resolveRequestPath(request.url ?? "/");
  try {
    if (!filePath || !(await stat(filePath)).isFile()) {
      filePath = spaFallback ? path.join(root, "index.html") : null;
    }
    if (!filePath) {
      response.writeHead(404).end("Not found");
      return;
    }
    response.writeHead(200, {
      "content-type": contentTypes.get(path.extname(filePath)) ?? "application/octet-stream",
      "x-content-type-options": "nosniff",
    });
    if (request.method === "HEAD") {
      response.end();
      return;
    }
    createReadStream(filePath).pipe(response);
  } catch {
    response.writeHead(404).end("Not found");
  }
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Static content listening on port ${port}`);
});
