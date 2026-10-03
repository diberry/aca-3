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

function Invoke-GitHubApiProbe {
  param([string]$Endpoint)

  $output = & gh api @apiHeaders "--include" $Endpoint 2>&1
  $text = ($output -join "`n")
  $statusMatch = [regex]::Match($text, "HTTP/\S+\s+(\d{3})")
  $statusCode = if ($statusMatch.Success) { [int]$statusMatch.Groups[1].Value } else { 0 }

  return [pscustomobject]@{
    StatusCode = $statusCode
    Output = $text
  }
}

$repositoryDetails = Invoke-GitHubApi @("repos/$Repository") | ConvertFrom-Json
if ($repositoryDetails.full_name -ne $Repository) {
  throw "Authenticated repository identity did not match $Repository."
}

$accountPlan = "unknown"
try {
  if ($repositoryDetails.owner.type -eq "User") {
    $viewer = Invoke-GitHubApi @("user") | ConvertFrom-Json
    if ($viewer.login -eq $repositoryDetails.owner.login -and $viewer.plan.name) {
      $accountPlan = $viewer.plan.name
    }
  } else {
    $organization = Invoke-GitHubApi @("orgs/$($repositoryDetails.owner.login)") | ConvertFrom-Json
    if ($organization.plan.name) {
      $accountPlan = $organization.plan.name
    }
  }
} catch {
  $accountPlan = "unknown"
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
$classicProtection = @{
  required_status_checks = @{
    strict = $true
    contexts = @("test", "validate", "tdd-policy")
  }
  enforce_admins = $true
  required_pull_request_reviews = @{
    dismiss_stale_reviews = $true
    require_code_owner_reviews = $false
    required_approving_review_count = $RequiredApprovingReviewCount
    require_last_push_approval = $false
  }
  restrictions = $null
  required_linear_history = $true
  allow_force_pushes = $false
  allow_deletions = $false
  required_conversation_resolution = $true
}

$utf8WithoutBom = [System.Text.UTF8Encoding]::new($false)
$rulesetFile = Join-Path ([System.IO.Path]::GetTempPath()) "aca-main-ruleset-$PID.json"
$settingsFile = Join-Path ([System.IO.Path]::GetTempPath()) "aca-repository-settings-$PID.json"
$classicProtectionFile = Join-Path ([System.IO.Path]::GetTempPath()) "aca-classic-protection-$PID.json"

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
  [System.IO.File]::WriteAllText(
    $classicProtectionFile,
    ($classicProtection | ConvertTo-Json -Depth 10),
    $utf8WithoutBom
  )

  $rulesetProbe = Invoke-GitHubApiProbe "repos/$Repository/rulesets"
  $classicProbe = Invoke-GitHubApiProbe "repos/$Repository/branches/$($repositoryDetails.default_branch)/protection"
  $rulesetsSupported = $rulesetProbe.StatusCode -eq 200
  $classicProtectionSupported = $classicProbe.StatusCode -in @(200, 404)
  $protectionMode = if ($rulesetsSupported) {
    "ruleset"
  } elseif ($classicProtectionSupported) {
    "classic branch protection"
  } else {
    "unavailable"
  }

  if (-not $Apply) {
    Write-Host "Dry run only. No GitHub settings were changed."
    Write-Host "`nRepository profile:"
    Write-Host "  Owner type: $($repositoryDetails.owner.type)"
    Write-Host "  Visibility: $($repositoryDetails.visibility)"
    Write-Host "  Account plan: $accountPlan"
    Write-Host "  Rulesets API: HTTP $($rulesetProbe.StatusCode)"
    Write-Host "  Classic protection API: HTTP $($classicProbe.StatusCode)"
    Write-Host "  Strongest available protection: $protectionMode"
    Write-Host "`nRepository settings:"
    Get-Content -Raw $settingsFile
    if ($rulesetsSupported) {
      Write-Host "`nRuleset:"
      Get-Content -Raw $rulesetFile
    } elseif ($classicProtectionSupported) {
      Write-Host "`nClassic branch protection:"
      Get-Content -Raw $classicProtectionFile
    } else {
      Write-Host "`nBranch protection is unavailable. Apply mode will configure repository settings and report partial enforcement."
    }
    Write-Host "`nRe-run with -Apply after the TDD Policy workflow exists on main."
    return
  }

  Invoke-GitHubApi @(
    "-X", "PATCH",
    "repos/$Repository",
    "--input", $settingsFile
  ) | Out-Null
  Write-Host "Applied supported repository merge settings."

  if ($rulesetsSupported) {
    $existingRulesets = @(
      (Invoke-GitHubApi @("repos/$Repository/rulesets") | ConvertFrom-Json)
    )

    $existingRuleset = $existingRulesets |
      Where-Object { $_.name -eq $rulesetName } |
      Select-Object -First 1
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
  } elseif ($classicProtectionSupported) {
    Invoke-GitHubApi @(
      "-X", "PUT",
      "repos/$Repository/branches/$($repositoryDetails.default_branch)/protection",
      "--input", $classicProtectionFile
    ) | Out-Null
    Write-Host "Applied classic branch protection."
  } else {
    $verifiedSettings = Invoke-GitHubApi @(
      "repos/$Repository",
      "--jq",
      "{allow_squash_merge,allow_merge_commit,allow_rebase_merge,delete_branch_on_merge}"
    )
    Write-Host "Verified repository settings:"
    Write-Host $verifiedSettings
    throw "Partial enforcement only: repository settings were applied, but this account and repository do not support rulesets or classic branch protection."
  }

  $effectiveRules = if ($rulesetsSupported) {
    Invoke-GitHubApi @("repos/$Repository/rules/branches/$($repositoryDetails.default_branch)")
  } else {
    Invoke-GitHubApi @("repos/$Repository/branches/$($repositoryDetails.default_branch)/protection")
  }
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
  Remove-Item -ErrorAction SilentlyContinue $rulesetFile, $settingsFile, $classicProtectionFile
}
