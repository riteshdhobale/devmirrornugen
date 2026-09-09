import { lazy, Suspense, useEffect, useState } from "react";

const SkillUniverseCanvas = lazy(() => import("@/components/skill-universe-canvas"));

function useReducedMotion() {
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

/** Static starfield fallback for SSR / reduced motion / slow devices. */
function StaticFallback() {
  return (
    <div
      aria-hidden
      className="absolute inset-0"
      style={{
        backgroundImage:
          "radial-gradient(1px 1px at 12% 30%, rgba(143,163,200,0.5) 50%, transparent 51%)," +
          "radial-gradient(1px 1px at 38% 72%, rgba(143,163,200,0.4) 50%, transparent 51%)," +
          "radial-gradient(1.5px 1.5px at 64% 22%, rgba(74,222,128,0.45) 50%, transparent 51%)," +
          "radial-gradient(1px 1px at 82% 58%, rgba(143,163,200,0.45) 50%, transparent 51%)," +
          "radial-gradient(1px 1px at 52% 44%, rgba(143,163,200,0.3) 50%, transparent 51%)," +
          "radial-gradient(1.5px 1.5px at 24% 82%, rgba(143,163,200,0.35) 50%, transparent 51%)",
      }}
    />
  );
}

export function SkillUniverse({ className }: { className?: string }) {
  const [mounted, setMounted] = useState(false);
  const reduced = useReducedMotion();
  useEffect(() => setMounted(true), []);

  return (
    <div className={className} aria-hidden>
      {mounted && !reduced ? (
        <Suspense fallback={<StaticFallback />}>
          <SkillUniverseCanvas />
        </Suspense>
      ) : (
        <StaticFallback />
      )}
    </div>
  );
}
