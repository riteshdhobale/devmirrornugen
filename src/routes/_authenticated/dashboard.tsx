import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "motion/react";
import { ArrowRight, Github, GitCompareArrows, Loader2, LogOut, Route as RouteIcon, Trash2, Unplug, Zap } from "lucide-react";
import { listMyComparisons, deleteComparison } from "@/lib/comparisons.functions";
import { listMyRoadmaps, deleteRoadmap } from "@/lib/roles.functions";
import {
  startGitHubConnect,
  completeGitHubConnection,
  getGitHubConnection,
  disconnectGitHub,
} from "@/lib/github-connect.functions";
import type { CareerGoal } from "@/lib/mock/types";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

function waitForOAuthCompletion(popup: Window): Promise<string | null> {
  return new Promise<string | null>((resolve, reject) => {
    let poll: ReturnType<typeof setInterval> | undefined;
    const cleanup = () => {
      window.removeEventListener("message", onMessage);
      if (poll !== undefined) clearInterval(poll);
    };
    const onMessage = (event: MessageEvent) => {
      const type = event.data?.type;
      if (
        event.origin !== window.location.origin ||
        event.source !== popup ||
        event.data?.connectorId !== "github" ||
        (type !== "appUserConnectorOAuthComplete" && type !== "appUserConnectorOAuthFailed")
      )
        return;
      cleanup();
      if (type === "appUserConnectorOAuthComplete") {
        resolve(typeof event.data?.code === "string" ? event.data.code : null);
        return;
      }
      popup.close();
      reject(new Error("GitHub connection failed."));
    };
    window.addEventListener("message", onMessage);
    poll = setInterval(() => {
      if (!popup.closed) return;
      cleanup();
      reject(new Error("OAuth window closed before completion."));
    }, 500);
  });
}

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Mission log — DevMirror" },
      { name: "description", content: "Your saved developer comparisons and gap analyses." },
      { property: "og:title", content: "Mission log — DevMirror" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DashboardPage,
});

const GOAL_LABELS: Record<string, string> = {
  "ai-engineer": "AI Engineer",
  "ml-engineer": "ML Engineer",
  "backend-engineer": "Backend Engineer",
  "fullstack-engineer": "Full-Stack Engineer",
  "software-engineer": "Software Engineer",
  "data-scientist": "Data Scientist",
  "web3-engineer": "Web3 Engineer",
};

function DashboardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fetchComparisons = useServerFn(listMyComparisons);
  const removeComparison = useServerFn(deleteComparison);
  const fetchGitHubConnection = useServerFn(getGitHubConnection);
  const beginGitHubConnect = useServerFn(startGitHubConnect);
  const finishGitHubConnect = useServerFn(completeGitHubConnection);
  const runDisconnectGitHub = useServerFn(disconnectGitHub);

  const { data, isPending } = useQuery({
    queryKey: ["my-comparisons"],
    queryFn: fetchComparisons,
  });

  const fetchRoadmaps = useServerFn(listMyRoadmaps);
  const removeRoadmap = useServerFn(deleteRoadmap);
  const { data: roadmaps } = useQuery({
    queryKey: ["my-roadmaps"],
    queryFn: fetchRoadmaps,
  });

  const onDeleteRoadmap = async (id: string) => {
    await removeRoadmap({ data: { id } });
    await queryClient.invalidateQueries({ queryKey: ["my-roadmaps"] });
  };

  const { data: githubConnection, isPending: githubPending } = useQuery({
    queryKey: ["github-connection"],
    queryFn: fetchGitHubConnection,
  });

  const onConnectGitHub = async () => {
    const popup = window.open("", "lovable-oauth", "width=600,height=720");
    if (!popup) {
      toast.error("Popup blocked — allow popups and try again.");
      return;
    }
    let code: string | null;
    try {
      const { authorizationUrl } = await beginGitHubConnect();
      const completion = waitForOAuthCompletion(popup);
      popup.location.href = authorizationUrl;
      code = await completion;
    } catch (err) {
      popup.close();
      toast.error(err instanceof Error ? err.message : "GitHub connection failed");
      return;
    }
    try {
      if (code) await finishGitHubConnect({ data: { code } });
      await queryClient.invalidateQueries({ queryKey: ["github-connection"] });
      toast.success("GitHub connected — analyses now use your own quota");
    } catch {
      toast.error("Could not finish the GitHub connection");
    }
  };

  const onDisconnectGitHub = async () => {
    try {
      await runDisconnectGitHub();
      await queryClient.invalidateQueries({ queryKey: ["github-connection"] });
      toast.success("GitHub disconnected");
    } catch {
      toast.error("Could not disconnect GitHub");
    }
  };

  const onDelete = async (id: string) => {
    try {
      await removeComparison({ data: { id } });
      await queryClient.invalidateQueries({ queryKey: ["my-comparisons"] });
    } catch {
      toast.error("Could not delete comparison");
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  const comparisons = data?.comparisons ?? [];

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 pb-24 pt-14">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <p className="font-mono text-xs text-primary">› mission log</p>
          <div className="mt-2 flex items-end justify-between gap-4">
            <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Your saved comparisons
            </h1>
            <button
              onClick={signOut}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </button>
          </div>
        </motion.div>

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="mt-8 rounded-xl border border-border bg-card p-5"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="rounded-lg border border-border bg-background p-2">
                <Github className="h-4 w-4 text-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">GitHub connection</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {githubConnection?.connected
                    ? "Connected. Analyses you run spend your own GitHub quota (5,000 req/hr) instead of the shared pool."
                    : "Connect your GitHub account and every analysis you run uses your own rate-limit quota — no shared-pool slowdowns."}
                </p>
              </div>
            </div>
            {githubPending ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : githubConnection?.connected ? (
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-primary">
                  <Zap className="h-3 w-3" /> own quota
                </span>
                <button
                  onClick={onDisconnectGitHub}
                  aria-label="Disconnect GitHub"
                  className="rounded-md p-2 text-muted-foreground/60 transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  <Unplug className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onConnectGitHub}
                className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-foreground transition-colors hover:border-primary/50"
              >
                <Github className="h-3.5 w-3.5" /> Connect GitHub
              </button>
            )}
          </div>
        </motion.section>

        {isPending ? (
          <div className="mt-16 flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading your log…
          </div>
        ) : comparisons.length === 0 ? (
          <div className="mt-16 rounded-xl border border-dashed border-border p-10 text-center">
            <GitCompareArrows className="mx-auto h-8 w-8 text-muted-foreground/40" />
            <p className="mt-4 text-sm text-muted-foreground">
              Nothing saved yet. Run a comparison and hit{" "}
              <span className="text-foreground">Save this comparison</span> to keep it here.
            </p>
            <Link
              to="/compare"
              className="group mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              Run a comparison
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        ) : (
          <ul className="mt-10 space-y-3">
            {comparisons.map((c, i) => (
              <motion.li
                key={c.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <div className="group flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40">
                  <Link
                    to="/compare/results"
                    search={{ you: c.you_username, target: c.target_username, goal: c.goal as CareerGoal }}
                    className="min-w-0 flex-1"
                  >
                    <p className="truncate font-mono text-sm text-foreground">
                      <span className="text-primary">@{c.you_username}</span>
                      <span className="mx-2 text-muted-foreground">→</span>
                      <span className="text-foreground">@{c.target_username}</span>
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {GOAL_LABELS[c.goal] ?? c.goal} ·{" "}
                      {new Date(c.created_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </Link>
                  <button
                    onClick={() => onDelete(c.id)}
                    aria-label="Delete comparison"
                    className="rounded-md p-2 text-muted-foreground/50 transition-colors hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </motion.li>
            ))}
          </ul>
        )}

        <section className="mt-14">
          <div className="flex items-end justify-between gap-4">
            <h2 className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
              <RouteIcon className="h-3.5 w-3.5" /> saved roadmaps
            </h2>
            <Link
              to="/roles"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              Role intelligence <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {!roadmaps || roadmaps.length === 0 ? (
            <p className="mt-4 rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              No roadmaps yet. Pick a target role in{" "}
              <Link to="/roles" className="text-primary underline-offset-4 hover:underline">
                Role intelligence
              </Link>{" "}
              and save the path it charts.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {roadmaps.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40"
                >
                  <Link
                    to="/roadmap"
                    search={{ role: r.roleSlug, username: r.githubUsername }}
                    className="min-w-0 flex-1"
                  >
                    <p className="truncate font-mono text-sm text-foreground">
                      <span className="text-primary">@{r.githubUsername}</span>
                      <span className="mx-2 text-muted-foreground">→</span>
                      {r.roleLabel}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      readiness {r.readiness}/100 · {new Date(r.createdAt).toLocaleDateString()}
                    </p>
                  </Link>
                  <button
                    onClick={() => onDeleteRoadmap(r.id)}
                    aria-label="Delete roadmap"
                    className="rounded-md p-2 text-muted-foreground/50 transition-colors hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
