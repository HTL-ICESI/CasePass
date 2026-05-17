import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, UserPlus, Mail } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MOCK_USERS, type FirmUser } from "@/lib/api/mock-users";
import { ROLE_LABEL, type Role } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/admin/users")({
  head: () => ({ meta: [{ title: "Users — CasePass" }] }),
  component: AdminUsersPage,
});

const ROLE_FILTERS: Array<{ value: Role | "all"; label: string }> = [
  { value: "all", label: "All" },
  { value: "solicitor", label: "Solicitors" },
  { value: "receiving", label: "Receiving" },
  { value: "admin", label: "Admins" },
];

function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<Role | "all">("all");

  const users = useMemo(() => {
    const q = search.trim().toLowerCase();
    return MOCK_USERS.filter((u) => {
      if (role !== "all" && u.role !== role) return false;
      if (!q) return true;
      return [u.name, u.email, u.title].join(" ").toLowerCase().includes(q);
    });
  }, [search, role]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-indigo">Admin</p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight md:text-4xl">Users</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Provision solicitors, receiving counsel and other admins. Role changes apply firm-wide.
          </p>
        </div>
        <Button className="gap-2"><UserPlus className="h-4 w-4" /> Invite user</Button>
      </header>

      <section className="mt-8 rounded-2xl border border-border bg-surface shadow-[var(--shadow-1)]">
        <div className="flex flex-wrap items-center gap-3 border-b border-border/70 p-4">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, title…"
              className="pl-9"
              aria-label="Search users"
            />
          </div>
          <div className="flex items-center gap-1 rounded-md border border-border bg-canvas p-1">
            {ROLE_FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setRole(f.value)}
                className={
                  "rounded px-3 py-1 font-mono text-[10px] uppercase tracking-wider transition-colors " +
                  (role === f.value
                    ? "bg-indigo-soft text-onyx"
                    : "text-muted-foreground hover:text-foreground")
                }
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/70 text-left font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="px-5 py-3 font-medium">User</th>
                <th className="px-3 py-3 font-medium">Role</th>
                <th className="px-3 py-3 font-medium">Matters</th>
                <th className="px-3 py-3 font-medium">Status</th>
                <th className="px-5 py-3 text-right font-medium">Joined</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => <UserRow key={u.id} u={u} />)}
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-16 text-center text-sm text-muted-foreground">
                    No users match those filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function UserRow({ u }: { u: FirmUser }) {
  const initials = u.name.split(" ").map((n) => n[0]).slice(0, 2).join("");
  return (
    <tr className="border-b border-border/50 last:border-b-0 transition-colors hover:bg-muted/40">
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-onyx font-display text-[11px] font-semibold uppercase text-white">
            {initials}
          </span>
          <div className="min-w-0">
            <p className="font-display text-sm font-semibold">{u.name}</p>
            <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Mail className="h-3 w-3" /> {u.email}
            </p>
          </div>
        </div>
      </td>
      <td className="px-3 py-4">
        <div className="flex flex-col">
          <span className="font-mono text-[10px] uppercase tracking-wider text-foreground">
            {ROLE_LABEL[u.role]}
          </span>
          <span className="text-xs text-muted-foreground">{u.title}</span>
        </div>
      </td>
      <td className="px-3 py-4 font-mono text-xs">{u.activeMatters}</td>
      <td className="px-3 py-4"><StatusPill status={u.status} /></td>
      <td className="px-5 py-4 text-right font-mono text-[11px] text-muted-foreground">
        {new Date(u.joinedAt).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}
      </td>
    </tr>
  );
}

function StatusPill({ status }: { status: FirmUser["status"] }) {
  const map: Record<FirmUser["status"], { label: string; cls: string }> = {
    active: { label: "Active", cls: "bg-mint-soft text-onyx" },
    invited: { label: "Invited", cls: "bg-indigo-soft text-onyx" },
    disabled: { label: "Disabled", cls: "bg-muted text-muted-foreground" },
  };
  const m = map[status];
  return <span className={"inline-flex rounded-full px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider " + m.cls}>{m.label}</span>;
}
