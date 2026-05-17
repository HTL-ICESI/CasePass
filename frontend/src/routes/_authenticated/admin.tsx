import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { ShieldAlert } from "lucide-react";

import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const allowed = user?.role === "admin";

  useEffect(() => {
    if (user && !allowed) {
      // Soft redirect after render so non-admins don't see protected chrome.
      const t = setTimeout(() => navigate({ to: "/dashboard", replace: true }), 1200);
      return () => clearTimeout(t);
    }
  }, [user, allowed, navigate]);

  if (!allowed) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center px-6 py-24 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
          <ShieldAlert className="h-5 w-5" />
        </span>
        <h1 className="mt-4 font-display text-xl font-semibold">Admin only</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sending you back to your dashboard.
        </p>
        <Button variant="ghost" size="sm" className="mt-4" onClick={() => navigate({ to: "/dashboard" })}>
          Go now
        </Button>
      </div>
    );
  }

  return <Outlet />;
}
