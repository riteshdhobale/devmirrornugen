import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { Check, Loader2, Circle } from "lucide-react";

const STEPS = [
  "Reading repositories",
  "Mapping technologies",
  "Analyzing project architecture",
  "Identifying skill patterns",
  "Detecting technical trajectory",
  "Building developer profile",
];

const NODES = ["PY", "API", "DB", "AI", "CI", "RAG", "JS"];

/**
 * Cinematic analysis sequence — monospace step checklist with a progress bar
 * while skill nodes materialize. Calls onComplete when finished.
 */
export function ScanningSequence({ username, onComplete }: { username: string; onComplete: () => void }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const stepMs = 420;
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 1; i <= STEPS.length; i++) {
      timers.push(setTimeout(() => setStep(i), i * stepMs));
    }
    timers.push(setTimeout(onComplete, STEPS.length * stepMs + 550));
    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  const progress = Math.min(1, step / STEPS.length);
  const bars = Math.round(progress * 18);

  const nodePositions = useMemo(
    () =>
      NODES.map((_, i) => ({
        left: `${8 + ((i * 37) % 82)}%`,
        top: `${12 + ((i * 53) % 68)}%`,
        delay: 0.3 + i * 0.32,
      })),
    [],
  );

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background"
      exit={{ opacity: 0, transition: { duration: 0.5 } }}
    >
      {/* forming nodes backdrop */}
      <div className="absolute inset-0 overflow-hidden">
        {nodePositions.map((p, i) => (
          <motion.span
            key={NODES[i]}
            className="absolute flex size-9 items-center justify-center rounded-full border border-success/30 font-mono text-[10px] text-success/70"
            style={{ left: p.left, top: p.top }}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: p.delay, duration: 0.6, ease: "easeOut" }}
          >
            {NODES[i]}
          </motion.span>
        ))}
      </div>

      <div className="relative w-full max-w-md px-6">
        <div className="font-mono text-[11px] tracking-[0.25em] text-muted-foreground uppercase">
          Initializing developer intelligence
        </div>
        <div className="mt-1 font-mono text-sm text-foreground">@{username}</div>

        <div className="mt-5 font-mono text-sm tracking-wider text-success" aria-hidden>
          [{"█".repeat(bars)}
          {"░".repeat(18 - bars)}]
        </div>

        <ul className="mt-6 space-y-2.5">
          {STEPS.map((label, i) => {
            const done = step > i;
            const active = step === i;
            return (
              <motion.li
                key={label}
                className="flex items-center gap-3 font-mono text-sm"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: step >= i ? 1 : 0.3, x: 0 }}
                transition={{ duration: 0.3 }}
              >
                {done ? (
                  <Check className="size-4 text-success" />
                ) : active ? (
                  <Loader2 className="size-4 animate-spin text-foreground" />
                ) : (
                  <Circle className="size-4 text-muted-foreground/40" />
                )}
                <span className={done ? "text-muted-foreground" : "text-foreground"}>{label}</span>
              </motion.li>
            );
          })}
        </ul>
      </div>
    </motion.div>
  );
}
