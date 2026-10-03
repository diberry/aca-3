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

owner="$(gh api "${api_headers[@]}" "repos/${repository}" --jq '.owner.login')"
owner_type="$(gh api "${api_headers[@]}" "repos/${repository}" --jq '.owner.type')"
visibility="$(gh api "${api_headers[@]}" "repos/${repository}" --jq '.visibility')"
default_branch="$(gh api "${api_headers[@]}" "repos/${repository}" --jq '.default_branch')"
account_plan="unknown"
if [[ "$owner_type" == "User" ]]; then
  authenticated_login="$(gh api "${api_headers[@]}" user --jq '.login')"
  if [[ "$authenticated_login" == "$owner" ]]; then
    account_plan="$(gh api "${api_headers[@]}" user --jq '.plan.name // "unknown"')"
  fi
else
  account_plan="$(
    gh api "${api_headers[@]}" "orgs/${owner}" --jq '.plan.name // "unknown"' 2>/dev/null ||
      printf 'unknown'
  )"
fi

probe_status() {
  local endpoint="$1"
  local output
  local status

  output="$(gh api "${api_headers[@]}" --include "$endpoint" 2>&1 || true)"
  status="$(
    printf '%s\n' "$output" |
      sed -nE 's/^HTTP\/[^ ]+ ([0-9]{3}).*/\1/p' |
      tail -n 1
  )"
  printf '%s' "${status:-0}"
}

ruleset_status="$(probe_status "repos/${repository}/rulesets")"
classic_status="$(probe_status "repos/${repository}/branches/${default_branch}/protection")"
rulesets_supported=false
classic_supported=false
[[ "$ruleset_status" == "200" ]] && rulesets_supported=true
[[ "$classic_status" == "200" || "$classic_status" == "404" ]] && classic_supported=true

if [[ "$rulesets_supported" == true ]]; then
  protection_mode="ruleset"
elif [[ "$classic_supported" == true ]]; then
  protection_mode="classic branch protection"
else
  protection_mode="unavailable"
fi

ruleset_file="$(mktemp)"
settings_file="$(mktemp)"
classic_file="$(mktemp)"
trap 'rm -f "$ruleset_file" "$settings_file" "$classic_file"' EXIT

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
          {"context": "pr-description"},
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

cat >"$classic_file" <<EOF
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["pr-description", "test", "validate", "tdd-policy"]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": false,
    "required_approving_review_count": ${required_approving_review_count},
    "require_last_push_approval": false
  },
  "restrictions": null,
  "required_linear_history": true,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "required_conversation_resolution": true
}
EOF

if [[ "$apply" == false ]]; then
  echo "Dry run only. No GitHub settings were changed."
  echo
  echo "Repository profile:"
  echo "  Owner type: ${owner_type}"
  echo "  Visibility: ${visibility}"
  echo "  Account plan: ${account_plan}"
  echo "  Rulesets API: HTTP ${ruleset_status}"
  echo "  Classic protection API: HTTP ${classic_status}"
  echo "  Strongest available protection: ${protection_mode}"
  echo
  echo "Repository settings:"
  cat "$settings_file"
  if [[ "$rulesets_supported" == true ]]; then
    echo
    echo "Ruleset:"
    cat "$ruleset_file"
  elif [[ "$classic_supported" == true ]]; then
    echo
    echo "Classic branch protection:"
    cat "$classic_file"
  else
    echo
    echo "Branch protection is unavailable. Apply mode will configure repository settings and report partial enforcement."
  fi
  echo
  echo "Re-run with --apply after the TDD Policy workflow exists on main."
  exit 0
fi

gh api "${api_headers[@]}" \
  --method PATCH \
  "repos/${repository}" \
  --input "$settings_file" >/dev/null
echo "Applied supported repository merge settings."

if [[ "$rulesets_supported" == true ]]; then
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
elif [[ "$classic_supported" == true ]]; then
  gh api "${api_headers[@]}" \
    --method PUT \
    "repos/${repository}/branches/${default_branch}/protection" \
    --input "$classic_file" >/dev/null
  echo "Applied classic branch protection."
else
  echo "Verified repository settings:"
  gh api "${api_headers[@]}" "repos/${repository}" \
    --jq '{allow_squash_merge,allow_merge_commit,allow_rebase_merge,delete_branch_on_merge}'
  echo "Partial enforcement only: repository settings were applied, but this account and repository do not support rulesets or classic branch protection." >&2
  exit 2
fi

echo "Effective main-branch rules:"
if [[ "$rulesets_supported" == true ]]; then
  gh api "${api_headers[@]}" "repos/${repository}/rules/branches/${default_branch}"
else
  gh api "${api_headers[@]}" "repos/${repository}/branches/${default_branch}/protection"
fi
echo "Verified repository settings:"
gh api "${api_headers[@]}" "repos/${repository}" \
  --jq '{allow_squash_merge,allow_merge_commit,allow_rebase_merge,delete_branch_on_merge}'
