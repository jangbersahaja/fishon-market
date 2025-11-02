/**
 * NotificationErrorBoundary Component
 *
 * Error boundary for notification components
 */

"use client";

import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import React from "react";

interface NotificationErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface NotificationErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class NotificationErrorBoundary extends React.Component<
  NotificationErrorBoundaryProps,
  NotificationErrorBoundaryState
> {
  constructor(props: NotificationErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[NotificationErrorBoundary] Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
          <AlertCircle className="w-12 h-12 mb-4 text-red-500" />
          <h3 className="mb-2 text-lg font-semibold">Something went wrong</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            We&#39;re having trouble loading notifications
          </p>
          <Button
            onClick={() => {
              this.setState({ hasError: false });
              window.location.reload();
            }}
            variant="outline"
          >
            Try again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
