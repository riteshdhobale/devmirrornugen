import { cn } from "@/lib/utils";
import type { GapStatus } from "@/lib/mock/types";

const STATUS_STYLES: Record<GapStatus, { label: string; className: string; dot: string }> = {
  critical: { label: "Critical Gap", className: "bg-danger/10 text-danger border-danger/25", dot: "bg-danger" },
  improve: { label: "Improve", className: "bg-warning/10 text-warning border-warning/25", dot: "bg-warning" },
  match: { label: "Match", className: "bg-success/10 text-success border-success/25", dot: "bg-success" },
  "not-required": { label: "Not Required", className: "bg-muted text-muted-foreground border-border", dot: "bg-neutral-status" },
};

export function StatusBadge({ status, className }: { status: GapStatus; className?: string }) {
  const s = STATUS_STYLES[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        s.className,
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", s.dot)} />
      {s.label}
    </span>
  );
}

export function ProficiencyBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-md border border-border bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
      {label}
    </span>
  );
}

export function TechChip({ name, dim }: { name: string; dim?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 font-mono text-xs",
        dim ? "border-border text-muted-foreground" : "border-border bg-secondary text-secondary-foreground",
      )}
    >
      {name}
    </span>
  );
}
