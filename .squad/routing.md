# Work Routing

Assign one directly responsible project specialist for each task.

## Routing Table

| Work Type | Route To | Examples |
|-----------|----------|----------|
| Product, wave scope, ADR alignment, ambiguous or cross-surface requests | stage-lead | Roadmap, architecture impact, intake, cross-surface contracts |
| Auth/Shell, identity, ingress, authorization, trusted headers, same-origin proxies | boundary-engineer | Local auth gate, OIDC, proxy hardening, workload audiences |
| Author microfrontend, browser UX, shared presentational UI, loading and fallbacks | author-engineer | `src/author`, `packages/ui`, accessibility, runtime manifest |
| Backend APIs, Bicep, containers, Azure deployment, managed identity, operations | platform-engineer | `src/backend`, `infra/modules`, Container Apps, runbooks |
| Tests, TDD evidence, security assurance, CI/policy, pins, docs and validation failures | quality-steward | `tests/`, `.github/workflows/`, governance and operations documentation |

## Dispatch Rules

1. `stage-lead` receives ambiguous, cross-wave, product, ADR, or scope requests and assigns exactly one primary implementer.
2. Route each task to the specialist whose owned surface matches its main deliverable; split only when deliverables have different owners.
3. For cross-boundary work, `stage-lead` resolves scope and contracts, one domain specialist implements, and `quality-steward` defines or validates acceptance evidence.
4. Security-sensitive changes have `boundary-engineer` review and `quality-steward` validation; the directly responsible implementer remains clear.
5. Never route work to built-in support agents or `@copilot`; Scribe, Ralph, Rai, and Fact Checker support the roster but do not replace an accountable specialist. Rai may facilitate discussion or help Stage Lead with routing when requested.

## Issue Routing

| Label | Action | Who |
|-------|--------|-----|
| `squad` | Triage: analyze issue and assign `squad:{member}` label | stage-lead |
| `squad:{name}` | Pick up issue and complete the work | Named member |

### How Issue Assignment Works

1. When a GitHub issue gets the `squad` label, **stage-lead** triages it — analyzing content, assigning the right `squad:{member}` label, and commenting with triage notes.
2. When a `squad:{member}` label is applied, that member picks up the issue in their next session.
3. Members can reassign by removing their label and adding another member's label.
4. The `squad` label is the "inbox" — untriaged issues waiting for `stage-lead` review.

## Rules

1. **Bounded collaboration** — assign one primary owner and add only collaborators needed for a defined handoff or review.
2. **Scribe runs only when accepted durable decisions require merging**, always as `mode: "background"`. Never blocks.
3. **Quick facts → coordinator answers directly.** Don't spawn an agent for "what port does the server run on?"
4. **When two agents could handle it**, pick the one whose domain is the primary concern.
5. **"Team, ..." → bounded fan-out.** Include only specialists with a concrete responsibility.
6. **Issue-labeled work** — when a `squad:{member}` label is applied to an issue, route to that member. `stage-lead` handles all `squad` (base label) triage.
