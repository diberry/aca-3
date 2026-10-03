## Summary

Describe the change and the user or platform outcome.

## Scope

- [ ] The change is limited to the stated stage and does not pull in deferred behavior.
- [ ] Related ADRs and documentation are updated.

## Tests-first evidence

For runtime behavior or bug fixes:

- **Merged test contract PR:** <!-- URL -->
- **Test merge commit:** <!-- full SHA -->
- [ ] This implementation branch was created from `origin/main` after the test contract merged.
- [ ] Behavior assertions were already present on `main` and were not weakened in this PR.

For documentation, governance, or build maintenance with no runtime behavior change:

- [ ] A preceding test contract PR is not applicable because this change does not alter runtime behavior.

## Trust and security impact

Describe changes to public ingress, same-origin routes, identity, audiences, authorization,
secrets, dependencies, or workflow permissions. Write "None" only after checking each area.

## Validation

List the exact commands and results. Do not use success-shaped fallbacks.

## Rollback

Describe how to revert the change and any data, identity, or deployment considerations.

## Review checklist

- [ ] No secrets, tokens, raw auth headers, or credentials are committed.
- [ ] The tests-first merge gate in `docs/architecture/wave-plan.md` is satisfied.
- [ ] New GitHub Actions use immutable commit SHA pins and least privilege.
- [ ] Author and Backend remain internal unless an Accepted ADR explicitly changes the boundary.
