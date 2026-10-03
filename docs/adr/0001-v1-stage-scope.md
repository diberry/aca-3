# ADR 0001: Limit v1 to Stages 0 through 3

- **Status:** Accepted
- **Date:** 2026-10-03

## Context

The source architecture describes a longer staged platform program. v1 needs a bounded
outcome that proves the public shell, runtime Author microfrontend, authentication, and
internal backend trust path before adding registry, multi-feature, tenant, or agent capabilities.

## Decision

v1 includes Stages 0, 1, 2, and 3 only. Work from Stage 4 onward requires a later scope
decision and must not be pulled into v1 unless required to preserve a safe upgrade path.

## Alternatives

- Deliver only Stage 0. Rejected because it would not validate the deployed identity boundary.
- Include the complete staged platform. Rejected because it increases risk and delays evidence.

## Consequences

The v1 backlog and exit evidence remain focused. Registry, additional feature packs,
tenant boundaries, agent capabilities, and production-scale governance are explicitly deferred.
