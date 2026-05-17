import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { LogOut, ChevronDown, Moon, Sun, Menu, X } from "lucide-react";
import { useState, useRef, useEffect } from "react";

import { CasePassLogo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { useAuth, ROLE_LABEL, type Role } from "@/lib/auth";
import { useTheme } from "@/lib/theme";

type NavItem = { to: string; label: string; exact?: boolean };

const NAV_BY_ROLE: Record<Role, NavItem[]> = {
  solicitor: [
    { to: "/dashboard", label: "Dashboard", exact: true },
    { to: "/handoffs/new", label: "New handoff" },
    { to: "/inbox", label: "Inbox" },
  ],
  receiving: [
    { to: "/inbox", label: "Inbox", exact: true },
    { to: "/dashboard", label: "Dashboard" },
  ],
  admin: [
    { to: "/dashboard", label: "Dashboard", exact: true },
    { to: "/admin", label: "Firm", exact: true },
    { to: "/admin/users", label: "Users" },
  ],
};

export function TopNav() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  if (!user) return null;
  const items = NAV_BY_ROLE[user.role];
  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("");

  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-canvas/85 backdrop-blur supports-[backdrop-filter]:bg-canvas/65">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:gap-6 sm:px-6">
        <div className="flex items-center gap-4 md:gap-10">
          <button
            type="button"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-surface text-muted-foreground transition-colors hover:text-foreground md:hidden"
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
          <Link to="/dashboard" aria-label="CasePass home">
            <CasePassLogo size={32} />
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {items.map((it) => (
              <Link
                key={it.to}
                to={it.to}
                activeOptions={{ exact: it.exact ?? false }}
                className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground data-[status=active]:bg-indigo-soft/60 data-[status=active]:text-foreground data-[status=active]:font-medium"
              >
                {it.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground md:inline">
            {user.firm}
          </span>
          <button
            type="button"
            onClick={toggle}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              className="flex items-center gap-2 rounded-full border border-border bg-surface py-1 pl-1 pr-2.5 text-left transition-colors hover:border-foreground/30"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-onyx font-display text-[11px] font-semibold uppercase text-white">
                {initials}
              </span>
              <span className="hidden text-left leading-tight sm:block">
                <span className="block text-xs font-medium text-foreground">{user.name}</span>
                <span className="block font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                  {ROLE_LABEL[user.role]}
                </span>
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </button>

            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-56 overflow-hidden rounded-md border border-border bg-surface shadow-[var(--shadow-2)]"
              >
                <div className="border-b border-border/70 px-3 py-2.5">
                  <p className="text-xs font-medium text-foreground">{user.name}</p>
                  <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{user.email}</p>
                </div>
                <div className="p-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-sm"
                    onClick={() => {
                      logout();
                      navigate({ to: "/login" });
                    }}
                  >
                    <LogOut className="mr-2 h-4 w-4" /> Sign out
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {mobileOpen && (
        <nav className="border-t border-border/70 bg-surface px-4 py-3 md:hidden">
          <ul className="flex flex-col gap-1">
            {items.map((it) => (
              <li key={it.to}>
                <Link
                  to={it.to}
                  activeOptions={{ exact: it.exact ?? false }}
                  onClick={() => setMobileOpen(false)}
                  className="block rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground data-[status=active]:bg-indigo-soft/60 data-[status=active]:text-foreground data-[status=active]:font-medium"
                >
                  {it.label}
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-3 border-t border-border/70 pt-3 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            {user.firm}
          </p>
        </nav>
      )}
    </header>
  );
}
