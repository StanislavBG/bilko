/**
 * Per-app error boundary — ARCH-007 I4 (Error Containment).
 *
 * Wraps each route so a crash in one app never propagates to the
 * hub shell or other apps. The sidebar and header remain functional,
 * letting the user navigate away from a broken page.
 */

import { Component, type ReactNode, type ErrorInfo } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  /** Label shown in the fallback UI (e.g. "Landing", "Academy") */
  appName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class AppErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(
      `[AppErrorBoundary:${this.props.appName ?? "unknown"}]`,
      error,
      info.componentStack,
    );
  }

  private handleRecover = () => {
    this.setState({ hasError: false, error: null });
  };

  private handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="max-w-md text-center space-y-4">
            <h2 className="text-lg font-semibold">
              {this.props.appName
                ? `${this.props.appName} ran into a problem`
                : "Something went wrong"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {this.state.error?.message || "An unexpected error occurred."}
            </p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" size="sm" onClick={this.handleRecover}>
                Try again
              </Button>
              <Button variant="default" size="sm" onClick={this.handleGoHome}>
                Go home
              </Button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
