Preserve the Auth/Shell public boundary and same-origin protected routes. Author and Backend
remain internal and use distinct managed workload identity audiences. Do not add local
credential behavior without an explicit fail-closed local-only gate. Follow Accepted ADRs,
pin dependencies exactly, and pin Actions to full commit SHAs.
