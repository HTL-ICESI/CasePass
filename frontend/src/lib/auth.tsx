import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Role = "solicitor" | "receiving" | "admin";

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  firm: string;
  backendRole: string;
  legalRole?: string | null;
};

type StoredSession = {
  token: string;
  user: User;
};

type AuthState = {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthState | null>(null);
const USER_STORAGE_KEY = "casepass.user";
const TOKEN_STORAGE_KEY = "casepass.token";

function deriveRole(role: string, legalRole?: string | null): Role {
  if (role === "admin") {
    return "admin";
  }

  if (["local_agent", "advocate_hearing_only", "counsel"].includes(legalRole || "")) {
    return "receiving";
  }

  return "solicitor";
}

function deriveFirm(email: string) {
  const domain = email.split("@")[1] || "casepass.local";
  return domain.replace(/\.[a-z]+$/i, "").replace(/[.-]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function mapBackendUser(user: { id: string; name: string; email: string; role: string; legal_role?: string | null }) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: deriveRole(user.role, user.legal_role),
    firm: deriveFirm(user.email),
    backendRole: user.role,
    legalRole: user.legal_role || null,
  } satisfies User;
}

async function loginRequest(email: string, password: string) {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw Object.assign(new Error(body.error || "Could not sign you in."), { status: response.status });
  }

  return body as { token: string; user: { id: string; name: string; email: string; role: string; legal_role?: string | null } };
}

export function getStoredToken() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        const rawUser = window.localStorage.getItem(USER_STORAGE_KEY);
        const rawToken = window.localStorage.getItem(TOKEN_STORAGE_KEY);
        if (rawUser && rawToken) {
          setUser(JSON.parse(rawUser) as User);
          setToken(rawToken);
        }
      }
    } catch {
      // ignore
    }
    setHydrated(true);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await loginRequest(email, password);
    const mappedUser = mapBackendUser(data.user);

    setUser(mappedUser);
    setToken(data.token);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(mappedUser));
      window.localStorage.setItem(TOKEN_STORAGE_KEY, data.token);
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(USER_STORAGE_KEY);
      window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthenticated: hydrated && Boolean(user && token),
      login,
      logout,
    }),
    [hydrated, login, logout, token, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
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
