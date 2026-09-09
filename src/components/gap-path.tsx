import { motion } from "motion/react";
import type { ComparisonResult } from "@/lib/mock/types";
import { cn } from "@/lib/utils";

/**
 * Trajectory visualization: YOU ──●──●──○──○──◎ TARGET
 * Strong matches are filled milestones; gaps are open nodes ahead.
 * The score is a position on the path, not a judgment.
 */
export function GapPath({ result }: { result: ComparisonResult }) {
  const strong = result.strongMatches.slice(0, 3).map((r) => ({ name: r.skill, state: "strong" as const }));
  const gaps = [
    ...result.criticalGaps.map((r) => ({ name: r.skill, state: "critical" as const })),
    ...result.skillsToImprove.map((r) => ({ name: r.skill, state: "improve" as const })),
  ].slice(0, 4);
  const milestones = [...strong, ...gaps];

  return (
    <div className="border border-border bg-card/40 px-6 py-10">
      <div className="mb-8 flex items-baseline justify-between">
        <span className="font-mono text-[11px] tracking-[0.25em] text-muted-foreground uppercase">
          Trajectory
        </span>
        <span className="font-mono text-sm text-foreground">
          {result.matchScore}% <span className="text-muted-foreground">of the way there</span>
        </span>
      </div>

      <div className="relative">
        {/* the line */}
        <motion.div
          className="absolute top-[7px] right-0 left-0 h-px bg-border"
          initial={{ scaleX: 0, originX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
        <div className="relative flex items-start justify-between">
          {/* YOU */}
          <div className="flex flex-col items-center gap-3">
            <motion.div
              className="size-[15px] rounded-full bg-foreground"
              initial={{ scale: 0 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true }}
            />
            <span className="font-mono text-[10px] tracking-[0.2em] text-foreground">YOU</span>
          </div>

          {milestones.map((m, i) => (
            <div key={m.name} className="flex flex-col items-center gap-3 px-1">
              <motion.div
                className={cn(
                  "size-[15px] rounded-full border-2",
                  m.state === "strong" && "border-success bg-success",
                  m.state === "improve" && "border-warning bg-background",
                  m.state === "critical" && "border-danger bg-background",
                )}
                initial={{ scale: 0 }}
                whileInView={{ scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.15 + i * 0.12, type: "spring", stiffness: 300, damping: 18 }}
              />
              <span
                className={cn(
                  "max-w-20 text-center font-mono text-[10px] leading-tight tracking-wider break-words",
                  m.state === "strong" ? "text-success" : m.state === "improve" ? "text-warning" : "text-danger",
                )}
              >
                {m.name.toUpperCase()}
              </span>
            </div>
          ))}

          {/* TARGET */}
          <div className="flex flex-col items-center gap-3">
            <motion.div
              className="flex size-[15px] items-center justify-center rounded-full border-2 border-foreground"
              initial={{ scale: 0 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.15 + milestones.length * 0.12 }}
            >
              <div className="size-[5px] rounded-full bg-foreground" />
            </motion.div>
            <span className="font-mono text-[10px] tracking-[0.2em] text-foreground">TARGET</span>
          </div>
        </div>
      </div>

      <p className="mt-8 text-center text-xs text-muted-foreground">
        You are not being scored. You are being shown a path.
      </p>
    </div>
  );
}
