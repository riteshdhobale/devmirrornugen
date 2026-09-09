import { Card } from "@/components/ui/card";
import { TechChip } from "@/components/status-badge";
import type { Project } from "@/lib/mock/types";
import { Star, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const COMPLEXITY_STYLES: Record<Project["complexity"], string> = {
  Beginner: "bg-muted text-muted-foreground border-border",
  Intermediate: "bg-warning/10 text-warning border-warning/25",
  Advanced: "bg-success/10 text-success border-success/25",
};

export function ProjectCard({ project }: { project: Project }) {
  return (
    <Card className="gap-0 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-mono font-medium">{project.name}</div>
          <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Star className="size-3" /> {project.stars}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3" /> {project.lastActive}
            </span>
          </div>
        </div>
        <span
          className={cn(
            "rounded-full border px-2.5 py-0.5 text-xs font-medium",
            COMPLEXITY_STYLES[project.complexity],
          )}
        >
          {project.complexity}
        </span>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{project.description}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {project.techStack.map((t) => (
          <TechChip key={t} name={t} />
        ))}
      </div>
      {project.signals.length > 0 && (
        <div className="mt-4 border-t border-border pt-3">
          <div className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Engineering signals
          </div>
          <div className="flex flex-wrap gap-1.5">
            {project.signals.map((s) => (
              <span
                key={s}
                className="inline-flex items-center gap-1 rounded-full border border-success/25 bg-success/10 px-2 py-0.5 text-xs text-success"
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
