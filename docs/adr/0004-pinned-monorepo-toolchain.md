# ADR 0004: Pin the monorepo toolchain exactly

- **Status:** Accepted
- **Date:** 2026-10-03

## Context

The platform needs reproducible local and CI behavior across independently evolving
applications and shared packages.

## Decision

The original decision used a pnpm workspace with Node.js `24.21.0` LTS (Krypton), pnpm `12.7.0`,
TypeScript `7.0.2`, React and React DOM `19.3.0`, Biome `2.5.14`, and Vitest
`5.0.2`. Exact versions were resolved on 2026-10-03 from the official Node.js release
index and npm registry metadata. Direct dependencies use exact versions and the pnpm
lockfile pins transitive dependencies.

### Amendment: reviewed dependency update (2026-10-03)

[Dependency PR #2](https://github.com/diberry/aca-3/pull/2) updated the exact pins to
Biome `2.5.15` and Vitest `5.0.3`, superseding only those two versions in the original
decision. `package.json` is authoritative for current direct dependency versions;
`pnpm-lock.yaml`, the README toolchain table, and the Biome schema URL must agree with it
where applicable. The original decision date and exact-pin policy remain unchanged.

## Alternatives

- Use floating ranges. Rejected because installs could change without review.
- Use npm workspaces. Viable, but pnpm was selected for strict, efficient monorepo installs.
- Use the newest non-LTS Node.js release. Rejected in favor of the current maintained LTS.

## Consequences

Upgrades require reviewed manifest, runtime pin, lockfile, and CI changes. Engine enforcement
causes mismatched local runtimes to fail installation rather than silently diverge.
