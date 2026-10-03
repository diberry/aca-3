import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { pathToFileURL } from "node:url";
import type { HelloResponse } from "../../packages/contracts/index.js";

const defaultHost = "127.0.0.1";
const defaultPort = 4300;

function sendJson(response: ServerResponse, statusCode: number, payload: unknown): void {
  response.writeHead(statusCode, {
    "cache-control": "no-store",
    "content-type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(payload));
}

function trustedUserName(request: IncomingMessage): string {
  const value = request.headers["x-aca-user-name"];
  if (typeof value !== "string") {
    return "Local user";
  }

  const sanitized = value
    .replace(/[\r\n]/g, "")
    .trim()
    .slice(0, 100);
  return sanitized || "Local user";
}

function handleRequest(request: IncomingMessage, response: ServerResponse): void {
  if (request.method !== "GET") {
    sendJson(response, 405, { error: "Method not allowed" });
    return;
  }

  const path = new URL(request.url ?? "/", "http://localhost").pathname;
  if (path === "/health") {
    sendJson(response, 200, { status: "ok" });
    return;
  }

  if (path === "/api/hello") {
    const user = trustedUserName(request);
    const payload: HelloResponse = {
      message: `Hello, ${user}. The backend is connected through the shell origin.`,
      user,
    };
    sendJson(response, 200, payload);
    return;
  }

  sendJson(response, 404, { error: "Not found" });
}

export function createBackendServer(): Server {
  return createServer((request, response) => {
    try {
      handleRequest(request, response);
    } catch (error) {
      console.error("Backend request failed", error);
      if (!response.headersSent) {
        sendJson(response, 500, { error: "Internal server error" });
      } else {
        response.end();
      }
    }
  });
}

export async function startBackendServer(
  port = Number(process.env.BACKEND_PORT ?? defaultPort),
  host = process.env.BACKEND_HOST ?? defaultHost,
): Promise<Server> {
  const server = createBackendServer();
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => {
      server.off("error", reject);
      resolve();
    });
  });
  return server;
}

const entryPath = process.argv[1];
if (entryPath && import.meta.url === pathToFileURL(entryPath).href) {
  const server = await startBackendServer();
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : defaultPort;
  console.log(`Backend listening on http://${defaultHost}:${port}`);
}
