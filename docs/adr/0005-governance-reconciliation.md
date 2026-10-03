# ADR 0005: Reconcile governance sources selectively

- **Status:** Accepted
- **Date:** 2026-10-03

## Context

The governance package provides provenance and conservative agent rules. The adapted
platform tree adds repository-specific templates and workflow intent, but includes
placeholders, mutable Action tags, and automation whose prerequisites are absent.

## Decision

Use the governance package as the policy baseline and selectively adapt richer repository
assets. Replace placeholders with `@diberry`, configure pnpm and GitHub Actions Dependabot,
and implement one least-privilege validation workflow with immutable Action SHAs and a
production dependency audit.
Retain the source package manifest and checksum catalog for provenance. Keep modernization
agent behavior and policy documentation, but do not add or schedule modernization workflows
until credentials, `gh-aw`, a compiled lock workflow, billing controls, and manual validation exist.

## Alternatives

- Overlay either source tree. Rejected because both contain incompatible or incomplete assets.
- Omit governance until application code exists. Rejected because the foundation must be governed.

## Consequences

Deterministic CI is active immediately. Agentic modernization remains visibly deferred and
requires a separate governance decision and pull request.
