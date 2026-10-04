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

Playwright runs only Chromium. Each UI page or distinct visible state should have a browser
assertion and screenshot baseline. Compare the baseline with the actual browser output on
every run; a mismatch fails the test and produces actual/diff images in `test-results/e2e`
and the HTML report. Inspect these before deciding whether a visual change is intentional.

To intentionally update approved baselines:

```text
pnpm test:e2e:update-snapshots
pnpm test:e2e
```

Run and update baselines on Linux with the same Chromium version as CI to avoid platform
rendering differences. Review all changed files under `tests/e2e/*-snapshots/` and commit
approved baselines with the UI change; CI never regenerates snapshots.

## Review reports and videos

The happy-path video is saved under `test-results/e2e` on success. Open it in a browser or
WebM-capable video player. For test results and visual diffs, open the local HTML report:

```text
pnpm test:e2e:report
```

On CI, open the pull request's **Validation / e2e** job. A passing job means the committed
screenshots matched; a failed job uploads the Playwright HTML report and test artifacts,
including actual/diff images and failure diagnostics. The successful job uploads a separate
`*-playwright-happy-path-video` artifact. Download and open its `.webm` file to review the
captured journey. If GitHub shows `action_required`, an authorized repository maintainer must
approve the workflow before it can run; verify the `e2e` check is green before merging.

The suite uses only the non-secret local identity `Playwright Local Author`.

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
- **A screenshot comparison fails:** Inspect the actual and diff images in `test-results/e2e`
  or `pnpm test:e2e:report`. Update the baseline only when the UI change is intentional.
- **A video is unavailable locally:** Confirm the happy-path test passed, then inspect
  `test-results/e2e` for its `.webm` recording.
- **Tests time out during startup:** Run `pnpm dev` separately to inspect stack startup
  errors, stop it with Ctrl+C, then rerun the Playwright suite.

The existing `pnpm smoke` command remains the service-boundary check for trusted proxy
identity and direct Backend behavior; Playwright focuses on rendered browser behavior.
