import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { CasePassLogo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/app/theme-toggle";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — CasePass" },
      { name: "description", content: "Sign in to your CasePass workspace." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) navigate({ to: "/dashboard" });
  }, [isAuthenticated, navigate]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email || !password) return;
    setSubmitting(true);
    setError(null);
    try {
      await login(email, password);
      toast.success("Signed in successfully.");
      navigate({ to: "/dashboard" });
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Could not sign you in.";
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Form side */}
      <section className="flex flex-col bg-canvas px-6 py-10 lg:px-16">
        <div className="flex items-center justify-between">
          <Link to="/" className="self-start"><CasePassLogo /></Link>
          <ThemeToggle />
        </div>

        <div className="my-auto max-w-md cp-fade-up">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-indigo">Sign in</p>
          <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight">Open your workspace</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in with a real CasePass account. This screen now authenticates against the backend API.
          </p>

          <form onSubmit={onSubmit} className="mt-8 space-y-5">
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
                  onClick={() => toast.info("Password reset is not wired yet.")}
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

            {error && (
              <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}

            <Button type="submit" size="lg" className="w-full shadow-[var(--shadow-glow)]" disabled={submitting}>
              {submitting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing in</>
              ) : (
                <>Continue <ArrowRight className="ml-1 h-4 w-4" /></>
              )}
            </Button>

            <p className="text-center text-[11px] text-muted-foreground">
              Real auth · JWT session stored in this browser.
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
