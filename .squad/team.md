# ACA-3 Squad

> Secure, staged Azure Container Apps platform with a public Auth/Shell and internal Author and Backend services.

## Coordinator

| Name | Role | Notes |
|------|------|-------|
| Squad | Coordinator | Routes work, enforces ownership and handoffs, and selects review gates. |

## Members

| Name | Role | Charter | Status |
|------|------|---------|--------|
| stage-lead | Product and Architecture Lead | `.squad/agents/stage-lead/charter.md` | ✅ Active |
| boundary-engineer | Auth/Shell and Identity Specialist | `.squad/agents/boundary-engineer/charter.md` | ✅ Active |
| author-engineer | Runtime Microfrontend and UX Specialist | `.squad/agents/author-engineer/charter.md` | ✅ Active |
| platform-engineer | Backend, Azure, and Deployment Specialist | `.squad/agents/platform-engineer/charter.md` | ✅ Active |
| quality-steward | TDD, Security Assurance, CI, and Documentation Specialist | `.squad/agents/quality-steward/charter.md` | ✅ Active |

## Built-in Support Agents

| Name | Role | Charter | Status |
|------|------|---------|--------|
| Scribe | Durable Decision Merger | `.squad/agents/scribe/charter.md` | 📋 Silent |
| Ralph | Work Monitor | `.squad/agents/ralph/charter.md` | 🔄 Monitor |
| Rai | Facilitation and Routing Support; built-in Responsible AI Reviewer | `.squad/agents/rai/charter.md` | 🛡️ RAI |
| Fact Checker | Independent Verification Agent | `.squad/agents/fact-checker/charter.md` | 🔍 Verifier |

These four built-in support identities are not project specialists and are excluded from the five-member count.

## Coding Agent

<!-- copilot-auto-assign: false -->

| Name | Role | Charter | Status |
|------|------|---------|--------|
| @copilot | Coding Agent | — | 🤖 Coding Agent |

## Project Context

- **Project:** diberry/aca-3
- **Stage:** Wave 0 governance for a Stage 0 local vertical slice; v1 is limited to Stages 0–3.
- **Stack:** pnpm and TypeScript monorepo; React/Vite Auth/Shell and Author; internal Node.js Backend; future Bicep modules under `infra/modules/`.
- **Description:** The public Auth/Shell serves as the sole ingress, loading Author and reaching Backend through protected same-origin routes.
- **Created:** 2026-10-04
- **Minimal defaults:** Role-based names are used because no naming universe is evidenced. Stage Lead is the initial intake owner because no existing Squad coordinator is configured.
