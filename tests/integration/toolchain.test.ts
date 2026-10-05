import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseAllDocuments } from "yaml";

function readRepositoryFile(file: string): string {
  return readFileSync(new URL(`../../${file}`, import.meta.url), "utf8");
}

const manifest = JSON.parse(readRepositoryFile("package.json"));
const dependencyDocument = parseAllDocuments(readRepositoryFile("pnpm-lock.yaml"))[1];
if (!dependencyDocument) {
  throw new Error("The lockfile must contain the project dependency document.");
}
const lockfile = dependencyDocument.toJS();
const readme = readRepositoryFile("README.md");
const adr = readRepositoryFile("docs/adr/0004-pinned-monorepo-toolchain.md");
const biome = JSON.parse(readRepositoryFile("biome.json"));
const containerfiles = [
  "src/auth/Containerfile",
  "src/author/Containerfile",
  "src/backend/Containerfile",
];

describe("exact toolchain pins", () => {
  it.each([
    ["Biome", "@biomejs/biome"],
    ["Vitest", "vitest"],
  ])("keeps %s documentation and lockfile aligned with the manifest", (tool, dependency) => {
    const version = manifest.devDependencies[dependency];
    const locked = lockfile.importers["."].devDependencies[dependency];

    expect(locked.specifier).toBe(version);
    expect(locked.version.split("(")[0]).toBe(version);
    expect(readme).toContain(`| ${tool} | ${version} |`);
    expect(adr).toContain(`${tool} \`${version}\``);
  });

  it("uses the schema for the exact installed Biome version", () => {
    expect(biome.$schema).toBe(
      `https://biomejs.dev/schemas/${manifest.devDependencies["@biomejs/biome"]}/schema.json`,
    );
  });

  it("bootstraps pinned pnpm through the build registry", () => {
    for (const file of containerfiles) {
      const containerfile = readRepositoryFile(file);

      expect(containerfile).toContain(
        "ARG NPM_REGISTRY=https://packagefeedproxy.microsoft.io/npm/",
      );
      expect(containerfile).toContain(
        `RUN npm install --global pnpm@${manifest.engines.pnpm} --registry=$NPM_REGISTRY`,
      );
      expect(containerfile).toContain(
        "RUN pnpm install --frozen-lockfile --registry=$NPM_REGISTRY",
      );
      expect(containerfile).not.toContain("corepack prepare");
    }
  });
});
