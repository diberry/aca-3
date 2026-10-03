[CmdletBinding()]
param(
  [string]$Repository = "diberry/aca-3",
  [ValidateRange(0, 6)]
  [int]$RequiredApprovingReviewCount = 0,
  [switch]$Apply
)

$ErrorActionPreference = "Stop"
$rulesetName = "aca-main-protection"
$apiHeaders = @(
  "-H", "Accept: application/vnd.github+json",
  "-H", "X-GitHub-Api-Version: 2022-11-28"
)

if ($Repository -notmatch "^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$") {
  throw "Repository must use the owner/name format."
}

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
  throw "GitHub CLI is required."
}

& gh auth status *> $null
if ($LASTEXITCODE -ne 0) {
  throw "GitHub CLI authentication is required."
}

function Invoke-GitHubApi {
  param([string[]]$Arguments)

  $output = & gh api @apiHeaders @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "gh api failed: $($Arguments -join ' ')"
  }

  return ($output -join "`n")
}

$repositoryDetails = Invoke-GitHubApi @("repos/$Repository") | ConvertFrom-Json
if ($repositoryDetails.full_name -ne $Repository) {
  throw "Authenticated repository identity did not match $Repository."
}

$ruleset = @{
  name = $rulesetName
  target = "branch"
  enforcement = "active"
  conditions = @{
    ref_name = @{
      include = @("~DEFAULT_BRANCH")
      exclude = @()
    }
  }
  rules = @(
    @{ type = "deletion" }
    @{ type = "non_fast_forward" }
    @{ type = "required_linear_history" }
    @{
      type = "pull_request"
      parameters = @{
        allowed_merge_methods = @("squash")
        dismiss_stale_reviews_on_push = $true
        require_code_owner_review = $false
        require_last_push_approval = $false
        required_approving_review_count = $RequiredApprovingReviewCount
        required_review_thread_resolution = $true
      }
    }
    @{
      type = "required_status_checks"
      parameters = @{
        required_status_checks = @(
          @{ context = "test" }
          @{ context = "validate" }
          @{ context = "tdd-policy" }
        )
        strict_required_status_checks_policy = $true
      }
    }
  )
}
$repositorySettings = @{
  allow_merge_commit = $false
  allow_rebase_merge = $false
  allow_squash_merge = $true
  delete_branch_on_merge = $true
}

$utf8WithoutBom = [System.Text.UTF8Encoding]::new($false)
$rulesetFile = Join-Path ([System.IO.Path]::GetTempPath()) "aca-main-ruleset-$PID.json"
$settingsFile = Join-Path ([System.IO.Path]::GetTempPath()) "aca-repository-settings-$PID.json"

try {
  [System.IO.File]::WriteAllText(
    $rulesetFile,
    ($ruleset | ConvertTo-Json -Depth 10),
    $utf8WithoutBom
  )
  [System.IO.File]::WriteAllText(
    $settingsFile,
    ($repositorySettings | ConvertTo-Json -Depth 10),
    $utf8WithoutBom
  )

  if (-not $Apply) {
    Write-Host "Dry run only. No GitHub settings were changed."
    Write-Host "`nRepository settings:"
    Get-Content -Raw $settingsFile
    Write-Host "`nRuleset:"
    Get-Content -Raw $rulesetFile
    Write-Host "`nRe-run with -Apply after the TDD Policy workflow exists on main."
    return
  }

  try {
    $existingRulesets = @(
      (Invoke-GitHubApi @("repos/$Repository/rulesets") | ConvertFrom-Json)
    )
  } catch {
    throw "Repository rulesets are unavailable. For a private repository, GitHub Pro or a higher plan is required. No settings were changed. $($_.Exception.Message)"
  }

  $existingRuleset = $existingRulesets | Where-Object { $_.name -eq $rulesetName } | Select-Object -First 1
  if ($existingRuleset) {
    Invoke-GitHubApi @(
      "-X", "PUT",
      "repos/$Repository/rulesets/$($existingRuleset.id)",
      "--input", $rulesetFile
    ) | Out-Null
    Write-Host "Updated ruleset $rulesetName."
  } else {
    Invoke-GitHubApi @(
      "-X", "POST",
      "repos/$Repository/rulesets",
      "--input", $rulesetFile
    ) | Out-Null
    Write-Host "Created ruleset $rulesetName."
  }

  Invoke-GitHubApi @(
    "-X", "PATCH",
    "repos/$Repository",
    "--input", $settingsFile
  ) | Out-Null

  $effectiveRules = Invoke-GitHubApi @("repos/$Repository/rules/branches/main")
  $verifiedSettings = Invoke-GitHubApi @(
    "repos/$Repository",
    "--jq",
    "{allow_squash_merge,allow_merge_commit,allow_rebase_merge,delete_branch_on_merge}"
  )

  Write-Host "Effective main-branch rules:"
  Write-Host $effectiveRules
  Write-Host "Verified repository settings:"
  Write-Host $verifiedSettings
} finally {
  Remove-Item -ErrorAction SilentlyContinue $rulesetFile, $settingsFile
}
