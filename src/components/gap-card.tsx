import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { PROFICIENCY_LABEL, type SkillComparison } from "@/lib/mock/types";

export function GapCard({ row }: { row: SkillComparison }) {
  return (
    <Card className="gap-0 p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="font-medium">{row.skill}</span>
        <StatusBadge status={row.status} />
      </div>
      <div className="mt-2 text-xs text-muted-foreground">
        You: {row.userProficiency ? PROFICIENCY_LABEL[row.userProficiency] : "No evidence"} · Target:{" "}
        {PROFICIENCY_LABEL[row.targetProficiency]}
      </div>
      {row.targetEvidence[0] && (
        <div className="mt-2 border-t border-border pt-2 text-xs text-muted-foreground">
          Target evidence: {row.targetEvidence[0]}
        </div>
      )}
    </Card>
  );
}
