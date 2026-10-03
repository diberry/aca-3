# ACA platform

This repository contains the Wave 0 monorepo foundation for an Azure Container Apps
platform. It establishes enforceable architecture, governance, and delivery boundaries
without implementing Stage 0 application behavior.

## Architecture

The public Auth/Shell service is the only internet-reachable application boundary. Author
is a runtime microfrontend from Stage 0 onward, but its manifest, assets, and APIs are
available to browsers only through authenticated and authorized same-origin Auth/Shell
routes. Backend services are internal. Service-to-service calls use managed workload
identity with distinct Author and Backend audiences.

Local development credentials may be introduced in Stage 0 only behind an explicit
`LOCAL_DEV_AUTH_ENABLED` gate that must fail closed outside a local environment. Wave 0
does not create credentials, app registrations, secrets, Azure resources, or runtime
routes.

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
| Biome | 2.5.14 |
| Vitest | 5.0.2 |

Node.js is pinned in `.node-version`, `.nvmrc`, and `package.json`. pnpm and every direct
dependency are exact-pinned. The lockfile is authoritative for transitive dependencies.

## Commands

```text
corepack enable
corepack prepare pnpm@12.7.0 --activate
pnpm install --frozen-lockfile
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm validate:workflows
pnpm validate
```

`pnpm validate` runs the complete Wave 0 repository validation. It does not contain
success-shaped fallbacks.

## Workspace layout

- `src/auth`: future public Auth/Shell boundary.
- `src/author`: future Author runtime microfrontend boundary.
- `src/backend`: future internal Backend boundary.
- `packages/contracts`: shared versioned boundary contracts.
- `packages/ui`: shared presentational types and components.
- `packages/auth-context`: browser-safe authenticated-user context types.
- `infra/modules`: future composable infrastructure modules.
- `tests`: integration, end-to-end, deployment, and security validation areas.
- `docs`: architecture, deployment, operations, provider, and ADR records.

## Wave 0 status

The repository foundation is implemented. Stage 0 behavior, deployment, identity setup,
and Azure provisioning remain intentionally unimplemented. Wave 0 exits only after the
gate in [the foundation architecture](docs/architecture/foundation.md) is satisfied and
the foundation pull request is approved and merged.
