# Wave 0 foundation

## Source-of-truth hierarchy

When requirements conflict, use this order:

1. Accepted architecture decision records in `docs/adr`.
2. Enforced repository contracts and security tests.
3. Architecture and operations documentation in `docs`.
4. Root toolchain manifests and the pnpm lockfile.
5. Source implementation.
6. External source packages and build prompts as historical input only.

An ADR is required to intentionally change an accepted architectural decision. Generated
or copied content never overrides an ADR or an enforced security invariant.

## Wave 0 exit gate

Wave 0 exits only when all of the following are true:

- All five approved decisions have Accepted ADRs.
- The pinned Node.js and pnpm toolchain installs from the committed lockfile.
- Formatting, linting, type checking, tests, build, and workflow validation pass.
- CODEOWNERS, PR template, issue form, Dependabot, and the consolidated validation and security audit workflow are real.
- Every external Action reference uses a full immutable commit SHA.
- The trust-boundary diagram and same-origin, audience, and local-gate invariants are documented.
- Modernization automation is absent or disabled until every prerequisite is evidenced.
- The pull request is reviewed and merged without provisioning Azure resources or creating secrets.

Passing Wave 0 authorizes Stage 0 implementation planning; it does not claim that Stage 0
application behavior exists.
