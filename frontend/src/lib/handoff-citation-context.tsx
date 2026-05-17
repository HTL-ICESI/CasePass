/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, type ReactNode } from "react";
import type { Citation } from "@/lib/api";

type CitationContextValue = {
  openCitation: (citation: Citation) => void;
};

const CitationContext = createContext<CitationContextValue | null>(null);

export function useOpenCitation() {
  return useContext(CitationContext)?.openCitation;
}

export function CitationProvider({
  value,
  children,
}: {
  value: CitationContextValue;
  children: ReactNode;
}) {
  return <CitationContext.Provider value={value}>{children}</CitationContext.Provider>;
}
