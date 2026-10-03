import { startLocalStack } from "./dev.mjs";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const stack = await startLocalStack({
  ACA_ENVIRONMENT: "local",
  LOCAL_DEV_AUTH_ENABLED: "true",
  LOCAL_DEV_USER_NAME: "Smoke Test Author",
});

try {
  const shell = await fetch(stack.shellUrl);
  assert(shell.ok, `Shell returned HTTP ${shell.status}`);
  assert((await shell.text()).includes("ACA Platform"), "Shell HTML was not returned.");

  const auth = await fetch(`${stack.shellUrl}/__local/auth/context`);
  const context = await auth.json();
  assert(context.user?.displayName === "Smoke Test Author", "Local auth context was not trusted.");

  const manifestResponse = await fetch(`${stack.shellUrl}/mfe/author/manifest.json`);
  const manifest = await manifestResponse.json();
  assert(manifest.entry?.startsWith("/mfe/author/"), "Author manifest was not same-origin.");

  const remote = await fetch(`${stack.shellUrl}${manifest.entry}`);
  assert(remote.ok, `Author entry returned HTTP ${remote.status}`);

  const greetingResponse = await fetch(`${stack.shellUrl}/api/hello`, {
    headers: {
      "x-aca-user-name": "Forged Browser User",
      "x-ms-client-principal": "forged",
    },
  });
  const greeting = await greetingResponse.json();
  assert(greeting.user === "Smoke Test Author", "Trusted proxy identity was not rebuilt.");
  assert(
    !JSON.stringify(greeting).includes("Forged Browser User"),
    "Caller-supplied identity reached the backend.",
  );

  await stack.stopAuthor();
  const missingAuthor = await fetch(`${stack.shellUrl}/mfe/author/manifest.json`);
  assert(!missingAuthor.ok, "Author unexpectedly remained reachable after shutdown.");
  assert((await fetch(stack.shellUrl)).ok, "Shell failed when Author was unavailable.");

  await stack.stopBackend();
  const missingBackend = await fetch(`${stack.shellUrl}/api/hello`);
  assert(!missingBackend.ok, "Backend unexpectedly remained reachable after shutdown.");
  assert((await fetch(stack.shellUrl)).ok, "Shell failed when Backend was unavailable.");

  console.log("Stage 0 smoke test passed through the shell origin.");
} finally {
  await stack.close();
}
