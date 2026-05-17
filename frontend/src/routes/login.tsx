import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth, type Role, ROLE_LABEL } from "@/lib/auth";
import { CasePassLogo } from "@/components/brand/logo";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — CasePass" },
      { name: "description", content: "Sign in to your CasePass workspace." },
    ],
  }),
  component: LoginPage,
});

const DEMO_EMAILS: Record<Role, string> = {
  solicitor: "eleanor@hayes-whitman.law",
  receiving: "james@hayes-whitman.law",
  admin: "margot@hayes-whitman.law",
};

function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [role, setRole] = useState<Role>("solicitor");
  const [email, setEmail] = useState(DEMO_EMAILS.solicitor);
  const [password, setPassword] = useState("demo-pass");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthenticated) navigate({ to: "/dashboard" });
  }, [isAuthenticated, navigate]);

  useEffect(() => { setEmail(DEMO_EMAILS[role]); }, [role]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email || !password) return;
    setSubmitting(true);
    try {
      await login(email, password, role);
      toast.success(`Welcome, ${ROLE_LABEL[role].toLowerCase()}`);
      navigate({ to: "/dashboard" });
    } catch {
      toast.error("Could not sign you in.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Form side */}
      <section className="flex flex-col bg-canvas px-6 py-10 lg:px-16">
        <Link to="/" className="self-start"><CasePassLogo /></Link>

        <div className="my-auto max-w-md cp-fade-up">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-indigo">Sign in</p>
          <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight">Open your workspace</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This is a working demo. Pick a role to explore the matter you'd be handed.
          </p>

          <form onSubmit={onSubmit} className="mt-8 space-y-5">
            <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Demo role">
              {(Object.keys(ROLE_LABEL) as Role[]).map((r) => {
                const active = role === r;
                return (
                  <button
                    type="button"
                    key={r}
                    role="radio"
                    aria-checked={active}
                    onClick={() => setRole(r)}
                    className={
                      "rounded-md border px-3 py-2 text-left text-xs font-medium transition-all " +
                      (active
                        ? "border-indigo bg-indigo-soft/60 text-foreground shadow-[var(--shadow-glow)]"
                        : "border-border bg-surface text-muted-foreground hover:border-foreground/30 hover:text-foreground")
                    }
                  >
                    <span className="block font-display text-sm font-semibold text-foreground">
                      {ROLE_LABEL[r]}
                    </span>
                    <span className="mt-0.5 block text-[10px] uppercase tracking-wider text-muted-foreground">
                      {r === "solicitor" && "Owns matters"}
                      {r === "receiving" && "Receives handoffs"}
                      {r === "admin" && "Oversees firm"}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Work email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => toast.info("Demo build — password reset is mocked.")}
                >
                  Forgot?
                </button>
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>

            <Button type="submit" size="lg" className="w-full shadow-[var(--shadow-glow)]" disabled={submitting}>
              {submitting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing in</>
              ) : (
                <>Continue as {ROLE_LABEL[role]} <ArrowRight className="ml-1 h-4 w-4" /></>
              )}
            </Button>

            <p className="text-center text-[11px] text-muted-foreground">
              Mock auth · no network call · session lives in this browser.
            </p>
          </form>
        </div>

        <p className="mt-8 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">← Back to overview</Link>
        </p>
      </section>

      {/* Editorial side */}
      <aside className="relative hidden overflow-hidden bg-onyx text-white lg:block">
        <div className="cp-grid-bg absolute inset-0 opacity-50" aria-hidden />
        <div
          className="pointer-events-none absolute -bottom-32 -right-24 h-[480px] w-[480px] rounded-full opacity-40 blur-3xl"
          style={{ background: "radial-gradient(closest-side, var(--indigo), transparent 70%)" }}
          aria-hidden
        />
        <div className="relative flex h-full flex-col justify-between px-14 py-16">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em] text-white/70">
            <span className="h-1.5 w-1.5 rounded-full bg-mint cp-pulse" /> Evidence-first
          </span>
          <div>
            <p className="font-display text-3xl font-medium leading-tight text-white md:text-[40px] md:leading-[1.1]">
              "The brief landed in my inbox at 7:42. By 8:10 I knew the matter as well as the partner who'd held it for six months."
            </p>
            <p className="mt-6 font-mono text-xs uppercase tracking-[0.16em] text-white/60">
              Receiving counsel · pilot
            </p>
          </div>
          <span
            className="font-display font-bold text-white"
            style={{ fontSize: 32, letterSpacing: "-0.03em", lineHeight: 1 }}
          >
            Case<span style={{ color: "var(--indigo)" }}>Pass</span>
          </span>
        </div>
      </aside>
    </div>
  );
}
