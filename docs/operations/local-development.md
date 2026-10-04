# Local development

## Prerequisites

- Node.js LTS (the exact repository pin is in `.node-version`)
- Corepack and pnpm `12.7.0`

## Start the complete slice

```text
corepack enable
corepack prepare pnpm@12.7.0 --activate
pnpm install --frozen-lockfile
pnpm dev
```

Open `http://127.0.0.1:4100`. The command compiles server TypeScript and starts Auth/Shell,
Author, and Backend together. Press Ctrl+C once to stop all three.

`pnpm dev` sets the explicit local-only values needed for the mock identity. It refuses to
start if `ACA_ENVIRONMENT` is already set to a non-local value. Set `LOCAL_DEV_USER_NAME`
to change the non-secret display name.

## Validate

```text
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm smoke
pnpm test:e2e:install
pnpm test:e2e
pnpm test:e2e:report
pnpm validate
```

The smoke test starts the real three-process stack, accesses Author and Backend only through
the shell origin, verifies forged identity headers are replaced, and confirms the shell
survives Author and Backend shutdown.

The Chromium browser suite starts and stops the same local stack automatically. See
[`tests/e2e/README.md`](../../tests/e2e/README.md) for browser installation, screenshot
baseline updates and comparison, video access, PR checks, and troubleshooting.

## Container builds

From the repository root:

```text
docker build -f src/auth/Containerfile -t aca-auth:stage-0 .
docker build -f src/author/Containerfile -t aca-author:stage-0 .
docker build -f src/backend/Containerfile -t aca-backend:stage-0 .
```

These definitions establish build boundaries only. Wave 1 does not provision resources,
push images, create identities, or deploy containers. The Node.js Alpine base image is
pinned to OCI index digest
`sha256:ebfe2f90462722a7a4de65e91990e97fe0d401c70e0e762c5b53302f905ec1c1`.

## Troubleshooting

- **Port already in use:** Stop the process using ports 4100, 4200, or 4300 and rerun `pnpm dev`.
- **Local identity unavailable:** Start through `pnpm dev`; do not run the shell Vite config directly.
- **Author fallback appears:** Confirm the Author server is running and the manifest is available
  at `/mfe/author/manifest.json` through port 4100.
- **Backend retry appears:** Confirm `/health` responds directly on port 4300 and `/api/hello`
  responds through port 4100.
