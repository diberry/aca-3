# Wave delivery plan

## v1 sequence

| Wave | Stage | Outcome | Status |
|---|---|---|---|
| 0 | Foundation | Pinned monorepo, governance, trust boundaries, and delivery controls | Complete |
| 1 | Stage 0 | Local Auth/Shell loads Author and reaches Backend through one origin | Conditional Go - merge/tag pending |
| 2 | Stage 1 | Deployed public Auth/Shell with real social authentication | Planned |
| 3 | Stage 2 | Independently deployed internal Author runtime microfrontend | Planned |
| 4 | Stage 3 | Author reaches the internal Backend through managed workload identity | Planned |

Wave 1's implementation and validation gates are satisfied. Its
[Stage 0 acceptance record](stage-0-acceptance.md) documents a Conditional Go because the
completion pull request must merge before the baseline tag can identify the accepted record.
Do not advance to Wave 2 until annotated tag `v0.0.0-stage.0` exists on that merge commit.

The policy below applies to all new runtime behavior beginning with Wave 2.

## Test-driven development workflow

ACA-3 is an always-green-main, test-driven development repository. Tests must be written
and observed failing for the expected reason before the production behavior that makes
them pass is written. Tests and implementation normally merge together in one pull request.

Every behavior change uses this sequence:

1. **Red**
   - Branch directly from current `origin/main`.
   - Add a production-facing test before changing the production behavior.
   - Run the smallest relevant test command and confirm that the new assertion fails for
     the expected missing or incorrect behavior.
   - Commit the failing test before the implementation. A draft pull request may be red
     during this step; `main` must remain green.
   - Push the failing-test commit, open a draft pull request, and wait for its `test` check
     to record the expected failure before adding the implementation commit.
2. **Green**
   - Add the smallest production change that makes the new test pass.
   - Run the focused test and all directly affected validation.
3. **Refactor**
   - Improve the test and production code without changing the required behavior.
   - Run the complete required validation and make the pull request green.
4. **Merge**
   - Merge the tests and implementation together only after required checks pass.

Tests must exercise the production boundary directly. Do not create a surrogate implementation
or test-only reference fixture solely to make assertions pass before production exists.

If implementation reveals that an assertion or contract is wrong, correct it in the same
pull request and explain why. Do not weaken an assertion merely to accommodate the implementation.

## Green-main rules

- Do not merge deliberately failing tests into `main`.
- A feature branch or draft pull request may temporarily be red during the red step.
- The test commit must precede the production implementation commit.
- Do not use `skip`, `todo`, `test.fails`, broad error swallowing, conditional success, or
  placeholder assertions to bypass the red or green step.
- New tests must run against production code, not a duplicate implementation maintained for tests.
- Bug fixes follow the same sequence: reproduce the defect with a failing regression test,
  then implement the fix in the same pull request.
- Public API and contract changes include their corresponding test updates in the same pull request.
- Documentation-only, governance-only, and build-maintenance changes that do not alter runtime
  behavior do not require red-step evidence, but all existing validation remains mandatory.

A separate test pull request is appropriate only when it is independently useful and green
without surrogate production behavior, such as characterization tests for existing behavior,
a reusable test harness, or independently versioned contracts and schemas.

## Pull request evidence

A behavior pull request is not merge-ready without:

- the failing-test commit SHA;
- the exact focused test command and the expected reason it failed before implementation;
- confirmation that the test exercises production code;
- an explanation for any assertion changed after implementation began;
- all repository validation and security checks passing.

See [GitHub TDD enforcement](../operations/github-enforcement.md) for the required check and
repository configuration procedure.
