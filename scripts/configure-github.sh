#!/usr/bin/env bash

set -euo pipefail

repository="diberry/aca-3"
required_approving_review_count=0
apply=false
ruleset_name="aca-main-protection"
api_headers=(
  -H "Accept: application/vnd.github+json"
  -H "X-GitHub-Api-Version: 2022-11-28"
)

usage() {
  cat <<'EOF'
Usage: scripts/configure-github.sh [--repository owner/name] [--review-count 0-6] [--apply]

The default mode is a dry run. Use --apply only after the TDD Policy workflow exists on main.
EOF
}

while (($# > 0)); do
  case "$1" in
    --repository)
      repository="${2:?--repository requires owner/name}"
      shift 2
      ;;
    --review-count)
      required_approving_review_count="${2:?--review-count requires a value}"
      shift 2
      ;;
    --apply)
      apply=true
      shift
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

if [[ ! "$repository" =~ ^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$ ]]; then
  echo "Repository must use the owner/name format." >&2
  exit 2
fi

if [[ ! "$required_approving_review_count" =~ ^[0-6]$ ]]; then
  echo "Review count must be an integer from 0 through 6." >&2
  exit 2
fi

command -v gh >/dev/null 2>&1 || {
  echo "GitHub CLI is required." >&2
  exit 1
}
gh auth status >/dev/null

full_name="$(gh api "${api_headers[@]}" "repos/${repository}" --jq '.full_name')"
if [[ "$full_name" != "$repository" ]]; then
  echo "Authenticated repository identity did not match ${repository}." >&2
  exit 1
fi

ruleset_file="$(mktemp)"
settings_file="$(mktemp)"
trap 'rm -f "$ruleset_file" "$settings_file"' EXIT

cat >"$ruleset_file" <<EOF
{
  "name": "${ruleset_name}",
  "target": "branch",
  "enforcement": "active",
  "conditions": {
    "ref_name": {
      "include": ["~DEFAULT_BRANCH"],
      "exclude": []
    }
  },
  "rules": [
    {"type": "deletion"},
    {"type": "non_fast_forward"},
    {"type": "required_linear_history"},
    {
      "type": "pull_request",
      "parameters": {
        "allowed_merge_methods": ["squash"],
        "dismiss_stale_reviews_on_push": true,
        "require_code_owner_review": false,
        "require_last_push_approval": false,
        "required_approving_review_count": ${required_approving_review_count},
        "required_review_thread_resolution": true
      }
    },
    {
      "type": "required_status_checks",
      "parameters": {
        "required_status_checks": [
          {"context": "test"},
          {"context": "validate"},
          {"context": "tdd-policy"}
        ],
        "strict_required_status_checks_policy": true
      }
    }
  ]
}
EOF

cat >"$settings_file" <<'EOF'
{
  "allow_merge_commit": false,
  "allow_rebase_merge": false,
  "allow_squash_merge": true,
  "delete_branch_on_merge": true
}
EOF

if [[ "$apply" == false ]]; then
  echo "Dry run only. No GitHub settings were changed."
  echo
  echo "Repository settings:"
  cat "$settings_file"
  echo
  echo "Ruleset:"
  cat "$ruleset_file"
  echo
  echo "Re-run with --apply after the TDD Policy workflow exists on main."
  exit 0
fi

if ! rulesets_json="$(gh api "${api_headers[@]}" "repos/${repository}/rulesets" 2>&1)"; then
  echo "Repository rulesets are unavailable. For a private repository, GitHub Pro or a higher plan is required. No settings were changed." >&2
  echo "$rulesets_json" >&2
  exit 1
fi

ruleset_id="$(
  gh api "${api_headers[@]}" "repos/${repository}/rulesets" \
    --jq ".[] | select(.name == \"${ruleset_name}\") | .id" |
    head -n 1
)"

if [[ -n "$ruleset_id" ]]; then
  gh api "${api_headers[@]}" \
    --method PUT \
    "repos/${repository}/rulesets/${ruleset_id}" \
    --input "$ruleset_file" >/dev/null
  echo "Updated ruleset ${ruleset_name}."
else
  gh api "${api_headers[@]}" \
    --method POST \
    "repos/${repository}/rulesets" \
    --input "$ruleset_file" >/dev/null
  echo "Created ruleset ${ruleset_name}."
fi

gh api "${api_headers[@]}" \
  --method PATCH \
  "repos/${repository}" \
  --input "$settings_file" >/dev/null

echo "Effective main-branch rules:"
gh api "${api_headers[@]}" "repos/${repository}/rules/branches/main"
echo "Verified repository settings:"
gh api "${api_headers[@]}" "repos/${repository}" \
  --jq '{allow_squash_merge,allow_merge_commit,allow_rebase_merge,delete_branch_on_merge}'
