import { cn } from "@/lib/utils";
import { PROFICIENCY_SCORE, type Proficiency } from "@/lib/mock/types";

const BAR_COLORS: Record<string, string> = {
  danger: "bg-danger",
  warning: "bg-warning",
  success: "bg-success",
  neutral: "bg-muted-foreground/50",
  primary: "bg-foreground",
};

export function ProficiencyBar({
  proficiency,
  color = "primary",
  className,
}: {
  proficiency: Proficiency | null;
  color?: keyof typeof BAR_COLORS;
  className?: string;
}) {
  const score = proficiency ? PROFICIENCY_SCORE[proficiency] : 0;
  return (
    <div className={cn("flex items-center gap-1", className)}>
      {[1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className={cn(
            "h-1.5 w-6 rounded-full",
            i <= score ? BAR_COLORS[color] : "bg-muted",
          )}
        />
      ))}
    </div>
  );
}

export function ScoreRing({ score, size = 140 }: { score: number; size?: number }) {
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const filled = (score / 100) * c;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-muted" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${filled} ${c - filled}`}
          className="stroke-success transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold tracking-tight">{score}%</span>
        <span className="text-xs text-muted-foreground">match</span>
      </div>
    </div>
  );
}
