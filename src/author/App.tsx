import { useCallback, useEffect, useState } from "react";
import type { AuthorMountOptions, HelloResponse } from "../../packages/contracts/index.js";

type GreetingState =
  | { readonly status: "loading" }
  | { readonly status: "ready"; readonly response: HelloResponse }
  | { readonly status: "error"; readonly message: string };

export function AuthorApp({ user }: Pick<AuthorMountOptions, "user">) {
  const [state, setState] = useState<GreetingState>({ status: "loading" });

  const loadGreeting = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const response = await fetch("/api/hello", {
        credentials: "same-origin",
        headers: {
          accept: "application/json",
        },
      });
      if (!response.ok) {
        throw new Error(`Backend returned HTTP ${response.status}`);
      }
      setState({ status: "ready", response: (await response.json()) as HelloResponse });
    } catch (error) {
      const message = error instanceof Error ? error.message : "The backend is unavailable";
      setState({ status: "error", message });
    }
  }, []);

  useEffect(() => {
    void loadGreeting();
  }, [loadGreeting]);

  return (
    <section
      aria-labelledby="author-heading"
      style={{
        background: "#ffffff",
        border: "1px solid #d8dee9",
        borderRadius: "0.75rem",
        boxShadow: "0 12px 32px rgb(15 23 42 / 8%)",
        padding: "1.5rem",
      }}
    >
      <p style={{ color: "#475569", fontSize: "0.875rem", margin: "0 0 0.5rem" }}>
        Runtime microfrontend · contract 1.0.0
      </p>
      <h2 id="author-heading" style={{ marginTop: 0 }}>
        Author
      </h2>
      <p>
        Signed in locally as <strong>{user.displayName}</strong>.
      </p>
      {state.status === "loading" && <p role="status">Contacting the backend…</p>}
      {state.status === "ready" && <p data-testid="backend-greeting">{state.response.message}</p>}
      {state.status === "error" && (
        <div role="alert">
          <p>Author loaded, but the backend greeting is unavailable: {state.message}</p>
          <button type="button" onClick={() => void loadGreeting()}>
            Retry backend
          </button>
        </div>
      )}
    </section>
  );
}
