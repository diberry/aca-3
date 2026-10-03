## Goal

<!-- Describe the measurable user, platform, or repository outcome. -->

## Scope

### Included

<!-- List the work included in this pull request. -->

### Excluded

<!-- List deferred or intentionally excluded work. -->

## Implementation steps

<!-- List the ordered implementation steps completed by this pull request. -->

## Risks and mitigations

<!-- Identify material risks and their mitigations. If none, explain why. -->

## Validation criteria

<!-- List measurable acceptance criteria and the exact commands or checks proving each result. -->

## Test-driven development evidence

For runtime behavior or bug fixes:

- **Behavior under test:** <!-- concise description -->
- **Failing-test commit:** <!-- full SHA; must precede the implementation commit -->
- **Red-step command:** <!-- exact command -->
- **Expected failure reason:** <!-- what failed before implementation and why -->
- [ ] The test was written and observed failing before the production implementation.
- [ ] The test exercises production code directly, without a test-only surrogate implementation.
- [ ] Assertions were not weakened to accommodate the implementation, or changes are explained below.

**Assertion changes after implementation began:** <!-- None, or explain why the test was corrected -->

For documentation, governance, or build maintenance with no runtime behavior change:

- [ ] Red-step evidence is not applicable because this change does not alter runtime behavior.

## Trust and security impact

Describe changes to public ingress, same-origin routes, identity, audiences, authorization,
secrets, dependencies, or workflow permissions. Write "None" only after checking each area.

## Rollback

Describe how to revert the change and any data, identity, or deployment considerations.

## Review checklist

- [ ] The change is limited to the stated stage and does not pull in deferred behavior.
- [ ] Related ADRs and documentation are updated.
- [ ] No secrets, tokens, raw auth headers, or credentials are committed.
- [ ] The test-driven development workflow in `docs/architecture/wave-plan.md` is satisfied.
- [ ] New GitHub Actions use immutable commit SHA pins and least privilege.
- [ ] Author and Backend remain internal unless an Accepted ADR explicitly changes the boundary.
