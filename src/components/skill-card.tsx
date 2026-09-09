import { Card } from "@/components/ui/card";
import { ProficiencyBar } from "@/components/progress";
import { PROFICIENCY_LABEL, type Skill } from "@/lib/mock/types";
import { CheckCircle2 } from "lucide-react";

function evidenceLabel(skill: Skill): string {
  if (skill.confidence >= 0.75) return "Strong evidence";
  if (skill.confidence >= 0.5) return "Moderate evidence";
  return "Limited evidence";
}

export function SkillCard({ skill }: { skill: Skill }) {
  return (
    <Card className="gap-0 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-medium">{skill.name}</div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            {PROFICIENCY_LABEL[skill.proficiency]} · {evidenceLabel(skill)} ({Math.round(skill.confidence * 100)}%)
          </div>
        </div>
        <ProficiencyBar proficiency={skill.proficiency} />
      </div>
      <ul className="mt-3 space-y-1.5 border-t border-border pt-3">
        {skill.evidence.slice(0, 3).map((e) => (
          <li key={e} className="flex items-start gap-2 text-xs text-muted-foreground">
            <CheckCircle2 className="mt-0.5 size-3 shrink-0 text-success" />
            {e}
          </li>
        ))}
      </ul>
    </Card>
  );
}
