import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowRight, Compass, Route as RouteIcon, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ROLE_CATALOG } from "@/lib/roles-types";

export const Route = createFileRoute("/_authenticated/roles/")({
  head: () => ({
    meta: [
      { title: "Role Intelligence — Reverse-Engineer Any Engineering Role | DevMirror" },
      {
        name: "description",
        content:
          "Pick a target role and see the skill pattern shared by developers already working in it — then measure your own evidence against it.",
      },
      { property: "og:title", content: "Role Intelligence — DevMirror" },
      {
        property: "og:description",
        content: "Don't guess what the role takes. Reverse-engineer the people who already have it.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RolesIndex,
});

function RolesIndex() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-14">
      <div className="text-center">
        <div className="font-mono text-[10px] tracking-[0.35em] text-primary uppercase">
          › role intelligence
        </div>
        <h1 className="mt-3 font-display text-4xl font-bold tracking-tight">
          Reverse-engineer the role.
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
          Don't guess what a role takes. We analyze developers who already work in it, extract the
          pattern they share, and measure your public evidence against it.
        </p>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {ROLE_CATALOG.map((role, i) => (
          <motion.div
            key={role.slug}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04, duration: 0.4 }}
          >
            <Link to="/roles/$slug" params={{ slug: role.slug }} className="block h-full">
              <Card className="group h-full gap-0 border-border/80 p-5 transition-colors hover:border-primary/50">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-display text-xl font-semibold tracking-tight">{role.label}</h2>
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{role.blurb}</p>
                <div className="mt-4 flex items-center gap-4 font-mono text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Users className="size-3.5" /> live cohort
                  </span>
                  <span className="flex items-center gap-1.5">
                    <RouteIcon className="size-3.5" /> your gap + path
                  </span>
                </div>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>

      <Card className="mt-8 gap-0 border-dashed p-5">
        <div className="flex items-start gap-3">
          <Compass className="mt-0.5 size-4 shrink-0 text-primary" />
          <p className="text-sm text-muted-foreground">
            Cohort analysis runs on <span className="text-foreground">your own GitHub connection</span>,
            so it never hits a shared rate limit. Connect it once from your{" "}
            <Link to="/dashboard" className="text-primary underline-offset-4 hover:underline">
              mission log
            </Link>
            . Benchmarks are cached for seven days and shared across the platform.
          </p>
        </div>
      </Card>
    </main>
  );
}
