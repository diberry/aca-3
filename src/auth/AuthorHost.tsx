import { useCallback, useEffect, useRef, useState } from "react";
import type { AuthenticatedUser } from "../../packages/auth-context/index.js";
import { loadAuthorRuntime } from "./runtime/author-loader.js";

interface AuthorHostProps {
  readonly user: AuthenticatedUser;
}

export function AuthorHost({ user }: AuthorHostProps) {
  const container = useRef<HTMLDivElement>(null);
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const retry = useCallback(() => setAttempt((current) => current + 1), []);

  useEffect(() => {
    let disposed = false;
    let unmount: (() => void) | undefined;
    setError(null);
    container.current?.setAttribute("data-load-attempt", String(attempt));

    void loadAuthorRuntime()
      .then(({ module }) => {
        if (!disposed && container.current) {
          unmount = module.mount({ element: container.current, user });
        }
      })
      .catch((reason: unknown) => {
        if (!disposed) {
          setError(reason instanceof Error ? reason.message : "Author is unavailable.");
        }
      });

    return () => {
      disposed = true;
      unmount?.();
    };
  }, [attempt, user]);

  if (error) {
    return (
      <section className="feature-fallback" role="alert">
        <h2>Author is temporarily unavailable</h2>
        <p>{error}</p>
        <button type="button" onClick={retry}>
          Retry Author
        </button>
      </section>
    );
  }

  return <div ref={container} aria-live="polite" />;
}
