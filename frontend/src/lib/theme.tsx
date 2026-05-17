import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

type Theme = "light" | "dark";
type Ctx = { theme: Theme; toggle: () => void };

const ThemeContext = createContext<Ctx | null>(null);
const KEY = "casepass.theme";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(KEY) as Theme | null;
      const prefers = window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      const next = stored ?? prefers;
      setTheme(next);
      document.documentElement.classList.toggle("dark", next === "dark");
    } catch {/* ignore */}
  }, []);

  const toggle = useCallback(() => {
    setTheme((t) => {
      const next = t === "dark" ? "light" : "dark";
      document.documentElement.classList.toggle("dark", next === "dark");
      try { window.localStorage.setItem(KEY, next); } catch {/* ignore */}
      return next;
    });
  }, []);

  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}
