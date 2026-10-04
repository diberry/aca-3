# ACA platform

This repository contains the ACA platform foundation and Stage 0 local vertical slice.
One command starts a public-boundary shell that loads the Author runtime microfrontend and
calls the Backend through same-origin routes.

## Architecture

The public Auth/Shell service is the only internet-reachable application boundary. Author
is a runtime microfrontend from Stage 0 onward, but its manifest, assets, and APIs are
available to browsers only through authenticated and authorized same-origin Auth/Shell
routes. Backend services are internal. Service-to-service calls use managed workload
identity with distinct Author and Backend audiences.

Stage 0 uses a non-secret mock user only behind the explicit `LOCAL_DEV_AUTH_ENABLED` and
`ACA_ENVIRONMENT=local` gates. The stack refuses to start the mock identity in any other
environment. No credentials, app registrations, secrets, or Azure resources are created.

See [the trust-boundary diagram](docs/architecture/trust-boundaries.md) and
[the foundation architecture](docs/architecture/foundation.md).

## Development policy

ACA-3 is an always-green-main, test-driven development repository. Beginning with Wave 2,
contributors write and observe a production-facing test failing before implementing the
behavior. The test commit precedes the implementation commit, and both normally merge in
one green pull request after the red-green-refactor cycle is complete.

See the [wave delivery plan and test-driven workflow](docs/architecture/wave-plan.md) and
[contribution instructions](CONTRIBUTING.md). The
[GitHub enforcement guide](docs/operations/github-enforcement.md) documents the required
policy check and idempotent repository configuration scripts.

## v1 stages

v1 is limited to Stages 0 through 3:

1. **Stage 0:** local shell, Author runtime microfrontend, and backend vertical slice.
2. **Stage 1:** deployed public Auth/Shell with real social authentication.
3. **Stage 2:** independently deployed internal Author microfrontend through same-origin routes.
4. **Stage 3:** Author calls an internal backend through the trusted service boundary.

Later-stage registry, multi-feature, tenant, agent, and production-scale capabilities are
not part of v1.

## Toolchain

| Tool | Exact version |
|---|---:|
| Node.js LTS (Krypton) | 24.21.0 |
| pnpm | 12.7.0 |
| TypeScript | 7.0.2 |
| React / React DOM | 19.3.0 |
| Biome | 2.5.15 |
| Vitest | 5.0.3 |

Node.js is pinned in `.node-version`, `.nvmrc`, and `package.json`. pnpm and every direct
dependency are exact-pinned. The lockfile is authoritative for transitive dependencies.

## Commands

```text
corepack enable
corepack prepare pnpm@12.7.0 --activate
pnpm install --frozen-lockfile
pnpm dev
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm smoke
pnpm test:e2e:install
pnpm test:e2e
pnpm validate:workflows
pnpm validate
```

`pnpm validate` runs formatting, linting, type checking, unit and integration tests,
production builds, workflow validation, and the real local-stack smoke test. It does not
contain success-shaped fallbacks.

Browser tests, screenshot baseline updates, visual diff review, video access, and PR
verification are documented in the [Playwright browser test guide](tests/e2e/README.md).

## Workspace layout

- `src/auth`: local public Auth/Shell boundary and same-origin proxies.
- `src/author`: runtime Author microfrontend and manifest.
- `src/backend`: internal Backend health and hello endpoints.
- `packages/contracts`: shared versioned boundary contracts.
- `packages/ui`: shared presentational types and components.
- `packages/auth-context`: browser-safe authenticated-user context types.
- `infra/modules`: future composable infrastructure modules.
- `tests`: integration, end-to-end, deployment, and security validation areas.
- `docs`: architecture, deployment, operations, provider, and ADR records.

## Wave status

- **Wave 0:** Complete and merged.
- **Wave 1 / Stage 0:** Local shell, Author runtime microfrontend, Backend, local auth gate,
  header hardening, safe fallbacks, container definitions, automated tests, and smoke
  validation are implemented. This is local implementation readiness, not final stage
  completion. The
  [Stage 0 acceptance record](docs/architecture/stage-0-acceptance.md) records a Conditional
  Go pending evidence and ownership for the mandatory global prerequisites, final reviewer
  acceptance, and creation of the baseline tag.
- **Deferred:** Azure provisioning, real identity providers, managed identities, public
  deployment, and Stages 1–3. Stage 1 remains blocked by the open Stage 0 conditions.

See [Stage 0 architecture](docs/architecture/stage-0-local.md) and
[local development operations](docs/operations/local-development.md).
