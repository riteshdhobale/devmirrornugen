import { ProficiencyBar } from "@/components/progress";
import { StatusBadge } from "@/components/status-badge";
import { PROFICIENCY_LABEL, type SkillComparison } from "@/lib/mock/types";
import { cn } from "@/lib/utils";

export function ComparisonRow({ row }: { row: SkillComparison }) {
  return (
    <div
      className={cn(
        "grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 border-b border-border px-4 py-3 last:border-0 sm:grid-cols-[180px_1fr_1fr_auto]",
        row.status === "not-required" && "opacity-55",
      )}
    >
      <div className="font-medium">{row.skill}</div>
      <div className="flex items-center gap-2">
        <ProficiencyBar proficiency={row.userProficiency} color={row.userProficiency ? "primary" : "neutral"} />
        <span className="w-24 text-xs text-muted-foreground">
          {row.userProficiency ? PROFICIENCY_LABEL[row.userProficiency] : "No evidence"}
        </span>
      </div>
      <div className="hidden items-center gap-2 sm:flex">
        <ProficiencyBar proficiency={row.targetProficiency} color="success" />
        <span className="w-24 text-xs text-muted-foreground">{PROFICIENCY_LABEL[row.targetProficiency]}</span>
      </div>
      <StatusBadge status={row.status} />
    </div>
  );
}
