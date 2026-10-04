# Browser tests

The Chromium Playwright suite exercises Auth/Shell, the explicitly local mock identity,
the Author runtime microfrontend, Backend output, same-origin browser requests, and
user-facing Author and Backend outage states. The suite starts the real three-service
local stack through `pnpm dev` and stops it when the run ends. Committed screenshot
baselines compare the happy UI and both outage states on every run. The happy-path test
also records a video from the initial shell navigation through the Backend greeting.

## Install and run locally

```text
pnpm install --frozen-lockfile
pnpm test:e2e:install
pnpm test:e2e
```

Playwright runs only Chromium. Update screenshot baselines intentionally with:

```text
pnpm exec playwright test --config tests/e2e/playwright.config.ts --update-snapshots
```

Run and update baselines on Linux with the same Chromium version as CI to avoid platform
rendering differences. The happy-path video is saved under `test-results/e2e` on success;
failure traces, screenshots, and videos are also retained there. The suite uses only the
non-secret local identity `Playwright Local Author`.

Stage 0 has no sign-in page or real identity-provider flow. The video starts with the browser
opening the shell, shows the explicitly gated local identity loading, and continues through
the mounted Author UI and Backend greeting; it does not mock an auth provider.

## Troubleshooting

- **Startup reports a port conflict:** Stop the process occupying port 4100, 4200, or 4300,
  then rerun `pnpm test:e2e`. The local servers use strict ports and do not silently select
  another origin.
- **Chromium is missing:** Run `pnpm test:e2e:install` again.
- **The local identity is unavailable:** Run the suite through its Playwright configuration;
  it starts `pnpm dev` with the explicit local-only identity gate.
- **Tests time out during startup:** Run `pnpm dev` separately to inspect stack startup
  errors, stop it with Ctrl+C, then rerun the Playwright suite.

The existing `pnpm smoke` command remains the service-boundary check for trusted proxy
identity and direct Backend behavior; Playwright focuses on rendered browser behavior.
