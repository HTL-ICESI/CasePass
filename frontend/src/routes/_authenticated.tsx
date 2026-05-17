import { createFileRoute, Outlet, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect } from "react";

import { TopNav } from "@/components/app/top-nav";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!isAuthenticated) navigate({ to: "/login", replace: true });
  }, [isAuthenticated, navigate]);

  if (!user) {
    // Render nothing until hydration completes / redirect fires.
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <span className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
          Loading workspace…
        </span>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <TopNav />
      <main className="flex-1">
        <AnimatedOutlet />
      </main>
    </div>
  );
}

function AnimatedOutlet() {
  const location = useLocation();
  return (
    <div key={location.pathname} className="cp-fade-up">
      <Outlet />
    </div>
  );
}
