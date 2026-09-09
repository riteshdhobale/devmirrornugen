import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ScanSearch, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export function SiteHeader() {
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session)));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") setSignedIn(true);
      if (event === "SIGNED_OUT") setSignedIn(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <ScanSearch className="size-5 text-success" />
          DevMirror
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link
            to="/"
            className="rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:text-foreground"
            activeProps={{ className: "text-foreground" }}
            activeOptions={{ exact: true }}
          >
            Analyze
          </Link>
          <Link
            to="/compare"
            className="rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:text-foreground"
            activeProps={{ className: "text-foreground" }}
          >
            Compare
          </Link>
          <Link
            to="/roles"
            className="rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:text-foreground"
            activeProps={{ className: "text-foreground" }}
          >
            Roles
          </Link>
          <Link
            to="/recruiter"
            className="rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:text-foreground"
            activeProps={{ className: "text-foreground" }}
          >
            Recruiter
          </Link>
          <Link
            to="/pricing"
            className="rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:text-foreground"
            activeProps={{ className: "text-foreground" }}
            activeOptions={{ exact: true }}
          >
            Pricing
          </Link>

          {signedIn ? (
            <Link
              to="/dashboard"
              className="rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:text-foreground"
              activeProps={{ className: "text-foreground" }}
            >
              Mission log
            </Link>
          ) : (
            // Plain anchor, not Link: after the client-side auth redirect the
            // link's active state differs from the SSR'd header and React
            // reports a hydration mismatch.
            <a
              href="/auth"
              className="ml-1 inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
            >
              <User className="size-3.5" /> Sign in
            </a>
          )}
        </nav>
      </div>
    </header>
  );
}
