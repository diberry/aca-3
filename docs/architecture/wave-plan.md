# Wave delivery plan

## v1 sequence

| Wave | Stage | Outcome | Status |
|---|---|---|---|
| 0 | Foundation | Pinned monorepo, governance, trust boundaries, and delivery controls | Complete |
| 1 | Stage 0 | Local Auth/Shell loads Author and reaches Backend through one origin | In review |
| 2 | Stage 1 | Deployed public Auth/Shell with real social authentication | Planned |
| 3 | Stage 2 | Independently deployed internal Author runtime microfrontend | Planned |
| 4 | Stage 3 | Author reaches the internal Backend through managed workload identity | Planned |

Wave 1 was already implemented before the tests-first merge policy was adopted. It is the
last wave allowed to combine new assertions and production behavior in one pull request.
The policy below applies to all new runtime behavior beginning with Wave 2.

## Tests-first merge gate

ACA-3 is an always-green, test-driven development repository. Tests that define a behavior
must be merged into `main` before production code that is exercised by those tests can be merged.

Every behavior change uses two pull requests in this order:

1. **Test contract pull request**
   - Branch directly from current `origin/main`.
   - Add the executable contract, assertions, fixtures, and test harness.
   - Do not add the production implementation.
   - Demonstrate that the contract can detect an invalid reference fixture.
   - Keep `main` green by running the contract against a test-only reference fixture when
     production binding does not exist yet.
   - Merge this pull request before creating the implementation branch.
2. **Implementation pull request**
   - Fetch the test merge and branch from the updated `origin/main`.
   - Bind the already-merged contract suite to the production implementation.
   - Do not weaken, skip, or rewrite the merged assertions.
   - Make the existing contract, security, integration, smoke, and build checks pass.
   - Reference the merged test pull request and merge commit.

If implementation reveals that an assertion or contract is wrong, stop implementation.
Correct and merge the test contract in a separate pull request first, update from `main`,
and then continue the implementation.

## Green-main rules

- Do not merge deliberately failing tests into `main`.
- Do not use `skip`, `todo`, `test.fails`, broad error swallowing, conditional success, or
  placeholder assertions to make a test contract pull request pass.
- Test-only reference fixtures must be clearly named and must never be imported by production code.
- Implementation pull requests may add production test adapters or suite registration, but
  the behavior assertions must already exist on `main`.
- Bug fixes follow the same sequence: merge a reproducing regression contract first, then
  branch from updated `main` and implement the fix.
- Documentation-only, governance-only, and build-maintenance changes that do not alter runtime
  behavior do not require a preceding test contract pull request, but all existing validation
  remains mandatory.

## Pull request evidence

A behavior implementation pull request is not merge-ready without:

- the URL and merge commit of the preceding test contract pull request;
- evidence that the implementation branch contains that merge;
- the unchanged merged assertions running against production code;
- all repository validation and security checks passing.
