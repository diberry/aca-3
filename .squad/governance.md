# Squad Governance

## Source of Truth

Apply repository sources in this order:

1. Accepted decisions in `docs/adr/`.
2. Enforced contracts and security tests.
3. `docs/architecture/wave-plan.md`.
4. Other architecture and operations documentation.
5. Root manifests and lockfile.
6. Implementation.

Do not contradict an accepted ADR or enforced security contract. Propose a new ADR for intentional architecture changes; Stage Lead coordinates the decision, but does not waive it.

## Architecture and Security Boundaries

- Auth/Shell is the only public ingress. Protected browser traffic remains same-origin.
- Author and Backend remain internal. Never authorize based on hidden UI state.
- Strip caller-supplied identity headers and rebuild them from trusted server-side state; authorization remains server-side.
- Deployed Author and Backend calls use distinct managed-workload-identity audiences.
- Local credentials are permitted only behind an explicit local-development gate that fails closed outside local development.
- Do not provision Azure resources or introduce secrets before the authorized wave.

## Delivery Controls

- Keep `main` and merge-ready pull requests green. Branch from current `origin/main`.
- Starting with Wave 2 runtime behavior, write and observe a production-facing test fail for the expected reason before implementation; commit the failing test first.
- Never bypass TDD with skipped, TODO, expected-failure, surrogate, conditional-success, or success-shaped tests. Tests exercise production code directly.
- Keep direct dependencies and toolchains exact-pinned, the lockfile authoritative, and GitHub Actions pinned to full immutable SHAs.
- Pull request descriptions include nonempty Goal, Scope, Implementation steps, Risks and mitigations, and Validation criteria sections.
- Run the smallest focused test during development and `pnpm validate` plus affected container and security checks before merge.
- Keep secrets and credentials out of source, issues, logs, mock identities, and browser-visible contracts.

## Ownership and Review

- Every task has one directly responsible specialist. Stage Lead routes ambiguous or cross-boundary work.
- Security-sensitive changes are implemented by the appropriate domain specialist with Boundary Engineer review and Quality Steward validation.
- Grow the project-specific roster only when repeated work demonstrates a specialty the five founding agents cannot responsibly own.
- Scribe, Ralph, Rai, and Fact Checker are always-on support roles, not project specialists or routing destinations.
