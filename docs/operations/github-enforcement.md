# GitHub TDD enforcement

ACA-3 backs its test-driven development policy with a required pull request check and an
idempotent repository configuration script.

## Enforcement model

The `TDD Policy` workflow evaluates pull requests that change runtime paths under `src/`,
`packages/`, or `infra/`. It requires:

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

The scripts create or update the `aca-main-protection` ruleset, require the `test`,
`validate`, and `tdd-policy` checks, require pull requests and resolved review threads,
block deletion and force pushes, require linear history, enable squash-only merging, and
delete merged branches. The default approval count is zero because the repository has one
maintainer. Use `-RequiredApprovingReviewCount` or `--review-count` when another eligible
reviewer is available.

The apply operation checks ruleset availability before changing any setting. Never activate
the ruleset before the workflow exists on `main`, because requiring a nonexistent check can
block all merges.

## Current plan limitation

As of October 3, 2026, GitHub returns HTTP 403 for rulesets and classic branch protection
on this private repository:

```text
Upgrade to GitHub Pro or make this repository public to enable this feature.
```

The workflow still reports policy violations on pull requests, but GitHub cannot make that
check merge-blocking on the current plan. The scripts fail before mutation when this
capability is unavailable. After GitHub Pro is enabled or the repository becomes public,
run the dry run again and then apply the ruleset.
