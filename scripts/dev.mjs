import { pathToFileURL } from "node:url";
import path from "node:path";
import { createServer as createViteServer } from "vite";
import { startBackendServer } from "../dist/src/backend/server.js";

const root = path.resolve(import.meta.dirname, "..");

function localEnvironment(input) {
  if (input.ACA_ENVIRONMENT && input.ACA_ENVIRONMENT !== "local") {
    throw new Error("The local stack refuses to start when ACA_ENVIRONMENT is not local.");
  }
  return {
    ...input,
    ACA_ENVIRONMENT: "local",
    LOCAL_DEV_AUTH_ENABLED: "true",
    LOCAL_DEV_USER_NAME: input.LOCAL_DEV_USER_NAME || "Local Author",
  };
}

export async function startLocalStack(inputEnvironment = process.env) {
  const environment = localEnvironment(inputEnvironment);
  Object.assign(process.env, environment);

  const backend = await startBackendServer(4300, "127.0.0.1");
  let author;
  let auth;
  try {
    author = await createViteServer({
      configFile: path.join(root, "src", "author", "vite.config.ts"),
    });
    await author.listen();

    auth = await createViteServer({
      configFile: path.join(root, "src", "auth", "vite.config.ts"),
    });
    await auth.listen();
  } catch (error) {
    await author?.close();
    await new Promise((resolve) => backend.close(resolve));
    throw error;
  }

  let authRunning = true;
  let authorRunning = true;
  let backendRunning = true;

  return {
    shellUrl: "http://127.0.0.1:4100",
    async stopAuthor() {
      if (authorRunning) {
        await author.close();
        authorRunning = false;
      }
    },
    async stopBackend() {
      if (backendRunning) {
        await new Promise((resolve, reject) => {
          backend.close((error) => (error ? reject(error) : resolve()));
        });
        backendRunning = false;
      }
    },
    async close() {
      if (authRunning) {
        await auth.close();
        authRunning = false;
      }
      if (authorRunning) {
        await author.close();
        authorRunning = false;
      }
      if (backendRunning) {
        await new Promise((resolve, reject) => {
          backend.close((error) => (error ? reject(error) : resolve()));
        });
        backendRunning = false;
      }
    },
  };
}

const entryPath = process.argv[1];
if (entryPath && import.meta.url === pathToFileURL(entryPath).href) {
  const stack = await startLocalStack();
  console.log(`ACA Stage 0 local stack is ready at ${stack.shellUrl}`);
  console.log("Press Ctrl+C to stop all services.");

  const stop = async () => {
    await stack.close();
    process.exit(0);
  };
  process.once("SIGINT", () => void stop());
  process.once("SIGTERM", () => void stop());
}
