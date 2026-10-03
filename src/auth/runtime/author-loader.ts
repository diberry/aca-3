import {
  authorContractVersion,
  type AuthorManifest,
  type AuthorRuntimeModule,
} from "../../../packages/contracts/index.js";

type ModuleImporter = (entry: string) => Promise<unknown>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function parseAuthorManifest(value: unknown): AuthorManifest {
  if (
    !isRecord(value) ||
    value.schemaVersion !== 1 ||
    value.name !== "author" ||
    value.contractVersion !== authorContractVersion ||
    typeof value.entry !== "string" ||
    !value.entry.startsWith("/") ||
    value.entry.startsWith("//") ||
    typeof value.buildVersion !== "string"
  ) {
    throw new Error("Author manifest is invalid or incompatible.");
  }
  return value as unknown as AuthorManifest;
}

function parseAuthorModule(value: unknown): AuthorRuntimeModule {
  if (
    !isRecord(value) ||
    value.contractVersion !== authorContractVersion ||
    typeof value.mount !== "function"
  ) {
    throw new Error("Author runtime module is invalid or incompatible.");
  }
  return value as unknown as AuthorRuntimeModule;
}

const defaultImporter: ModuleImporter = (entry) => import(/* @vite-ignore */ entry);

export async function loadAuthorRuntime(
  fetcher: typeof fetch = fetch,
  importer: ModuleImporter = defaultImporter,
): Promise<{ readonly manifest: AuthorManifest; readonly module: AuthorRuntimeModule }> {
  const response = await fetcher("/mfe/author/manifest.json", {
    credentials: "same-origin",
    headers: {
      accept: "application/json",
    },
  });
  if (!response.ok) {
    throw new Error(`Author manifest returned HTTP ${response.status}.`);
  }

  const manifest = parseAuthorManifest(await response.json());
  const module = parseAuthorModule(await importer(manifest.entry));
  return { manifest, module };
}
