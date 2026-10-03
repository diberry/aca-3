import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { createBackendServer } from "../../src/backend/server.js";

const servers: ReturnType<typeof createBackendServer>[] = [];

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise<void>((resolve, reject) => {
          server.close((error) => (error ? reject(error) : resolve()));
        }),
    ),
  );
});

async function startBackend() {
  const server = createBackendServer();
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address() as AddressInfo;
  return `http://127.0.0.1:${address.port}`;
}

describe("backend", () => {
  it("serves health and personalized hello responses", async () => {
    const origin = await startBackend();

    await expect(fetch(`${origin}/health`).then((response) => response.json())).resolves.toEqual({
      status: "ok",
    });

    const response = await fetch(`${origin}/api/hello`, {
      headers: { "x-aca-user-name": "Integration Author" },
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      message: "Hello, Integration Author. The backend is connected through the shell origin.",
      user: "Integration Author",
    });
  });

  it("returns safe errors without stack details", async () => {
    const origin = await startBackend();
    const response = await fetch(`${origin}/missing`);
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Not found" });
  });
});
