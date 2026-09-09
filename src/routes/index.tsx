import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { SkillUniverse } from "@/components/skill-universe";
import { ArrowRight, CornerDownLeft } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DevMirror — Know where you stand" },
      { name: "description", content: "Analyze any GitHub developer, compare yourself against them, see the exact gap between you, and navigate the path forward." },
      { property: "og:title", content: "DevMirror — Know where you stand" },
      { property: "og:description", content: "Developer skills are a universe. Comparison reveals the distance. The gap becomes a path." },
    ],
  }),
  component: Index,
});

const HEADLINES = ["Know where you stand.", "Know where you're going.", "Find the gap."];

function normalizeUsername(input: string): string {
  return input.trim().replace(/^https?:\/\/(www\.)?github\.com\//i, "").replace(/\/+$/, "").split("/")[0] ?? "";
}

function CommandInput() {
  const navigate = useNavigate();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const analyze = () => {
    const username = normalizeUsername(value);
    if (!username) {
      setError("Enter a GitHub username or profile URL.");
      return;
    }
    navigate({ to: "/analyze/$username", params: { username } });
  };

  return (
    <div className="w-full max-w-xl">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          analyze();
        }}
        className="group flex items-center gap-3 border border-border bg-card/60 px-5 py-4 backdrop-blur transition-colors focus-within:border-success/50 hover:border-muted-foreground/30"
      >
        <span className="font-mono text-sm text-success" aria-hidden>
          ›
        </span>
        <input
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError(null);
          }}
          placeholder="github.com/username"
          aria-label="GitHub username or URL"
          className="flex-1 bg-transparent font-mono text-sm text-foreground outline-none placeholder:text-muted-foreground/60"
        />
        <button
          type="submit"
          className="flex items-center gap-2 font-mono text-xs tracking-[0.2em] text-muted-foreground uppercase transition-colors group-focus-within:text-success hover:text-foreground"
        >
          Analyze <CornerDownLeft className="size-3.5" />
        </button>
      </form>
      {error && <p className="mt-2 font-mono text-xs text-danger">{error}</p>}
      <p className="mt-3 font-mono text-xs text-muted-foreground/70">
        any real GitHub username works · demos:{" "}
        {["arjun-builds", "sofia-backend", "lena-ships"].map((u, i) => (
          <span key={u}>
            {i > 0 && " · "}
            <button type="button" className="underline underline-offset-4 transition-colors hover:text-foreground" onClick={() => setValue(u)}>
              {u}
            </button>
          </span>
        ))}
      </p>
    </div>
  );
}

/* ---------- scroll story scenes ---------- */

function Scene({
  index,
  headline,
  body,
  children,
}: {
  index: string;
  headline: string;
  body: string;
  children: React.ReactNode;
}) {
  return (
    <motion.section
      className="mx-auto grid max-w-5xl items-center gap-10 px-6 py-28 md:grid-cols-2"
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-120px" }}
      transition={{ duration: 0.7, ease: "easeOut" }}
    >
      <div className={Number(index) % 2 === 0 ? "md:order-2" : ""}>
        <div className="font-mono text-xs tracking-[0.3em] text-success">{index}</div>
        <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">{headline}</h2>
        <p className="mt-4 max-w-md text-muted-foreground">{body}</p>
      </div>
      <div className={Number(index) % 2 === 0 ? "md:order-1" : ""}>{children}</div>
    </motion.section>
  );
}

function SceneGraph({ variant }: { variant: 1 | 2 | 3 | 4 }) {
  // Minimal SVG vignettes: node → connecting → two universes + gap → path
  return (
    <svg viewBox="0 0 400 220" className="w-full" aria-hidden>
      {variant === 1 && (
        <>
          <circle cx={200} cy={110} r={6} fill="var(--color-foreground)" />
          <circle cx={200} cy={110} r={18} fill="none" stroke="var(--color-foreground)" strokeOpacity={0.2} />
          <text x={200} y={150} textAnchor="middle" className="fill-muted-foreground font-mono" fontSize={10} letterSpacing={2}>
            YOU ARE HERE
          </text>
        </>
      )}
      {variant === 2 && (
        <>
          {[
            [120, 60, "PY"],
            [280, 55, "API"],
            [95, 155, "DB"],
            [305, 160, "AI"],
          ].map(([x, y, l]) => (
            <g key={l as string}>
              <line x1={200} y1={110} x2={x as number} y2={y as number} stroke="var(--color-border)" />
              <circle cx={x as number} cy={y as number} r={5} fill="var(--color-secondary)" stroke="var(--color-muted-foreground)" strokeOpacity={0.5} />
              <text x={x as number} y={(y as number) - 12} textAnchor="middle" className="fill-muted-foreground font-mono" fontSize={9} letterSpacing={1.5}>
                {l}
              </text>
            </g>
          ))}
          <circle cx={200} cy={110} r={6} fill="var(--color-foreground)" />
        </>
      )}
      {variant === 3 && (
        <>
          {/* your universe */}
          <circle cx={90} cy={110} r={5} fill="var(--color-foreground)" />
          <circle cx={50} cy={60} r={4} fill="var(--color-secondary)" stroke="var(--color-muted-foreground)" strokeOpacity={0.5} />
          <circle cx={135} cy={70} r={4} fill="var(--color-secondary)" stroke="var(--color-muted-foreground)" strokeOpacity={0.5} />
          <line x1={90} y1={110} x2={50} y2={60} stroke="var(--color-border)" />
          <line x1={90} y1={110} x2={135} y2={70} stroke="var(--color-border)" />
          {/* target universe */}
          <circle cx={310} cy={110} r={5} fill="none" stroke="var(--color-foreground)" strokeWidth={1.5} />
          <circle cx={270} cy={60} r={4} fill="var(--color-secondary)" stroke="var(--color-muted-foreground)" strokeOpacity={0.5} />
          <circle cx={355} cy={70} r={4} fill="var(--color-secondary)" stroke="var(--color-muted-foreground)" strokeOpacity={0.5} />
          <circle cx={340} cy={165} r={4} fill="var(--color-secondary)" stroke="var(--color-muted-foreground)" strokeOpacity={0.5} />
          <line x1={310} y1={110} x2={270} y2={60} stroke="var(--color-border)" />
          <line x1={310} y1={110} x2={355} y2={70} stroke="var(--color-border)" />
          <line x1={310} y1={110} x2={340} y2={165} stroke="var(--color-border)" />
          {/* gap zone */}
          <text x={200} y={80} textAnchor="middle" className="fill-danger font-mono" fontSize={9} letterSpacing={2}>
            GAP ZONE
          </text>
          <line x1={150} y1={110} x2={250} y2={110} stroke="var(--color-danger)" strokeOpacity={0.4} strokeDasharray="3 5" />
          <circle cx={200} cy={130} r={4} fill="none" stroke="var(--color-danger)" strokeWidth={1.5} />
          <circle cx={185} cy={160} r={4} fill="none" stroke="var(--color-danger)" strokeWidth={1.5} />
          <circle cx={218} cy={158} r={4} fill="none" stroke="var(--color-danger)" strokeWidth={1.5} />
        </>
      )}
      {variant === 4 && (
        <>
          <line x1={30} y1={110} x2={370} y2={110} stroke="var(--color-border)" />
          <circle cx={30} cy={110} r={6} fill="var(--color-foreground)" />
          <circle cx={115} cy={110} r={5} fill="var(--color-success)" />
          <circle cx={200} cy={110} r={5} fill="none" stroke="var(--color-warning)" strokeWidth={2} />
          <circle cx={285} cy={110} r={5} fill="none" stroke="var(--color-danger)" strokeWidth={2} />
          <circle cx={370} cy={110} r={6} fill="none" stroke="var(--color-foreground)" strokeWidth={2} />
          <circle cx={370} cy={110} r={2} fill="var(--color-foreground)" />
          <text x={30} y={140} textAnchor="middle" className="fill-muted-foreground font-mono" fontSize={9} letterSpacing={1.5}>YOU</text>
          <text x={370} y={140} textAnchor="middle" className="fill-muted-foreground font-mono" fontSize={9} letterSpacing={1.5}>TARGET</text>
        </>
      )}
    </svg>
  );
}

/* ---------- page ---------- */

function Index() {
  const [headlineIdx, setHeadlineIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setHeadlineIdx((i) => (i + 1) % HEADLINES.length), 3200);
    return () => clearInterval(id);
  }, []);

  return (
    <main>
      {/* ── hero ── */}
      <section className="relative flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center overflow-hidden px-6">
        <SkillUniverse className="absolute inset-0 opacity-70" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,var(--color-background)_78%)]" />

        <div className="relative flex flex-col items-center text-center">
          <div className="mb-6 font-mono text-[11px] tracking-[0.35em] text-muted-foreground uppercase">
            Live GitHub intelligence
          </div>

          <div className="h-[1.2em] sm:h-auto">
            <AnimatePresence mode="wait">
              <motion.h1
                key={headlineIdx}
                className="font-display text-5xl font-bold tracking-tight text-balance sm:text-7xl"
                initial={{ opacity: 0, y: 24, filter: "blur(6px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -24, filter: "blur(6px)" }}
                transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              >
                {HEADLINES[headlineIdx]}
              </motion.h1>
            </AnimatePresence>
          </div>

          <p className="mt-6 max-w-md text-muted-foreground">
            Two developers. Two universes.{" "}
            <span className="text-foreground">We measure the distance — and chart the course across.</span>
          </p>

          <div className="mt-10 flex w-full justify-center">
            <CommandInput />
          </div>

          <Link to="/compare" className="mt-6">
            <span className="story-link font-mono text-xs tracking-[0.25em] text-muted-foreground uppercase transition-colors hover:text-foreground">
              Compare with me <ArrowRight className="inline size-3" />
            </span>
          </Link>
        </div>

        <div className="absolute bottom-6 font-mono text-[10px] tracking-[0.3em] text-muted-foreground/50 uppercase">
          Scroll — the story of the gap
        </div>
      </section>

      {/* ── scroll story ── */}
      <Scene index="01" headline="You are here." body="Every repository, commit, and dependency leaves a signal. A single node in space — your current technical identity.">
        <SceneGraph variant={1} />
      </Scene>
      <Scene index="02" headline="Your work leaves signals." body="We read repos, READMEs, and dependency files to map your technologies into a living skill universe — every skill grounded in evidence, never guessed.">
        <SceneGraph variant={2} />
      </Scene>
      <Scene index="03" headline="This is the gap." body="Compare your universe against a developer who's where you want to be. Shared skills connect. Missing skills emerge in the gap zone — sized by how much they matter for your goal.">
        <SceneGraph variant={3} />
      </Scene>
      <Scene index="04" headline="The gap becomes a path." body="No 'learn everything'. The distance collapses into a trajectory: the few milestones that actually close it, in the order that matters.">
        <SceneGraph variant={4} />
      </Scene>

      {/* ── final CTA ── */}
      <section className="border-t border-border px-6 py-28 text-center">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">Chart your own universe.</h2>
          <p className="mx-auto mt-4 max-w-md text-muted-foreground">
            Drop in any GitHub username — yours or someone you aspire to. See the distance, then close it.
          </p>
          <div className="mt-10 flex justify-center">
            <CommandInput />
          </div>
        </motion.div>
      </section>
    </main>
  );
}
