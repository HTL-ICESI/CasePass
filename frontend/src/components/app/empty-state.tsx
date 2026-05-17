import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
  tone?: "default" | "mint" | "indigo";
};

const TONE: Record<NonNullable<Props["tone"]>, string> = {
  default: "bg-muted text-foreground",
  mint: "bg-mint-soft text-onyx",
  indigo: "bg-indigo-soft text-onyx",
};

/**
 * Reusable, brand-consistent empty state.
 * Use across dashboards, lists and tabs whenever a query returns no rows.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  tone = "default",
}: Props) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface px-6 py-14 text-center",
        className,
      )}
    >
      {icon && (
        <span
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-xl",
            TONE[tone],
          )}
        >
          {icon}
        </span>
      )}
      <h3 className="mt-4 font-display text-lg font-semibold text-foreground">
        {title}
      </h3>
      {description && (
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
