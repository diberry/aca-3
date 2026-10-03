# Governance reconciliation

The GitHub agent governance package is the policy baseline. Repository-specific assets were
selectively adapted from the ACA platform reference rather than overlaid.

Adopted now:

- deterministic-first, least-privilege, read-only-by-default agent policy;
- real ownership and contribution templates;
- pnpm and GitHub Actions Dependabot configuration;
- validation and security workflows with immutable Action pins;
- source package manifest and checksum provenance.

Deferred:

- modernization inventory schedules;
- monthly agentic modernization review;
- any workflow that creates issues or requires model/provider credentials.

Those capabilities remain disabled because this repository has no evidenced `gh-aw`
compiler, generated lock workflow, credential, network review, billing control, or manual
validation. Enablement requires a separate reviewed pull request satisfying every prerequisite
in `agent-governance.yml`.
