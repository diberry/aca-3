import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
  readonly children: ReactNode;
}

interface ErrorBoundaryState {
  readonly failed: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public override state: ErrorBoundaryState = { failed: false };

  public static getDerivedStateFromError(): ErrorBoundaryState {
    return { failed: true };
  }

  public override componentDidCatch(error: Error, details: ErrorInfo): void {
    console.error("Shell render failed", error, details.componentStack);
  }

  public override render(): ReactNode {
    if (this.state.failed) {
      return (
        <main className="shell-main">
          <section className="feature-fallback" role="alert">
            <h1>The shell could not render this view</h1>
            <p>Reload the page. No internal error details were exposed.</p>
          </section>
        </main>
      );
    }
    return this.props.children;
  }
}
