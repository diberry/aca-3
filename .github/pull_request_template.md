## Summary

Describe the change and the user or platform outcome.

## Scope

- [ ] The change is limited to the stated stage and does not pull in deferred behavior.
- [ ] Related ADRs and documentation are updated.

## Trust and security impact

Describe changes to public ingress, same-origin routes, identity, audiences, authorization,
secrets, dependencies, or workflow permissions. Write "None" only after checking each area.

## Validation

List the exact commands and results. Do not use success-shaped fallbacks.

## Rollback

Describe how to revert the change and any data, identity, or deployment considerations.

## Review checklist

- [ ] No secrets, tokens, raw auth headers, or credentials are committed.
- [ ] New GitHub Actions use immutable commit SHA pins and least privilege.
- [ ] Author and Backend remain internal unless an Accepted ADR explicitly changes the boundary.
