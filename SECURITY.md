# Security policy

Do not report vulnerabilities in public issues. Use GitHub private vulnerability reporting:
https://github.com/diberry/aca-3/security/advisories/new. Include the affected revision,
impact, reproduction steps, and any suggested mitigation.

The platform trust boundary requires Auth/Shell to be the only public application, with
Author and Backend internal and protected by distinct managed workload identity audiences.
Never commit credentials, tokens, secrets, cookies, raw authentication headers, or private keys.
