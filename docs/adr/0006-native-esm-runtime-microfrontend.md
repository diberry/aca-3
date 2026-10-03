# ADR 0006: Load Author from a native ESM runtime manifest

- **Status:** Accepted
- **Date:** 2026-10-03

## Context

ADR 0002 requires Author to be a runtime microfrontend but intentionally deferred the
loading mechanism to Stage 0. The first slice needs independent Author delivery without
introducing a framework-specific federation runtime before compatibility requirements are known.

## Decision

Author publishes a versioned JSON manifest and an ES module with a `mount` contract.
Auth/Shell fetches the manifest from `/mfe/author/manifest.json`, validates its schema,
contract version, and same-origin entry path, dynamically imports the module, and mounts it
inside a shell-owned error boundary. The development server and production build emit the
same contract with environment-appropriate entry paths.

## Alternatives

- Module Federation. Viable later, but rejected for Stage 0 because native ESM satisfies the
  current contract with less runtime and configuration complexity.
- Compile-time package import. Rejected because it couples shell and Author releases.
- Iframe. Rejected by ADR 0002.

## Consequences

Author bundles its own React runtime in Stage 0, making the remote larger but independently
executable. Shared dependency negotiation, signed manifests, and registry-driven discovery
remain later-stage decisions. The shell rejects absolute, protocol-relative, malformed, or
contract-incompatible manifest entries.
