import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export type Role = "solicitor" | "receiving" | "admin";

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  firm: string;
};

type AuthState = {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string, role: Role) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthState | null>(null);
const STORAGE_KEY = "casepass.user";

const ROLE_PROFILE: Record<Role, { name: string; firm: string }> = {
  solicitor: { name: "Eleanor Hayes", firm: "Hayes & Whitman LLP" },
  receiving: { name: "James Okafor", firm: "Hayes & Whitman LLP" },
  admin:     { name: "Margot Lee", firm: "Hayes & Whitman LLP" },
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
      if (raw) setUser(JSON.parse(raw) as User);
    } catch { /* ignore */ }
    setHydrated(true);
  }, []);

  const login = useCallback(async (email: string, _password: string, role: Role) => {
    await new Promise((r) => setTimeout(r, 400));
    const profile = ROLE_PROFILE[role];
    const next: User = {
      id: `usr_${role}_${Date.now()}`,
      email,
      role,
      name: profile.name,
      firm: profile.firm,
    };
    setUser(next);
    if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    if (typeof window !== "undefined") window.localStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user && hydrated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

export const ROLE_LABEL: Record<Role, string> = {
  solicitor: "Solicitor",
  receiving: "Receiving counsel",
  admin: "Firm admin",
};
