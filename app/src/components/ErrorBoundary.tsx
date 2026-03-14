"use client";
import { Component, ReactNode } from "react";

interface Props { children: ReactNode; fallback?: ReactNode; }
interface State { hasError: boolean; error?: Error; }

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error) {
    console.error("[ErrorBoundary]", error.message);
  }
  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div style={{ padding: "3rem 2rem", textAlign: "center", fontFamily: "'Inter',system-ui,sans-serif" }}>
          <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>⚠️</div>
          <h2 style={{ fontFamily: "'Sora',system-ui,sans-serif", fontWeight: 700, fontSize: "1.25rem", color: "#0A0F1E", margin: "0 0 .75rem" }}>Something went wrong</h2>
          <p style={{ color: "#6B7280", fontSize: ".9rem", marginBottom: "1.5rem" }}>This section encountered an error. Refresh to try again.</p>
          <button onClick={() => this.setState({ hasError: false })}
            style={{ fontFamily: "'Inter',system-ui,sans-serif", fontWeight: 600, fontSize: ".875rem", padding: ".625rem 1.5rem", borderRadius: "100px", background: "#0052FF", color: "white", border: "none", cursor: "pointer" }}>
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
