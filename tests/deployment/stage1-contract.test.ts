import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseDocument } from "yaml";

function readRepositoryFile(file: string): string {
  const path = new URL(`../../${file}`, import.meta.url);
  expect(existsSync(path), `${file} must exist`).toBe(true);
  return readFileSync(path, "utf8");
}

describe("Stage 1 deployment contract", () => {
  it("deploys only Auth/Shell through azd", () => {
    const document = parseDocument(readRepositoryFile("azure.yaml"));
    expect(document.errors).toEqual([]);
    const config = document.toJS();

    expect(Object.keys(config.services)).toEqual(["auth"]);
    expect(config.services.auth).toMatchObject({
      host: "containerapp",
      project: ".",
      docker: {
        path: "src/auth/Containerfile",
        context: ".",
      },
    });
  });

  it("uses modular parameterized Bicep with no fixed cloud context", () => {
    const main = readRepositoryFile("infra/main.bicep");
    const parameters = readRepositoryFile("infra/main.parameters.json");
    const requiredModules = [
      "log-analytics.bicep",
      "container-apps-environment.bicep",
      "container-registry.bicep",
      "managed-identity.bicep",
      "key-vault.bicep",
      "role-assignments.bicep",
      "auth-shell-container-app.bicep",
    ];

    for (const module of requiredModules) {
      expect(main).toContain(`./modules/${module}`);
      expect(existsSync(new URL(`../../infra/modules/${module}`, import.meta.url))).toBe(true);
    }

    expect(main).toContain("targetScope = 'subscription'");
    expect(parameters).toContain("$" + "{AZURE_ENV_NAME}");
    expect(parameters).toContain("$" + "{AZURE_LOCATION}");
    expect(`${main}\n${parameters}`).not.toMatch(
      /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i,
    );
  });

  it("keeps Auth/Shell HTTPS-only and excludes Author and Backend resources", () => {
    const app = readRepositoryFile("infra/modules/auth-shell-container-app.bicep");
    const allBicep = [
      "infra/main.bicep",
      "infra/modules/container-apps-environment.bicep",
      "infra/modules/auth-shell-container-app.bicep",
    ]
      .map(readRepositoryFile)
      .join("\n");

    expect(app).toMatch(/external:\s*true/);
    expect(app).toMatch(/allowInsecure:\s*false/);
    expect(app).toContain("'azd-service-name': 'auth'");
    expect(allBicep).not.toMatch(/azd-service-name['"]?\s*:\s*['"](author|backend)['"]/i);
  });

  it("uses managed identity and hardened secret stores without secret outputs", () => {
    const app = readRepositoryFile("infra/modules/auth-shell-container-app.bicep");
    const registry = readRepositoryFile("infra/modules/container-registry.bicep");
    const vault = readRepositoryFile("infra/modules/key-vault.bicep");
    const roles = readRepositoryFile("infra/modules/role-assignments.bicep");
    const main = readRepositoryFile("infra/main.bicep");

    expect(app).toContain("UserAssigned");
    expect(registry).toMatch(/adminUserEnabled:\s*false/);
    expect(registry).not.toMatch(/anonymousPullEnabled:\s*true/);
    expect(vault).toMatch(/enableRbacAuthorization:\s*true/);
    expect(vault).toMatch(/enablePurgeProtection:\s*true/);
    expect(roles).toContain("AcrPull");
    expect(roles).toContain("Key Vault Secrets User");
    expect(main).not.toMatch(/output\s+\w*(secret|credential|password)\w*/i);
  });

  it("provides paired provider setup and rotation scripts without embedded identifiers", () => {
    const scripts = [
      "scripts/providers/configure-entra.ps1",
      "scripts/providers/configure-entra.sh",
      "scripts/providers/store-provider-secret.ps1",
      "scripts/providers/store-provider-secret.sh",
      "scripts/providers/rotate-entra-secret.ps1",
      "scripts/providers/rotate-entra-secret.sh",
    ];

    for (const script of scripts) {
      const source = readRepositoryFile(script);
      expect(source).not.toMatch(
        /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i,
      );
      expect(source).not.toMatch(/client[_-]?secret\s*=\s*["'][^"'$]/i);
      expect(source).not.toMatch(/(?:echo|write-(?:host|output))\s+["']?\$secret\b/i);
      expect(source).not.toMatch(/(?:set\s+-x|--debug)/i);
    }
  });
});
