import { Component, type PropsWithChildren } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type ErrorBoundaryState = {
  hasError: boolean;
};

class ErrorBoundary extends Component<PropsWithChildren, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  override render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <main className="flex min-h-svh items-center justify-center bg-background p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Something went wrong</CardTitle>
            <CardDescription>TeamOS could not render this screen.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Reload the app to try again.</p>
          </CardContent>
          <CardFooter>
            <Button type="button" onClick={() => window.location.reload()}>
              Reload app
            </Button>
          </CardFooter>
        </Card>
      </main>
    );
  }
}

export { ErrorBoundary };
