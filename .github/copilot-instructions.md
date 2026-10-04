Preserve the Auth/Shell public boundary and same-origin protected routes. Author and Backend
remain internal and use distinct managed workload identity audiences. Do not add local
credential behavior without an explicit fail-closed local-only gate. Follow Accepted ADRs,
pin dependencies exactly, and pin Actions to full commit SHAs.

ACA-3 is an always-green-main, test-driven development repository. Branch from current
`origin/main`, write a production-facing test before production behavior, and run it to
confirm that it fails for the expected reason. Commit the failing test before the production
implementation. Tests and implementation normally merge together in one pull request.

A feature branch or draft pull request may temporarily be red, but `main` and the final
merge-ready pull request must remain green. Never use a test-only surrogate implementation,
skipped, TODO, expected-failure, conditional-success, or success-shaped tests to bypass the
red-green-refactor cycle. Tests must exercise production code directly. If an assertion must
change during implementation, explain the correction and do not weaken the intended behavior.
Follow `docs/architecture/wave-plan.md` for the complete workflow and evidence requirements.

When changing a user-facing page, route, or visible UI state, add or update the corresponding
Playwright browser test in `tests/e2e`. Keep screenshot baselines current for each covered
page/state: review visual changes and intentionally regenerate baselines with
`pnpm test:e2e:update-snapshots`; never update baselines automatically during validation.
Run `pnpm test:e2e` and review screenshot diffs before submitting UI changes. Follow
`tests/e2e/README.md` for viewing reports and the happy-path video.

Every pull request description must maintain nonempty `## Goal`, `## Scope`,
`## Implementation steps`, `## Risks and mitigations`, and `## Validation criteria`
sections. Keep them current as the implementation changes. State included and excluded scope,
record material risks with mitigations, and provide measurable validation criteria with exact
results. Do not treat a generated or initially populated description as complete without
reconciling it against the final diff and validation.
