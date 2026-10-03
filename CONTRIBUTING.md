# Contributing

ACA-3 uses an always-green-main, test-driven development process.

Before implementing runtime behavior, read the
[wave delivery plan](docs/architecture/wave-plan.md). On a branch from current `origin/main`,
write a production-facing test, run it, and confirm that it fails for the expected reason.
Commit that test before writing the production implementation. Push the red commit to a
draft pull request and wait for the `test` check to record the expected failure.

Tests and implementation normally belong in the same pull request. A draft pull request may
be red while the new test is awaiting implementation, but the pull request must be green
before merge. Do not use test-only surrogate implementations, skipped tests, TODO tests,
expected failures, or success-shaped fallbacks to bypass the red-green-refactor cycle.

Record the failing-test commit, exact command, and expected failure reason in the pull request.
If an assertion changes during implementation, explain why and preserve the intended behavior.

Every pull request must also preserve the accepted architecture decisions, trust boundaries,
exact dependency pins, immutable GitHub Action pins, and required validation.

See [GitHub TDD enforcement](docs/operations/github-enforcement.md) for automated evidence
checks and repository configuration.
