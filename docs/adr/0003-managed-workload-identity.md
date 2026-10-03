# ADR 0003: Use managed workload identity with distinct audiences

- **Status:** Accepted
- **Date:** 2026-10-03

## Context

Internal Author and Backend services require caller authentication without distributing
long-lived service credentials or allowing one token audience to authorize unrelated services.

## Decision

Deployed service-to-service calls use managed workload identity. Author and Backend expose
distinct audiences, and each service validates issuer, intended audience, and authorized
caller. Caller-supplied trusted identity headers are removed and recreated from trusted
state. Local-only credentials are permitted only behind an explicit local-development gate
that fails closed in every deployed environment.

## Alternatives

- Share one internal audience. Rejected because it broadens token replay and privilege.
- Use client secrets. Rejected because secret distribution and rotation add avoidable risk.
- Trust forwarded browser identity headers. Rejected because callers can forge them.

## Consequences

Infrastructure and app configuration must preserve separate identities and audiences.
Negative identity and local-gate tests are required before Stage 0 exits.
