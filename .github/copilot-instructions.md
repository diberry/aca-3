Preserve the Auth/Shell public boundary and same-origin protected routes. Author and Backend
remain internal and use distinct managed workload identity audiences. Do not add local
credential behavior without an explicit fail-closed local-only gate. Follow Accepted ADRs,
pin dependencies exactly, and pin Actions to full commit SHAs.

ACA-3 is an always-green, test-driven development repository. Before writing production
behavior, confirm that its executable contract and assertions already exist on `main`.
Behavior work must use two pull requests: merge the green test contract first, then fetch
that merge and create the implementation branch from updated `origin/main`.

Never combine new behavior assertions with the production implementation. Never use skipped,
TODO, expected-failure, conditional-success, or success-shaped tests to satisfy the tests-first
gate. Test-only reference fixtures may keep the contract pull request green, but production
code must not import them. If an assertion must change during implementation, stop and merge
the corrected test contract separately before continuing. Follow
`docs/architecture/wave-plan.md` for the complete gate and evidence requirements.
