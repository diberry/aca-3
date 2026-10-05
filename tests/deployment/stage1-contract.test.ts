import { chmodSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { delimiter, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";
import { parseDocument } from "yaml";

function readRepositoryFile(file: string): string {
  const path = new URL(`../../${file}`, import.meta.url);
  expect(existsSync(path), `${file} must exist`).toBe(true);
  return readFileSync(path, "utf8");
}

const testDirectories: string[] = [];

afterEach(() => {
  for (const directory of testDirectories.splice(0)) {
    rmSync(directory, { force: true, recursive: true });
  }
});

function createAzRecorder(options: { failKeyVault?: boolean } = {}) {
  const directory = mkdtempSync(resolve("tests/deployment/.mock-az-"));
  testDirectories.push(directory);
  const executable = resolve(directory, "az");
  const log = resolve(directory, "calls.jsonl");
  const state = resolve(directory, "state");
  writeFileSync(
    executable,
    `#!/usr/bin/env sh
mock_directory=$(dirname "$0")
mock_log="$mock_directory/calls.jsonl"
mock_state="$mock_directory/state"
previous=
for argument in "$@"; do
  if [ "$previous" = "--value" ]; then
    printf "<redacted>\\t" >> "$mock_log"
  else
    printf "%s\\t" "$argument" >> "$mock_log"
  fi
  previous=$argument
done
printf "\\n" >> "$mock_log"
case "$1 $2 $3" in
  "keyvault secret show")
    while [ "$#" -gt 0 ]; do
      if [ "$1" = "--name" ]; then
        shift
        printf "https://vault.invalid/secrets/%s/version\\n" "$1"
        break
      fi
      shift
    done
    ;;
  "ad app credential")
    if [ "$4" = "list" ]; then
      if [ -f "$mock_state" ]; then printf "prior-key\\nnew-key\\n"; else printf "prior-key\\n"; fi
    elif [ "$4" = "reset" ]; then
      printf "created" > "$mock_state"
      printf "test-value-not-a-real-secret\\n"
    fi
    ;;
  "keyvault secret set")
    if [ -f "$mock_directory/fail-keyvault" ]; then exit 9; fi
    ;;
esac
`,
  );
  writeFileSync(
    resolve(directory, "mock-az.mjs"),
    `#!/usr/bin/env node
import { appendFileSync, existsSync, writeFileSync } from "node:fs";
const args = process.argv.slice(2);
const recorded = args.map((value, index) => args[index - 1] === "--value" ? "<redacted>" : value);
appendFileSync(process.env.MOCK_AZ_LOG, recorded.join("\\t") + "\\t\\n");
const command = args.slice(0, 4).join(" ");
if (command.startsWith("keyvault secret show")) {
  const name = args[args.indexOf("--name") + 1];
  process.stdout.write("https://vault.invalid/secrets/" + name + "/version\\n");
} else if (command.startsWith("ad app credential list")) {
  process.stdout.write(existsSync(process.env.MOCK_AZ_STATE) ? "prior-key\\nnew-key\\n" : "prior-key\\n");
} else if (command.startsWith("ad app credential reset")) {
  writeFileSync(process.env.MOCK_AZ_STATE, "created");
  process.stdout.write("test-value-not-a-real-secret\\n");
} else if (process.env.MOCK_AZ_FAIL_KEYVAULT === "yes" && command.startsWith("keyvault secret set")) {
  process.exitCode = 9;
}
`,
  );
  chmodSync(executable, 0o755);
  writeFileSync(resolve(directory, "az.cmd"), `@node "%~dp0\\mock-az.mjs" %*\r\n`);
  if (options.failKeyVault === true) {
    writeFileSync(resolve(directory, "fail-keyvault"), "fail");
  }
  return {
    env: {
      ...process.env,
      MOCK_AZ_LOG: log,
      MOCK_AZ_STATE: state,
      MOCK_AZ_FAIL_KEYVAULT: options.failKeyVault === true ? "yes" : "no",
      PATH: `${directory}${delimiter}${process.env.PATH ?? ""}`,
    },
    calls: () =>
      existsSync(log)
        ? readFileSync(log, "utf8")
            .trim()
            .split(/\r?\n/)
            .filter(Boolean)
            .map((line) => line.split("\t").filter(Boolean))
        : [],
  };
}

function runPowerShell(script: string, args: string[], env: NodeJS.ProcessEnv) {
  return spawnSync("pwsh", ["-NoLogo", "-NoProfile", "-File", resolve(script), ...args], {
    encoding: "utf8",
    env,
  });
}

function runShell(script: string, args: string[], env: NodeJS.ProcessEnv) {
  return spawnSync("bash", [script.replaceAll("\\", "/"), ...args], {
    encoding: "utf8",
    env,
  });
}

function expectAuthCalls(calls: string[][]) {
  const providers = [
    ["microsoft", "entra-provider-secret"],
    ["google", "google-provider-secret"],
    ["github", "github-provider-secret"],
  ];
  for (const [provider, secretName] of providers) {
    const call = calls.find(
      (args) =>
        args[0] === "containerapp" &&
        args[1] === "auth" &&
        args[2] === provider &&
        args[3] === "update",
    );
    expect(call, `missing ${provider} auth update`).toBeDefined();
    if (!call) {
      throw new Error(`missing ${provider} auth update`);
    }
    expect(call).toContain("--client-secret-name");
    expect(call[call.indexOf("--client-secret-name") + 1]).toBe(secretName);
    expect(call).not.toContain("--client-secret-setting-name");
  }
}

function expectOnlyNewCredentialDeleted(calls: string[][]) {
  const deletes = calls.filter(
    (args) =>
      args[0] === "ad" && args[1] === "app" && args[2] === "credential" && args[3] === "delete",
  );
  expect(deletes).toHaveLength(1);
  expect(deletes[0]).toContain("new-key");
  expect(deletes[0]).not.toContain("prior-key");
}

describe("Stage 1 deployment contract", () => {
  it("deploys only Auth/Shell through azd", () => {
    const document = parseDocument(readRepositoryFile("azure.yaml"));
    expect(document.errors).toEqual([]);
    const config = document.toJS();

    expect(Object.keys(config.services)).toEqual(["auth"]);
    expect(config.services.auth).toMatchObject({
      host: "containerapp",
      language: "js",
      project: ".",
      docker: {
        path: "src/auth/Containerfile",
        context: ".",
        remoteBuild: true,
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
    expect(main).toContain(
      "output AZURE_AUTH_IDENTITY_RESOURCE_ID string = managedIdentity.outputs.id",
    );
  });

  it("provides paired provider setup and rotation scripts without embedded identifiers", () => {
    const scripts = [
      "scripts/providers/configure-entra.ps1",
      "scripts/providers/configure-entra.sh",
      "scripts/providers/store-provider-secret.ps1",
      "scripts/providers/store-provider-secret.sh",
      "scripts/providers/rotate-entra-secret.ps1",
      "scripts/providers/rotate-entra-secret.sh",
      "scripts/providers/configure-container-auth.ps1",
      "scripts/providers/configure-container-auth.sh",
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

  it("constructs the supported Container Apps auth arguments in both scripts", () => {
    const shellRecorder = createAzRecorder();
    const shellResult = runShell(
      "scripts/providers/configure-container-auth.sh",
      [
        "resource-group",
        "container-app",
        "identity-id",
        "vault",
        "tenant",
        "entra",
        "google",
        "github",
      ],
      shellRecorder.env,
    );
    expect(shellResult.stderr).toBe("");
    expect(shellResult.status).toBe(0);
    expectAuthCalls(shellRecorder.calls());

    const powerShellRecorder = createAzRecorder();
    const powerShellResult = runPowerShell(
      "scripts/providers/configure-container-auth.ps1",
      [
        "-ResourceGroup",
        "resource-group",
        "-ContainerApp",
        "container-app",
        "-ManagedIdentityResourceId",
        "identity-id",
        "-VaultName",
        "vault",
        "-TenantId",
        "tenant",
        "-EntraClientId",
        "entra",
        "-GoogleClientId",
        "google",
        "-GitHubClientId",
        "github",
      ],
      powerShellRecorder.env,
    );
    expect(powerShellResult.stderr).toBe("");
    expect(powerShellResult.status).toBe(0);
    expectAuthCalls(powerShellRecorder.calls());
  });

  it.each([
    {
      name: "POSIX configure",
      run: (env: NodeJS.ProcessEnv) =>
        runShell(
          "scripts/providers/configure-entra.sh",
          ["display-name", "https://app.invalid/.auth/login/aad/callback", "vault", "application"],
          env,
        ),
    },
    {
      name: "PowerShell configure",
      run: (env: NodeJS.ProcessEnv) =>
        runPowerShell(
          "scripts/providers/configure-entra.ps1",
          [
            "-DisplayName",
            "display-name",
            "-RedirectUri",
            "https://app.invalid/.auth/login/aad/callback",
            "-VaultName",
            "vault",
            "-ApplicationId",
            "application",
          ],
          env,
        ),
    },
    {
      name: "POSIX rotation",
      run: (env: NodeJS.ProcessEnv) =>
        runShell("scripts/providers/rotate-entra-secret.sh", ["application", "vault"], env),
    },
    {
      name: "PowerShell rotation",
      run: (env: NodeJS.ProcessEnv) =>
        runPowerShell(
          "scripts/providers/rotate-entra-secret.ps1",
          ["-ApplicationId", "application", "-VaultName", "vault"],
          env,
        ),
    },
  ])(
    "$name revokes only its newly created credential when Key Vault ingestion fails",
    ({ run }) => {
      const recorder = createAzRecorder({ failKeyVault: true });
      const result = run(recorder.env);
      expect(result.status).not.toBe(0);
      expectOnlyNewCredentialDeleted(recorder.calls());
    },
  );

  it("rejects non-interactive POSIX provider-secret input before invoking Azure CLI", () => {
    const recorder = createAzRecorder();
    const result = runShell(
      "scripts/providers/store-provider-secret.sh",
      ["google", "vault"],
      recorder.env,
    );
    expect(result.status).toBe(2);
    expect(result.stderr).toContain("requires an interactive terminal");
    expect(recorder.calls()).toEqual([]);

    const source = readRepositoryFile("scripts/providers/store-provider-secret.sh");
    expect(source).toMatch(/terminal_state=\$\(stty -g < \/dev\/tty\)/);
    expect(source).toMatch(/cleanup\(\)[\s\S]*stty "\$terminal_state" < \/dev\/tty/);
  });
});
