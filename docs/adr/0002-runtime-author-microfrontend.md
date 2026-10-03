# ADR 0002: Run Author as a protected runtime microfrontend

- **Status:** Accepted
- **Date:** 2026-10-03

## Context

Author must be independently deployable without exposing protected remote assets directly
to the internet or requiring an Auth/Shell rebuild for every Author release.

## Decision

Author is a runtime microfrontend beginning in Stage 0. In deployed environments, browsers
retrieve its manifest, scripts, styles, and APIs only through authenticated, authorized,
same-origin Auth/Shell routes under `/mfe/author`. Author has no public ingress or public
environment-level route. The exact runtime-loading library is selected during Stage 0 and
must preserve these boundaries and versioned contracts.

## Alternatives

- Compile Author into the shell. Rejected because releases would be coupled.
- Use an iframe. Rejected because it complicates integrated UX and contract sharing.
- Expose Author assets publicly. Rejected because protected content would bypass the shell.

## Consequences

The shell owns authentication, authorization, proxy hardening, compatibility checks, and
failure isolation. Author can release independently only while honoring its versioned contract.
