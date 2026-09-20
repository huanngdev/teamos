import { Link, useParams } from "react-router";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/*
 * Explicit not-found route. Unknown URLs previously redirected to `/`, which
 * silently hid typos and broken links.
 */
function NotFoundRoute() {
  const { "*": splat } = useParams();
  const path = splat === undefined || splat.length === 0 ? "/" : `/${splat}`;

  return (
    <main className="flex min-h-svh items-center justify-center bg-background p-4 sm:p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Page not found</CardTitle>
          <CardDescription>
            <span className="block">We could not find a page at {path}.</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link className={buttonVariants({ className: "w-full", variant: "outline" })} to="/">
            Go to your workspaces
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}

export { NotFoundRoute };
