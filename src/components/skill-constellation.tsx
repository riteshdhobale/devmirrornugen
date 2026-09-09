import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { ProficiencyBar } from "@/components/progress";
import { PROFICIENCY_LABEL, type Skill } from "@/lib/mock/types";

/**
 * 2D interactive skill constellation — the developer's universe.
 * Skills orbit the developer node; hover reveals evidence.
 */

const PROF_VALUE = { none: 0, beginner: 1, intermediate: 2, advanced: 3, expert: 4 } as const;

export function SkillConstellation({ skills, name }: { skills: Skill[]; name: string }) {
  const top = useMemo(
    () => skills.slice().sort((a, b) => b.confidence - a.confidence).slice(0, 10),
    [skills],
  );
  const [active, setActive] = useState<Skill | null>(top[0] ?? null);

  const W = 720;
  const H = 440;
  const cx = W / 2;
  const cy = H / 2;

  const nodes = useMemo(
    () =>
      top.map((s, i) => {
        const ring = i < 4 ? 0 : 1; // inner / outer ring
        const idx = ring === 0 ? i : i - 4;
        const count = ring === 0 ? Math.min(4, top.length) : top.length - Math.min(4, top.length);
        const angle = (idx / Math.max(1, count)) * Math.PI * 2 + (ring === 0 ? -Math.PI / 2 : -Math.PI / 3.2);
        const rx = ring === 0 ? 128 : 268;
        const ry = ring === 0 ? 88 : 164;
        return { skill: s, x: cx + Math.cos(angle) * rx, y: cy + Math.sin(angle) * ry };
      }),
    [top, cx, cy],
  );

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`Skill constellation for ${name}`}>
        {/* connections */}
        {nodes.map((n, i) => (
          <motion.line
            key={`l-${n.skill.name}`}
            x1={cx}
            y1={cy}
            x2={n.x}
            y2={n.y}
            stroke={active?.name === n.skill.name ? "var(--color-success)" : "var(--color-border)"}
            strokeWidth={active?.name === n.skill.name ? 1.4 : 1}
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ delay: 0.35 + i * 0.07, duration: 0.7, ease: "easeOut" }}
          />
        ))}
        {/* center node */}
        <motion.g initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5 }}>
          <circle cx={cx} cy={cy} r={7} fill="var(--color-foreground)" />
          <circle cx={cx} cy={cy} r={16} fill="none" stroke="var(--color-foreground)" strokeOpacity={0.25} />
        </motion.g>
        {/* skill nodes */}
        {nodes.map((n, i) => {
          const r = 4 + PROF_VALUE[n.skill.proficiency] * 1.6;
          const isActive = active?.name === n.skill.name;
          return (
            <motion.g
              key={n.skill.name}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.25 + i * 0.07, duration: 0.45, ease: "easeOut" }}
              onMouseEnter={() => setActive(n.skill)}
              onClick={() => setActive(n.skill)}
              className="cursor-pointer"
            >
              {isActive && (
                <circle cx={n.x} cy={n.y} r={r + 9} fill="none" stroke="var(--color-success)" strokeOpacity={0.5} />
              )}
              <circle
                cx={n.x}
                cy={n.y}
                r={r}
                fill={isActive ? "var(--color-success)" : "var(--color-secondary)"}
                stroke={isActive ? "var(--color-success)" : "var(--color-muted-foreground)"}
                strokeOpacity={isActive ? 1 : 0.5}
              />
              <text
                x={n.x}
                y={n.y - r - 7}
                textAnchor="middle"
                className="fill-muted-foreground font-mono"
                fontSize={10}
                letterSpacing={1.5}
              >
                {n.skill.name.toUpperCase()}
              </text>
            </motion.g>
          );
        })}
      </svg>

      {/* evidence panel */}
      {active && (
        <motion.div
          key={active.name}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="mx-auto mt-2 max-w-md border border-border bg-card/80 p-4 backdrop-blur"
        >
          <div className="flex items-center justify-between gap-4">
            <span className="font-mono text-sm font-medium tracking-wider">{active.name.toUpperCase()}</span>
            <span className="text-xs text-muted-foreground">
              {PROFICIENCY_LABEL[active.proficiency]} · {Math.round(active.confidence * 100)}% confidence
            </span>
          </div>
          <div className="mt-3 max-w-40">
            <ProficiencyBar proficiency={active.proficiency} />
          </div>
          <ul className="mt-3 space-y-1 border-t border-border pt-3">
            {active.evidence.slice(0, 3).map((e) => (
              <li key={e} className="font-mono text-xs text-muted-foreground">
                → {e}
              </li>
            ))}
          </ul>
        </motion.div>
      )}
    </div>
  );
}
