import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("cp-skeleton rounded-md", className)}
      aria-hidden="true"
      {...props}
    />
  );
}

export { Skeleton };
