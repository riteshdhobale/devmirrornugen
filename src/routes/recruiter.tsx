import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  Briefcase,
  Check,
  Hammer,
  Loader2,
  Radar,
  ScanSearch,
  Signal,
  Sparkles,
  Target,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { decodeRoleServer, screenCandidatesServer } from "@/lib/recruiter.functions";
import { getPaddleEnvironment } from "@/lib/paddle";
import { BAND_LABEL, type CandidateFit, type RoleSpec } from "@/lib/recruiter-types";

export const Route = createFileRoute("/recruiter")({
  head: () => ({
    meta: [
      { title: "Recruiter Mode — Screen GitHub Profiles Against a Role | DevMirror" },
      {
        name: "description",
        content:
          "Paste a job posting to decode what it really demands, then screen GitHub profiles against it with evidence-based fit scores, risks and interview probes.",
      },
      { property: "og:title", content: "Recruiter Mode — DevMirror" },
      {
        property: "og:description",
        content:
          "Decode any job posting into required skills and portfolio projects, then screen candidates by what their code proves.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RecruiterMode,
});

const normalize = (v: string) =>
  v.trim().replace(/^https?:\/\/(www\.)?github\.com\//i, "").replace(/\/+$/, "").split("/")[0] ?? "";

const SAMPLE_JD = `Senior AI Engineer — Applied LLM Platform

We're looking for an engineer to design and ship production LLM systems: retrieval pipelines over internal knowledge, agentic tool-calling workflows, and evaluation harnesses that keep quality measurable.

You will:
- Build and operate RAG services (vector search, chunking, reranking) in Python
- Ship FastAPI services on Kubernetes with observability and CI/CD
- Own evaluation: offline eval sets, regression gates, latency and cost budgets
- Work with Postgres/pgvector and streaming inference

Requirements: strong Python, hands-on LLM/agent tooling, containerised deployment, testing discipline, and evidence of shipped end-to-end systems.`;

function RecruiterMode() {
  const [mode, setMode] = useState<"screen" | "blueprint">("screen");
  const [jd, setJd] = useState("");
  const [candidates, setCandidates] = useState(["", "", ""]);

  const decode = useServerFn(decodeRoleServer);
  const screen = useServerFn(screenCandidatesServer);

  const blueprint = useMutation({
    mutationFn: (jobDescription: string) => decode({ data: { jobDescription } }),
  });
  const screening = useMutation({
    mutationFn: (vars: { jobDescription: string; usernames: string[] }) =>
      screen({ data: { ...vars, environment: getPaddleEnvironment() } }),
  });

  const active = mode === "screen" ? screening : blueprint;
  const usernames = candidates.map(normalize).filter(Boolean);
  const canRun = jd.trim().length >= 40 && (mode === "blueprint" || usernames.length > 0);

  const run = () => {
    if (!canRun) return;
    if (mode === "screen") screening.mutate({ jobDescription: jd, usernames });
    else blueprint.mutate(jd);
  };

  const result = screening.data?.ok ? screening.data : null;
  const roleOnly = blueprint.data?.ok ? blueprint.data.role : null;
  const role: RoleSpec | null = mode === "screen" ? (result?.role ?? null) : roleOnly;
  const errorMessage =
    active.error instanceof Error
      ? active.error.message
      : mode === "screen"
        ? screening.data && !screening.data.ok
          ? screening.data.message
          : null
        : blueprint.data && !blueprint.data.ok
          ? blueprint.data.message
          : null;

  return (
    <main className="mx-auto max-w-5xl px-4 py-14">
      <div className="text-center">
        <div className="font-mono text-[10px] tracking-[0.35em] text-primary uppercase">
          › recruiter mode
        </div>
        <h1 className="mt-3 font-display text-4xl font-bold tracking-tight">
          Read the role. Read the code.
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
          Paste a job posting. We strip the fluff into what the role actually demands — then measure
          real GitHub profiles against it, or show exactly what a candidate must have shipped to land it.
        </p>
      </div>

      <Card className="mt-10 gap-0 border-border/80 p-6">
        <Tabs value={mode} onValueChange={(v) => setMode(v as typeof mode)}>
          <TabsList>
            <TabsTrigger value="screen">
              <Radar className="mr-1.5 size-3.5" /> Screen candidates
            </TabsTrigger>
            <TabsTrigger value="blueprint">
              <Hammer className="mr-1.5 size-3.5" /> Role blueprint
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="mt-6 space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="jd" className="flex items-center gap-1.5">
              <Briefcase className="size-3.5" /> Job posting
            </Label>
            <button
              type="button"
              onClick={() => setJd(SAMPLE_JD)}
              className="font-mono text-[11px] tracking-wider text-muted-foreground uppercase transition-colors hover:text-foreground"
            >
              use sample
            </button>
          </div>
          <Textarea
            id="jd"
            value={jd}
            onChange={(e) => setJd(e.target.value)}
            rows={9}
            placeholder="Paste the full job description here…"
            className="font-mono text-xs leading-relaxed"
          />
        </div>

        {mode === "screen" && (
          <div className="mt-6 space-y-2">
            <Label className="flex items-center gap-1.5">
              <Target className="size-3.5" /> Candidate GitHub profiles (up to 3)
            </Label>
            <div className="grid gap-3 sm:grid-cols-3">
              {candidates.map((value, i) => (
                <Input
                  key={i}
                  value={value}
                  onChange={(e) =>
                    setCandidates((prev) => prev.map((v, idx) => (idx === i ? e.target.value : v)))
                  }
                  placeholder={i === 0 ? "username or profile URL" : "optional"}
                  className="font-mono text-sm"
                />
              ))}
            </div>
          </div>
        )}

        <Button onClick={run} disabled={!canRun || active.isPending} className="mt-6 w-full sm:w-auto">
          {active.isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              {mode === "screen" ? "Screening profiles…" : "Decoding role…"}
            </>
          ) : (
            <>
              <ScanSearch className="size-4" />
              {mode === "screen" ? "Screen candidates" : "Decode the role"}
            </>
          )}
        </Button>
        {jd.trim().length > 0 && jd.trim().length < 40 && (
          <p className="mt-2 text-xs text-muted-foreground">
            Paste a little more of the posting — at least a few lines.
          </p>
        )}
      </Card>

      {errorMessage && (
        <Card className="mt-6 border-destructive/40 p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-destructive">
            <AlertTriangle className="size-4" /> Signal lost
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{errorMessage}</p>
          {mode === "screen" && screening.data && !screening.data.ok && (
            <Button asChild size="sm" className="mt-4">
              <Link to="/pricing">Upgrade to Recruiter</Link>
            </Button>
          )}
        </Card>
      )}

      {role && (
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="mt-12 space-y-10"
        >
          <RoleReadout role={role} />

          {mode === "screen" && result && (
            <section className="space-y-5">
              <SectionTitle icon={Radar} label="Candidate screen" />
              {result.candidates.map((c) => (
                <CandidateCard key={c.username} fit={c} />
              ))}
              {result.failed.length > 0 && (
                <Card className="border-warning/40 p-4">
                  <div className="text-sm font-semibold text-warning">Not screened</div>
                  <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                    {result.failed.map((f) => (
                      <li key={f.username} className="font-mono text-xs">
                        @{f.username} — {f.message}
                      </li>
                    ))}
                  </ul>
                </Card>
              )}
            </section>
          )}

          <section className="space-y-4">
            <SectionTitle icon={Hammer} label="What must be on their GitHub" />
            <p className="text-sm text-muted-foreground">
              Three projects that prove this role. Ship these and the profile stops being a guess.
            </p>
            <div className="grid gap-4 lg:grid-cols-3">
              {role.portfolioBlueprints.map((b, i) => (
                <Card key={b.name} className="gap-0 p-5">
                  <div className="font-mono text-[10px] tracking-[0.25em] text-primary uppercase">
                    blueprint {String(i + 1).padStart(2, "0")}
                  </div>
                  <h3 className="mt-2 font-display text-lg font-semibold">{b.name}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{b.pitch}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {b.stack.map((t) => (
                      <span
                        key={t}
                        className="rounded border border-border bg-muted/40 px-2 py-0.5 font-mono text-[11px] text-muted-foreground"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                  <ul className="mt-4 space-y-1.5 border-t border-border pt-3 text-sm">
                    {b.mustShow.map((m) => (
                      <li key={m} className="flex gap-2 text-muted-foreground">
                        <Check className="mt-0.5 size-3.5 shrink-0 text-success" /> {m}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-3 font-mono text-[11px] text-muted-foreground">
                    scope → {b.scope}
                  </div>
                </Card>
              ))}
            </div>
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="p-5">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Signal className="size-4 text-success" /> Signals worth trusting
              </div>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                {role.screeningSignals.map((s) => (
                  <li key={s} className="flex gap-2">
                    <Check className="mt-0.5 size-3.5 shrink-0 text-success" /> {s}
                  </li>
                ))}
              </ul>
            </Card>
            <Card className="p-5">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <AlertTriangle className="size-4 text-warning" /> Looks good, proves nothing
              </div>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                {role.redFlags.map((s) => (
                  <li key={s} className="flex gap-2">
                    <X className="mt-0.5 size-3.5 shrink-0 text-destructive" /> {s}
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </motion.div>
      )}
    </main>
  );
}

function SectionTitle({
  icon: Icon,
  label,
}: {
  icon: typeof Radar;
  label: string;
}) {
  return (
    <h2 className="flex items-center gap-2 font-mono text-[11px] tracking-[0.3em] text-muted-foreground uppercase">
      <Icon className="size-3.5" /> {label}
    </h2>
  );
}

function RoleReadout({ role }: { role: RoleSpec }) {
  const groups = [
    { weight: "must-have" as const, tone: "text-destructive border-destructive/30 bg-destructive/10" },
    { weight: "important" as const, tone: "text-warning border-warning/30 bg-warning/10" },
    { weight: "nice-to-have" as const, tone: "text-muted-foreground border-border bg-muted/40" },
  ];
  return (
    <section className="space-y-4">
      <SectionTitle icon={Sparkles} label="Role decoded" />
      <Card className="gap-0 border-primary/25 p-5">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h3 className="font-display text-2xl font-bold tracking-tight">{role.title}</h3>
          <span className="rounded-full border border-border px-2.5 py-0.5 font-mono text-[11px] text-muted-foreground">
            {role.seniority}
          </span>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-foreground">{role.summary}</p>
      </Card>
      <div className="space-y-3">
        {groups.map(({ weight, tone }) => {
          const items = role.requirements.filter((r) => r.weight === weight);
          if (items.length === 0) return null;
          return (
            <div key={weight}>
              <div className="mb-2 font-mono text-[10px] tracking-[0.25em] text-muted-foreground uppercase">
                {weight.replace("-", " ")}
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {items.map((r) => (
                  <div key={r.skill} className={`rounded-md border px-3 py-2 ${tone}`}>
                    <div className="font-mono text-sm">{r.skill}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">{r.why}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function CandidateCard({ fit }: { fit: CandidateFit }) {
  const tone =
    fit.band === "strong"
      ? "text-success border-success/40"
      : fit.band === "possible"
        ? "text-warning border-warning/40"
        : "text-destructive border-destructive/40";
  return (
    <Card className="gap-0 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <img
            src={fit.avatarUrl}
            alt={`${fit.name} avatar`}
            className="size-12 rounded-full border border-border bg-muted"
          />
          <div>
            <div className="font-display text-lg font-semibold">{fit.name}</div>
            <div className="font-mono text-xs text-muted-foreground">@{fit.username}</div>
            <div className="mt-1 text-xs text-muted-foreground">{fit.primaryFocus}</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className={`rounded-md border px-3 py-1.5 text-right ${tone}`}>
            <div className="font-display text-2xl leading-none font-bold">{fit.fitScore}</div>
            <div className="font-mono text-[10px] tracking-wider uppercase">{BAND_LABEL[fit.band]}</div>
          </div>
          <Link to="/analyze/$username" params={{ username: fit.username }}>
            <Button variant="outline" size="sm">
              Full profile
            </Button>
          </Link>
        </div>
      </div>

      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{fit.verdict}</p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <div className="font-mono text-[10px] tracking-[0.25em] text-success uppercase">proven</div>
          <ul className="mt-2 space-y-1.5 text-sm">
            {fit.matched.map((m) => (
              <li key={m.skill} className="text-muted-foreground">
                <span className="font-mono text-foreground">{m.skill}</span> — {m.evidence}
              </li>
            ))}
            {fit.matched.length === 0 && <li className="text-muted-foreground">No requirements evidenced.</li>}
          </ul>
        </div>
        <div>
          <div className="font-mono text-[10px] tracking-[0.25em] text-destructive uppercase">unproven</div>
          <ul className="mt-2 space-y-1.5 text-sm">
            {fit.missing.map((m) => (
              <li key={m.skill} className="text-muted-foreground">
                <span className="font-mono text-foreground">{m.skill}</span> — {m.note}
              </li>
            ))}
            {fit.missing.length === 0 && <li className="text-muted-foreground">Nothing material missing.</li>}
          </ul>
        </div>
      </div>

      {(fit.risks.length > 0 || fit.interviewProbes.length > 0) && (
        <div className="mt-4 grid gap-4 border-t border-border pt-4 sm:grid-cols-2">
          {fit.risks.length > 0 && (
            <div>
              <div className="font-mono text-[10px] tracking-[0.25em] text-warning uppercase">risks</div>
              <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
                {fit.risks.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </div>
          )}
          {fit.interviewProbes.length > 0 && (
            <div>
              <div className="font-mono text-[10px] tracking-[0.25em] text-primary uppercase">
                ask them this
              </div>
              <ol className="mt-2 space-y-1.5 text-sm text-muted-foreground">
                {fit.interviewProbes.map((q, i) => (
                  <li key={q}>
                    <span className="font-mono text-xs text-foreground">{i + 1}. </span>
                    {q}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}

      {fit.standoutProject && fit.standoutProject !== "—" && (
        <div className="mt-4 font-mono text-[11px] text-muted-foreground">
          standout → <span className="text-foreground">{fit.standoutProject}</span>
        </div>
      )}
    </Card>
  );
}
