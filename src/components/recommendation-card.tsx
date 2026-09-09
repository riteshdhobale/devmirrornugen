import { Card } from "@/components/ui/card";
import type { Recommendation } from "@/lib/mock/types";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

const PRIORITY_STYLES: Record<Recommendation["priority"], string> = {
  High: "bg-danger/10 text-danger border-danger/25",
  Medium: "bg-warning/10 text-warning border-warning/25",
  Low: "bg-muted text-muted-foreground border-border",
};

export function RecommendationCard({ rec }: { rec: Recommendation }) {
  return (
    <Card className="gap-0 p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-semibold">{rec.skill}</h3>
        <span className={cn("rounded-full border px-2.5 py-0.5 text-xs font-medium", PRIORITY_STYLES[rec.priority])}>
          {rec.priority} priority
        </span>
      </div>
      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
        <span>{rec.currentLevel}</span>
        <ArrowRight className="size-3" />
        <span className="text-foreground">{rec.targetLevel}</span>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{rec.whyItMatters}</p>
      <div className="mt-3">
        <div className="mb-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          What you should learn
        </div>
        <div className="flex flex-wrap gap-1.5">
          {rec.whatToLearn.map((item) => (
            <span key={item} className="rounded-md border border-border bg-secondary px-2 py-0.5 text-xs">
              {item}
            </span>
          ))}
        </div>
      </div>
      <div className="mt-4 rounded-md border border-border bg-muted/40 p-3 text-sm">
        <span className="font-medium">Recommended goal: </span>
        <span className="text-muted-foreground">{rec.recommendedGoal}</span>
      </div>
    </Card>
  );
}
