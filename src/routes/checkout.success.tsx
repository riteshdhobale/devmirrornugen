import { createFileRoute, Link } from "@tanstack/react-router";
import { useSubscription } from "@/hooks/useSubscription";
import { CheckCircle2, ArrowRight, Radar, GitCompareArrows, Map } from "lucide-react";

const PLAN_LABELS: Record<string, string> = {
  pro_plan: "Pro",
  career_pro_plan: "Career Pro",
  recruiter_plan: "Recruiter Starter",
  recruiter_pro_plan: "Recruiter Pro",
  recruiter_business_plan: "Recruiter Business",
};

const NEXT_STEPS = [
  {
    icon: Radar,
    title: "Run a fresh analysis",
    description: "Scan any GitHub profile with your new quota.",
    href: "/analyze",
    cta: "Analyze",
  },
  {
    icon: GitCompareArrows,
    title: "Compare against a target",
    description: "Measure the distance between you and someone ahead.",
    href: "/compare",
    cta: "Compare",
  },
  {
    icon: Map,
    title: "Chart a role roadmap",
    description: "Reverse-engineer developers already in your target role.",
    href: "/roles",
    cta: "Role intelligence",
  },
];

function CheckoutSuccessPage() {
  const search = Route.useSearch();
  const plan = search["plan"];
  const { entitlement, isLoading } = useSubscription();

  const planLabel = (plan ? PLAN_LABELS[plan] : undefined) ?? entitlement?.planLabel ?? "your new plan";

  return (
    <div className="mx-auto max-w-3xl px-4 py-20">
      <div className="text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-success/40 bg-success/10">
          <CheckCircle2 className="h-7 w-7 text-success" />
        </div>
        <p className="mt-6 font-mono text-xs tracking-widest text-success uppercase">
          › signal acquired
        </p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          Welcome to {planLabel}.
        </h1>
        <p className="mx-auto mt-4 max-w-md text-sm text-muted-foreground">
          {isLoading
            ? "Confirming your subscription…"
            : "Your subscription is active. The universe just got bigger — here's where to point it first."}
        </p>
      </div>

      <div className="mt-12 grid gap-4 sm:grid-cols-3">
        {NEXT_STEPS.map((step) => (
          <Link
            key={step.title}
            to={step.href}
            className="group rounded-xl border border-border bg-card p-5 transition-colors hover:border-success/50"
          >
            <step.icon className="h-5 w-5 text-success" />
            <h2 className="mt-3 text-sm font-semibold text-foreground">{step.title}</h2>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              {step.description}
            </p>
            <span className="mt-3 inline-flex items-center gap-1 font-mono text-[11px] tracking-widest text-success uppercase">
              {step.cta}
              <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>
        ))}
      </div>

      <p className="mt-10 text-center font-mono text-[11px] tracking-widest text-muted-foreground uppercase">
        Manage your plan anytime from{" "}
        <Link to="/dashboard" className="text-foreground underline underline-offset-4">
          mission control
        </Link>
      </p>
    </div>
  );
}

export const Route = createFileRoute("/checkout/success")({
  validateSearch: (search: Record<string, unknown>) => ({
    plan: typeof search["plan"] === "string" ? (search["plan"] as string) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Welcome aboard — DevMirror" },
      { name: "description", content: "Your DevMirror subscription is active." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CheckoutSuccessPage,
});
