import { useEffect, useState } from "react";
import type { AuthContextValue } from "../../packages/auth-context/index.js";
import { AuthorHost } from "./AuthorHost.js";

type AuthState =
  | { readonly status: "loading" }
  | { readonly status: "ready"; readonly context: AuthContextValue }
  | { readonly status: "error" };

export function App() {
  const [auth, setAuth] = useState<AuthState>({ status: "loading" });

  useEffect(() => {
    void fetch("/__local/auth/context", {
      credentials: "same-origin",
      headers: { accept: "application/json" },
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Local authentication context is unavailable.");
        }
        setAuth({ status: "ready", context: (await response.json()) as AuthContextValue });
      })
      .catch(() => setAuth({ status: "error" }));
  }, []);

  return (
    <>
      <header className="shell-header">
        <a className="brand" href="/">
          ACA Platform
        </a>
        <nav aria-label="Primary navigation">
          <a aria-current="page" href="/">
            Author
          </a>
        </nav>
      </header>
      <main className="shell-main">
        <div className="stage-banner">
          <strong>Stage 0 local development</strong>
          <span>Mock identity is never valid outside the explicit local gate.</span>
        </div>
        {auth.status === "loading" && <p role="status">Loading local identity…</p>}
        {auth.status === "error" && (
          <section className="feature-fallback" role="alert">
            <h1>Local identity is unavailable</h1>
            <p>Restart with `ACA_ENVIRONMENT=local` and `LOCAL_DEV_AUTH_ENABLED=true`.</p>
          </section>
        )}
        {auth.status === "ready" && auth.context.user === null && (
          <section className="feature-fallback" role="alert">
            <h1>Local identity is disabled</h1>
            <p>The protected Author area was not loaded.</p>
          </section>
        )}
        {auth.status === "ready" && auth.context.user !== null && (
          <AuthorHost user={auth.context.user} />
        )}
      </main>
    </>
  );
}
