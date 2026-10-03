# GitHub TDD enforcement

ACA-3 backs its pull request and test-driven development policies with required checks and
an idempotent repository configuration script.

## Enforcement model

The `Pull Request Policy` workflow runs two independent checks:

- `pr-description` requires nonempty Goal, Scope, Implementation steps, Risks and
  mitigations, and Validation criteria sections on every pull request.
- `tdd-policy` evaluates pull requests that change runtime paths under `src/`, `packages/`,
  or `infra/`.

The TDD check requires:

- a full failing-test commit SHA in the pull request body;
- a test change in that commit and no production implementation in the same commit;
- the failing-test commit to precede the first runtime implementation commit;
- a failed GitHub check named `test` on the failing-test commit;
- the exact red-step command and expected failure reason;
- no skipped, TODO, expected-failure, or x-prefixed tests in changed test files.

Documentation and governance pull requests without runtime path changes are exempt from
red-step evidence. All pull requests remain subject to normal validation.

To capture verifiable red-step evidence:

1. Branch from current `origin/main`.
2. Write and commit the production-facing test without production changes.
3. Push the commit and open a draft pull request.
4. Wait for the `test` check to fail for the expected reason.
5. Record that full commit SHA, the command, and failure reason in the pull request.
6. Implement the behavior in a later commit and make all required checks pass.

## Repository configuration

Both configuration scripts default to a dry run:

```text
pwsh ./scripts/configure-github.ps1
bash ./scripts/configure-github.sh
```

After the workflow exists on `main`, apply the configuration with one of:

```text
pwsh ./scripts/configure-github.ps1 -Apply
bash ./scripts/configure-github.sh --apply
```

The scripts inspect the repository owner type, visibility, reported account plan, rulesets
API, and classic branch protection API. Capability probes are authoritative when GitHub
does not expose a plan name. They then apply the maximum supported configuration:

1. Always configure squash-only merging and automatic branch deletion.
2. Prefer the `aca-main-protection` ruleset when rulesets are available.
3. Fall back to equivalent classic branch protection when that API is available.
4. If neither protection API is available, retain the supported repository settings and
   exit with an explicit partial-enforcement error.

Both protection modes require the `pr-description`, `test`, `validate`, and `tdd-policy`
checks, require pull requests and resolved review threads, block deletion and force pushes,
and require linear history. The default approval count is zero because the repository has
one maintainer. Use `-RequiredApprovingReviewCount` or `--review-count` when another
eligible reviewer is available.

Never apply protection before the workflow exists on `main`, because requiring a nonexistent
check can block all merges.

## Current plan limitation

As of October 3, 2026, GitHub returns HTTP 403 for rulesets and classic branch protection
on this private repository:

```text
Upgrade to GitHub Pro or make this repository public to enable this feature.
```

The workflow still reports policy violations on pull requests, but GitHub cannot make that
check merge-blocking on the current plan. In apply mode, the scripts can still configure
squash-only merging and automatic branch deletion, then exit nonzero to report that branch
protection remains unavailable. After the repository gains either protection capability,
run the dry run again and apply the strongest detected protection.
