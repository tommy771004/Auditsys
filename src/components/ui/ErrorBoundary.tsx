import React, { Component, ErrorInfo, ReactNode } from "react";
import SolidButton from "./SolidButton";
import { AlertCircle } from "lucide-react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen w-full flex-col items-center justify-center bg-[var(--surface)] p-4">
          <div className="flex max-w-md flex-col items-center rounded-lg border border-[var(--border)] bg-[var(--surface)] p-8 text-center shadow-[4px_4px_0_rgba(0,0,0,1)]">
            <AlertCircle className="mb-4 h-12 w-12 text-rose-600" />
            <h1 className="mb-2 text-2xl font-bold font-grotesk tracking-tight text-[var(--text)]">
              Oops, something went wrong.
            </h1>
            <p className="mb-6 text-sm text-slate-600">
              {this.state.error?.message || "An unexpected error occurred."}
            </p>
            <SolidButton
              loadingLabel="Reloading..."
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
            >
              Reload Page
            </SolidButton>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
