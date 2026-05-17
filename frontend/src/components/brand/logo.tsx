import casePassIsotype from "@/assets/casepass-isotype.png";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  variant?: "dark" | "light";
  showWordmark?: boolean;
  showTagline?: boolean;
  size?: number;
};

/**
 * CasePass — Alternativa 3 "Expediente en movimiento"
 * Folder (onyx) + speed lines indigo a la izquierda + círculo indigo con flecha
 * a la derecha sobresaliendo. Wordmark Case (ink) + Pass (indigo).
 */
export function CasePassLogo({
  className,
  variant = "dark",
  showWordmark = true,
  showTagline = false,
  size = 40,
}: Props) {
  const ink = variant === "dark" ? "var(--onyx)" : "#FFFFFF";

  return (
    <div className={cn("inline-flex items-center gap-3", className)}>
      <img
        src={casePassIsotype}
        alt=""
        aria-hidden="true"
        className="h-auto w-auto shrink-0"
        style={{ height: size, width: size * 1.67 }}
      />

      {showWordmark && (
        <div className="flex flex-col leading-none">
          <span
            className="font-display font-bold"
            style={{
              color: ink,
              fontSize: size * 0.78,
              letterSpacing: "-0.03em",
              lineHeight: 1,
            }}
          >
            Case<span style={{ color: "var(--indigo)" }}>Pass</span>
          </span>
          {showTagline && (
            <span
              className="font-display italic mt-1.5"
              style={{
                color: variant === "dark" ? "var(--onyx-300)" : "rgba(255,255,255,0.75)",
                fontSize: size * 0.3,
                letterSpacing: "-0.005em",
              }}
            >
              Pass the case with context.
            </span>
          )}
        </div>
      )}
    </div>
  );
}
