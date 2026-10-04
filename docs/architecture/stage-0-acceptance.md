# Stage 0 acceptance record

## Decision

**Conditional Go**, assessed on 2026-10-04 against repository commit
`9ba4c8b2811376d24a0ebb1c028c0ccd41565aa7`.

Stage 0's local working-app, trust-boundary, automated-validation, container-build, browser,
documentation, and rollback-note requirements have evidence. This establishes local
implementation readiness; it does not establish that Stage 0 is fully complete. The source
checklist makes the global prerequisites a dependency of Stage 0, and the required ownership
and evidence for those prerequisites are not present in the repository or this pull request.
The baseline tag is also open.

Do not record a final Go, create the Stage 0 baseline tag, or begin Stage 1 implementation until
every condition in [Open Conditional Go conditions](#open-conditional-go-conditions) has
verifiable evidence.

## Scope and sources

This record closes repository Wave 1, which implements the PDF checklist's **Stage 0 -
Repository, Local Vertical Slice, and Delivery Foundation**. It uses:

- the accepted ADRs and architecture and operations documentation in this repository;
- merged pull requests [#1](https://github.com/diberry/aca-3/pull/1),
  [#3](https://github.com/diberry/aca-3/pull/3),
  [#7](https://github.com/diberry/aca-3/pull/7), and
  [#9](https://github.com/diberry/aca-3/pull/9);
- the successful hosted checks attached to those pull requests; and
- the local validation recorded below.

The source PDF itself is not committed because it is an external, classified input. This
record restates only the Stage 0 checklist areas and acceptance criteria needed to audit the
decision.

## Open Conditional Go conditions

The absence of Azure resources or secrets is appropriate for the local implementation, but it
does not make the checklist's mandatory global prerequisites not applicable. No owner or
verifiable evidence was found for the following conditions; `Unassigned` means this assessment
does not infer an owner.

| Required condition | Status | Owner | Evidence needed to close |
|---|---|---|---|
| Azure subscription, deployment region, and required permissions | Unresolved - no verifiable evidence | Unassigned | Identify the subscription and approved region without recording sensitive values, and provide evidence that the deployment operator has the required roles or an approved access path. |
| Microsoft Entra tenant ownership | Unresolved - no verifiable evidence | Unassigned | Identify the accountable tenant owner and provide a durable approval or ownership record for the tenant used by ACA-3. |
| Authentication-provider application ownership | Unresolved - no verifiable evidence | Unassigned | Name the accountable owners for the Microsoft, Google, and GitHub provider applications and provide registration or approved provisioning evidence. |
| Secret-management ownership | Unresolved - no verifiable evidence | Unassigned | Name the owner and approved secret store, access, rotation, and revocation process. Do not add secret values to this repository. |
| Environment promotion path | Unresolved - no verifiable evidence | Unassigned | Document the approved environments, promotion authority, gates, and rollback path from local development through the first Azure environment. |
| Required tooling | Partially evidenced for local work; unresolved for Azure work | Unassigned | The pinned Node.js and pnpm toolchain is verified locally. Identify and verify the additional approved tooling and access needed to provision, deploy, inspect, and roll back Stage 1. |
| Stage 0 completion record and baseline tag | Record pending merge; tag not created | Unassigned | Merge an acceptance record that cites evidence for every condition above, then have an authorized maintainer create annotated tag `v0.0.0-stage.0` on that final accepted commit and verify that it resolves correctly. |

## Stage 0 checklist evidence

| Checklist area | Result | Evidence |
|---|---|---|
| Prerequisites and decisions | Conditional | The package manager and exact local toolchain are pinned in `package.json`, `.node-version`, `.nvmrc`, and `pnpm-lock.yaml`. ADR 0002 and ADR 0006 select the runtime Author mechanism; `docs/architecture/stage-0-local.md` defines ports and proxy paths; `packages/contracts`, `packages/ui`, and `packages/auth-context` establish package boundaries. PRs #1 and #7 merged the foundation and reconciled its pins. The mandatory global prerequisites listed above remain unresolved. |
| Infrastructure and deployment foundation | Satisfied for the local stage | The repository contains the application, package, infrastructure, script, documentation, and test areas. `src/auth/Containerfile`, `src/author/Containerfile`, and `src/backend/Containerfile` define exact-digest builds. `scripts/dev.mjs` provides one-command orchestration, and `.env.example` contains no secrets. PR #3 introduced these boundaries. |
| Application implementation | Satisfied | Auth/Shell supplies the frame and error boundary, loads the versioned Author runtime manifest through `/mfe/author/*`, and proxies `/api/*` to Backend. Backend exposes `/health` and `/api/hello`. The local identity is explicitly labeled and gated. PR #3 contains the implementation; PR #9's green `e2e` check exercises the rendered flow. |
| Security and trust-boundary work | Satisfied | `tests/security/local-auth.test.ts` proves that local auth fails closed outside `ACA_ENVIRONMENT=local`, requires explicit enablement, strips caller identity, and recreates trusted identity. `tests/integration/backend.test.ts` verifies safe errors. `docs/architecture/trust-boundaries.md` preserves Auth/Shell as the sole public boundary and keeps Author and Backend internal. |
| Testing and validation | Satisfied | The successful PR #3 `test` and `validate` checks cover the local slice, workflow validation, smoke test, and three container builds in a clean hosted checkout. PR #9's green `e2e` check covers same-origin browser traffic, the visible Author/backend flow, and Author and Backend outage fallbacks. Current local commands and exact results are recorded below. |
| Documentation and operations | Satisfied | `README.md` documents structure and commands. `docs/operations/local-development.md` documents prerequisites, startup, validation, container builds, and troubleshooting. `docs/architecture/stage-0-local.md` and `docs/architecture/trust-boundaries.md` document the architecture and trust boundary. |
| Deployment and rollback | Conditional | GitHub Actions provides clean hosted checkouts with frozen-lockfile installation; the green PR #3 `validate` job also built all three Stage 0 containers. No Azure resource, image publication, or deployed revision exists in this local stage. Local rollback is a Git revert of PRs #3 and #9 plus this record. The environment promotion path, Azure rollback ownership, global prerequisites, and baseline tag remain open conditions. |
| Evidence capture | Satisfied with local-stage qualifications | PR #9 committed three reviewed screenshot baselines, and its hosted `e2e` check passed. The workflow was configured to capture a happy-path video, but this assessment did not independently download or review that recording. Green automated check links are on PRs #3 and #9. Published image and deployed-revision identifiers are not applicable because Stage 0 is local-only and pushes or deployments were explicitly excluded. Known limitations and deferred work are listed below. |

## Exit criteria

| Exit criterion | Result | Evidence or remaining action |
|---|---|---|
| One command starts all services | Satisfied | `pnpm dev` runs `scripts/dev.mjs`, which starts Auth/Shell, Author, and Backend. The smoke and browser suites start the same production-facing local stack. |
| Shell visibly loads Author remote | Satisfied | PR #9 `e2e` passed, and `tests/e2e/20261004T1305-auth-shell-happy-path.pw.ts` verifies the Author UI through the Auth/Shell origin. |
| Author visibly displays backend greeting | Satisfied | The same browser test verifies the personalized Backend greeting rendered inside the Author UI. |
| Automated foundation tests pass | Satisfied | The focused local command passed 3 files and 7 tests. The final full local command and hosted PR checks are recorded below. |
| Global prerequisites have accountable owners and verifiable evidence | Pending | Subscription/region/permissions, Entra tenant ownership, provider application ownership, secret-management ownership, environment promotion, and Azure tooling remain unresolved as listed above. |
| Designated reviewer records Go, Conditional Go, or No Go | Satisfied | This record documents **Conditional Go** with explicit unresolved conditions. It is not a final completion decision. |
| Release tag and final stage completion note exist | Pending | This file is a conditional completion note. Update it with evidence for every open condition before creating annotated tag `v0.0.0-stage.0` on the final accepted commit. |

## Validation evidence

Validation used the repository-pinned Node.js `24.21.0` and pnpm `12.7.0`.

| Command or check | Observed result |
|---|---|
| `pnpm exec vitest run tests/integration/foundation.test.ts tests/integration/backend.test.ts tests/security/local-auth.test.ts` | Passed: 3 test files, 7 tests. |
| `pnpm validate` | Passed: formatting (50 files), linting (51 files), type-check, 7 test files and 27 tests, Author and Auth production builds, 6 YAML files, 2 workflows, immutable Action pins, and the Stage 0 shell-origin smoke test. The two logged `ECONNREFUSED` proxy messages are the smoke test's expected Author and Backend outage checks. |
| PR #3 `test` and `validate` | Passed on final PR head `9142570930864d6d3f94e11bbb5e363b0a2a7198`; the PR merged as `6227dbd600f537662b4698509befdc46776a80cb`. |
| PR #9 `test`, `validate`, and `e2e` | Passed; the PR merged as `9ba4c8b2811376d24a0ebb1c028c0ccd41565aa7`. |

No screenshot, recording, deployment, image revision, or rollback rehearsal was created or
claimed by this documentation change.

## Known limitations and deferred work

- The local mock identity is not a real authentication provider and remains available only
  behind both explicit local gates.
- Stage 0 does not provision Azure resources, publish container images, deploy revisions,
  configure DNS, create secrets, or create application or managed identities.
- The managed workload identity audiences documented for Author and Backend are future deployed
  boundaries; Stage 0 preserves their contracts but does not issue workload tokens.
- Microsoft, Google, and GitHub authentication, external Auth/Shell ingress, and Azure
  deployment belong to Stage 1.
- Independent Author deployment belongs to Stage 2. Author-to-Backend managed-identity calls
  belong to Stage 3.
- No rollback rehearsal was run because Stage 0 creates no persistent or deployed state. The
  rollback procedure is repository-only and should be exercised by reverting the completion
  pull request if its documentation is incorrect.

Deployed revisions and immutable published image identifiers are not expected from the local
implementation and are not claimed. However, subscription/region/permissions, Entra tenant
ownership, provider application ownership, secret-management ownership, an environment
promotion path, and required tooling are mandatory global prerequisites. Their missing evidence,
together with the absent baseline tag, prevents a final Stage 0 Go.

## Rollback and post-merge completion

Before merge, rollback is to close the completion pull request without merging it. After merge,
revert the completion pull request to restore Wave 1 to `In review`. This change has no runtime,
data, identity, secret, dependency, deployment, or Azure cleanup.

To convert Conditional Go to Go:

1. Merge this conditional record after all required checks pass.
2. Assign accountable owners for every unresolved global prerequisite.
3. Capture durable, non-secret evidence for each condition in this record or a follow-up
   acceptance pull request.
4. Obtain the designated reviewer's final Go after all conditions are evidenced.
5. Create annotated tag `v0.0.0-stage.0` on the final accepted commit.
6. Push the tag without force and confirm it resolves to the commit containing the completed
   evidence record.

A GitHub Release is not required by the Stage 0 checklist. If the project later chooses to
publish one, it should point to the same tag and must not imply that an Azure deployment or
published container image exists.
