# Contributing

ACA-3 uses an always-green, tests-first merge process.

Before implementing runtime behavior, read the
[wave delivery plan](docs/architecture/wave-plan.md). Merge the executable test contract
into `main` first, update from `origin/main`, and only then create the implementation branch.

Do not combine new behavior assertions and the production implementation in one pull request.
Do not bypass the sequence with skipped, TODO, expected-failure, or success-shaped tests.

Every pull request must also preserve the accepted architecture decisions, trust boundaries,
exact dependency pins, immutable GitHub Action pins, and required validation.
