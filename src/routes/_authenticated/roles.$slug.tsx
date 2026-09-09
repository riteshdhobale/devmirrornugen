import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  Github,
  Loader2,
  Lock,
  RefreshCw,
  ScanSearch,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getRoleBenchmarkServer } from "@/lib/roles.functions";
import { getRoleDefinition, type BenchmarkSkill, type SkillTier } from "@/lib/roles-types";
import { getPaddleEnvironment } from "@/lib/paddle";

export const Route = createFileRoute("/_authenticated/roles/$slug")({
  head: ({ params }) => {
    const role = getRoleDefinition(params.slug);
    const label = role?.label ?? "Role";
    const title = `${label} — the pattern behind the role | DevMirror`;
    const description = role
      ? `${role.blurb} See the skills, technologies and engineering evidence shared by developers already working as a ${label}.`
      : "Role intelligence built from developers already working in the role.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: `${label} — DevMirror Role Intelligence` },
        { property: "og:description", content: description },
        { property: "og:type", content: "profile" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: RoleBenchmarkPage,
});

const TIER_LABEL: Record<SkillTier, string> = {
  core: "Core — expected",
  important: "Important — common",
  emerging: "Emerging — differentiator",
};

const TIER_TONE: Record<SkillTier, string> = {
  core: "text-destructive",
  important: "text-warning",
  emerging: "text-muted-foreground",
};

function FrequencyRow({ skill }: { skill: BenchmarkSkill }) {
  return (
    <div className="flex items-center gap-3 py-1.5">
      <div className="w-40 shrink-0 truncate font-mono text-sm">{skill.name}</div>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
        <motion.div
          className="h-full rounded-full bg-primary"
          initial={{ width: 0 }}
          animate={{ width: `${skill.frequency}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>
      <div className="w-10 shrink-0 text-right font-mono text-xs text-muted-foreground">
        {skill.frequency}%
      </div>
      <div className="hidden w-56 shrink-0 font-mono text-[11px] text-muted-foreground sm:block">
        {skill.developerCount} of {skill.cohortSize} devs
        {skill.repoCount > 0 ? ` · ${skill.repoCount} repos` : ""}
      </div>
    </div>
  );
}

function RoleBenchmarkPage() {
  const { slug } = useParams({ from: "/_authenticated/roles/$slug" });
  const role = getRoleDefinition(slug);
  const fetchBenchmark = useServerFn(getRoleBenchmarkServer);
  const env = getPaddleEnvironment();

  const { data, isPending, isFetching, error, refetch } = useQuery({
    queryKey: ["role-benchmark", slug, env],
    queryFn: () => fetchBenchmark({ data: { slug, environment: env } }),
    enabled: Boolean(role),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  if (!role) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-24 text-center">
        <h1 className="font-display text-3xl font-bold">Unknown role</h1>
        <Button asChild className="mt-6">
          <Link to="/roles">Back to roles</Link>
        </Button>
      </main>
    );
  }

  const needsGitHub = data && !data.ok && data.reason === "needs-github";
  const needsPro = data && !data.ok && data.reason === "needs-upgrade";
  const failure =
    error instanceof Error
      ? error.message
      : data && !data.ok && !needsGitHub && !needsPro
        ? data.message
        : null;
  const benchmark = data?.ok ? data.benchmark : null;

  return (
    <main className="mx-auto max-w-5xl px-4 py-14">
      <Link
        to="/roles"
        className="font-mono text-[11px] tracking-[0.25em] text-muted-foreground uppercase hover:text-foreground"
      >
        ‹ all roles
      </Link>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="font-mono text-[10px] tracking-[0.35em] text-primary uppercase">
            › role benchmark
          </div>
          <h1 className="mt-2 font-display text-4xl font-bold tracking-tight">{role.label}</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">{role.blurb}</p>
        </div>
        {benchmark && (
          <div className="text-right">
            <div className="font-mono text-[11px] text-muted-foreground">
              {benchmark.cohortSize} developers analyzed
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="mt-1"
              disabled={isFetching}
              onClick={() => void fetchBenchmark({ data: { slug, refresh: true, environment: env } }).then(() => refetch())}
            >
              <RefreshCw className={`mr-1.5 size-3.5 ${isFetching ? "animate-spin" : ""}`} />
              Re-run cohort
            </Button>
          </div>
        )}
      </div>

      {isPending && (
        <Card className="mt-10 items-center gap-3 p-12 text-center">
          <Loader2 className="size-5 animate-spin text-primary" />
          <div className="font-mono text-[11px] tracking-[0.25em] text-muted-foreground uppercase">
            nominating · verifying · analyzing cohort
          </div>
          <p className="max-w-md text-sm text-muted-foreground">
            First run for a role analyzes real GitHub profiles end to end. This can take a minute; every
            later visit is instant.
          </p>
        </Card>
      )}

      {needsGitHub && (
        <Card className="mt-10 gap-0 border-primary/40 p-6">
          <div className="flex items-start gap-3">
            <Github className="mt-0.5 size-5 shrink-0 text-primary" />
            <div>
              <h2 className="font-display text-lg font-semibold">Connect GitHub to run this</h2>
              <p className="mt-2 max-w-xl text-sm text-muted-foreground">{data.message}</p>
              <Button asChild className="mt-4">
                <Link to="/dashboard">
                  Connect GitHub <ArrowRight className="ml-1.5 size-4" />
                </Link>
              </Button>
            </div>
          </div>
        </Card>
      )}

      {needsPro && (
        <Card className="mt-10 gap-0 border-primary/40 p-6">
          <div className="flex items-start gap-3">
            <Lock className="mt-0.5 size-5 shrink-0 text-primary" />
            <div>
              <h2 className="font-display text-lg font-semibold">Role Intelligence is a Career Pro feature</h2>
              <p className="mt-2 max-w-xl text-sm text-muted-foreground">{data.message}</p>
              <Button asChild className="mt-4">
                <Link to="/pricing">
                  Upgrade to Career Pro <ArrowRight className="ml-1.5 size-4" />
                </Link>
              </Button>
            </div>
          </div>
        </Card>
      )}

      {failure && (
        <Card className="mt-10 gap-0 border-destructive/40 p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-destructive" />
            <div>
              <h2 className="font-display text-lg font-semibold">Couldn't build this benchmark</h2>
              <p className="mt-2 text-sm text-muted-foreground">{failure}</p>
              <Button variant="secondary" className="mt-4" onClick={() => void refetch()}>
                Try again
              </Button>
            </div>
          </div>
        </Card>
      )}

      {benchmark && (
        <>
          <section className="mt-10">
            <h2 className="flex items-center gap-2 font-mono text-[11px] tracking-[0.3em] text-muted-foreground uppercase">
              <ScanSearch className="size-3.5" /> the common pattern
            </h2>
            <Card className="mt-4 gap-0 p-5">
              {(["core", "important", "emerging"] as SkillTier[]).map((tier) => {
                const rows = benchmark.skills.filter((s) => s.tier === tier);
                if (rows.length === 0) return null;
                return (
                  <div key={tier} className="mb-5 last:mb-0">
                    <div
                      className={`mb-1 font-mono text-[10px] tracking-[0.25em] uppercase ${TIER_TONE[tier]}`}
                    >
                      {TIER_LABEL[tier]}
                    </div>
                    {rows.map((skill) => (
                      <FrequencyRow key={skill.name} skill={skill} />
                    ))}
                  </div>
                );
              })}
              <p className="mt-2 border-t border-border pt-3 font-mono text-[11px] text-muted-foreground">
                Every number is a count, not a guess — frequency is the share of the analyzed cohort with
                public evidence for that technology.
              </p>
            </Card>
          </section>

          {benchmark.signals.length > 0 && (
            <section className="mt-8">
              <h2 className="font-mono text-[11px] tracking-[0.3em] text-muted-foreground uppercase">
                engineering evidence expected
              </h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {benchmark.signals.map((s) => (
                  <span
                    key={s.name}
                    className="rounded border border-border bg-muted/40 px-2.5 py-1 font-mono text-[11px]"
                  >
                    {s.name} <span className="text-muted-foreground">{s.frequency}%</span>
                  </span>
                ))}
              </div>
            </section>
          )}

          <section className="mt-8">
            <h2 className="flex items-center gap-2 font-mono text-[11px] tracking-[0.3em] text-muted-foreground uppercase">
              <Users className="size-3.5" /> the cohort we analyzed
            </h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {benchmark.cohort.map((member) => (
                <Card key={member.username} className="gap-0 p-4">
                  <div className="flex items-start gap-3">
                    <img
                      src={member.avatarUrl}
                      alt={`${member.name} GitHub avatar`}
                      loading="lazy"
                      className="size-10 rounded-full border border-border bg-muted"
                    />
                    <div className="min-w-0">
                      <Link
                        to="/analyze/$username"
                        params={{ username: member.username }}
                        className="font-display text-sm font-semibold hover:text-primary"
                      >
                        {member.name}
                      </Link>
                      <div className="font-mono text-[11px] text-muted-foreground">
                        @{member.username} · {member.primaryFocus}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{member.why}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
            <p className="mt-3 font-mono text-[11px] text-muted-foreground">
              computed {new Date(benchmark.computedAt).toLocaleString()}
              {benchmark.cached ? " · cached" : " · fresh run"}
            </p>
          </section>

          <Card className="mt-10 gap-0 border-primary/30 p-6">
            <h2 className="font-display text-xl font-semibold tracking-tight">
              Now measure yourself against it.
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              We map your public evidence onto this pattern, name the highest-leverage gaps, and hand you
              a three-phase path plus the projects that prove it.
            </p>
            <Button asChild className="mt-4 w-fit">
              <Link to="/roadmap" search={{ role: role.slug, username: undefined }}>
                Chart my path <ArrowRight className="ml-1.5 size-4" />
              </Link>
            </Button>
          </Card>
        </>
      )}
    </main>
  );
}
