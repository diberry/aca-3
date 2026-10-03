import { describe, expect, it, vi } from "vitest";
import { authorContractVersion } from "../../packages/contracts/index.js";
import { loadAuthorRuntime, parseAuthorManifest } from "../../src/auth/runtime/author-loader.js";

describe("Author runtime loader", () => {
  it("rejects cross-origin manifest entries", () => {
    expect(() =>
      parseAuthorManifest({
        schemaVersion: 1,
        name: "author",
        contractVersion: authorContractVersion,
        entry: "https://public.example/author.js",
        buildVersion: "test",
      }),
    ).toThrow(/invalid or incompatible/);
  });

  it("loads a compatible same-origin runtime module", async () => {
    const unmount = vi.fn();
    const mount = vi.fn(() => unmount);
    const fetcher = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          schemaVersion: 1,
          name: "author",
          contractVersion: authorContractVersion,
          entry: "/mfe/author/author.js",
          buildVersion: "test",
        }),
        { status: 200 },
      );
    });
    const importer = vi.fn(async () => ({ contractVersion: authorContractVersion, mount }));

    const runtime = await loadAuthorRuntime(fetcher, importer);

    expect(runtime.manifest.entry).toBe("/mfe/author/author.js");
    expect(importer).toHaveBeenCalledWith("/mfe/author/author.js");
    expect(runtime.module.mount).toBe(mount);
  });
});
