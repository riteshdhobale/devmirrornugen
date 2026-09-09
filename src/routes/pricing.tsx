import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { usePaddleCheckout } from "@/hooks/usePaddleCheckout";
import { useSubscription } from "@/hooks/useSubscription";
import { useSupabaseUser } from "@/lib/use-supabase-user";
import { getPaddleEnvironment, previewLocalizedPrices } from "@/lib/paddle";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — DevMirror Developer & Recruiter Intelligence" },
      {
        name: "description",
        content:
          "Start free with 3 profile analyses a month. Pro unlocks unlimited comparisons, Career Pro adds role benchmarks and roadmaps, and Recruiter plans screen GitHub candidates.",
      },
      { property: "og:title", content: "DevMirror Pricing" },
      {
        property: "og:description",
        content:
          "Free developer intelligence. Career Pro reverse-engineers any role. Recruiter plans screen GitHub candidates against a job posting.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PricingPage,
});

type Audience = "developer" | "recruiter";
type Cadence = "monthly" | "yearly";

interface Tier {
  name: string;
  plans: string[];
  monthly: { price: string; priceId: string | null; note?: string };
  yearly: { price: string; priceId: string | null; note?: string };
  productId: string | null;
  blurb: string;
  features: string[];
  accent?: boolean;
}

const DEVELOPER_TIERS: Tier[] = [
  {
    name: "Explorer",
    plans: ["free"],
    monthly: { price: "$0", priceId: null },
    yearly: { price: "$0", priceId: null },
    productId: null,
    blurb: "See any developer's real evidence. Find your first gap.",
    features: [
      "3 fresh profile analyses / month",
      "1 comparison / month",
      "Skill Universe visualization",
      "Role catalog + free job decoding",
      "Cached and shared results always free",
    ],
  },
  {
    name: "Pro",
    plans: ["pro"],
    monthly: { price: "$12", priceId: "pro_monthly" },
    yearly: { price: "$119", priceId: "pro_yearly", note: "save 17%" },
    productId: "pro_plan",
    blurb: "Unlimited intelligence on every developer you care about.",
    features: [
      "Everything in Explorer",
      "Unlimited profile analyses",
      "Unlimited comparisons",
      "Full gap analysis + trajectory",
      "Saved comparison history",
    ],
    accent: true,
  },
  {
    name: "Career Pro",
    plans: ["career_pro"],
    monthly: { price: "$20", priceId: "career_pro_monthly" },
    yearly: { price: "$229", priceId: "career_pro_yearly", note: "save 5%" },
    productId: "career_pro_plan",
    blurb: "Reverse-engineer the role. Chart the path. Build the evidence.",
    features: [
      "Everything in Pro",
      "Role Intelligence — live cohort benchmarks",
      "Readiness score + weighted gap scoring",
      "Phased roadmaps (3 phases)",
      "Project blueprints + saved roadmaps",
    ],
  },
];

const RECRUITER_TIERS: Tier[] = [
  {
    name: "Recruiter Starter",
    plans: ["recruiter_starter"],
    monthly: { price: "$49", priceId: "recruiter_monthly" },
    yearly: { price: "$499", priceId: "recruiter_yearly", note: "save 15%" },
    productId: "recruiter_plan",
    blurb: "Decode a posting, screen candidates on evidence, not keywords.",
    features: [
      "Everything in Career Pro",
      "100 candidate analyses / month",
      "Evidence-based fit scores",
      "Matched / missing requirements + risks",
      "3 interview probes per candidate",
    ],
  },
  {
    name: "Recruiter Pro",
    plans: ["recruiter_pro"],
    monthly: { price: "$149", priceId: "recruiter_pro_monthly" },
    yearly: { price: "$1,499", priceId: "recruiter_pro_yearly", note: "save 16%" },
    productId: "recruiter_pro_plan",
    blurb: "For agencies and in-house teams screening every week.",
    features: [
      "Everything in Starter",
      "500 candidate analyses / month",
      "Up to 3 seats",
      "Role blueprint library",
      "Priority analysis queue",
    ],
    accent: true,
  },
  {
    name: "Business",
    plans: ["recruiter_business"],
    monthly: { price: "$399", priceId: "recruiter_business_monthly" },
    yearly: { price: "$3,999", priceId: "recruiter_business_yearly", note: "save 16%" },
    productId: "recruiter_business_plan",
    blurb: "High-volume technical hiring with a shared team workspace.",
    features: [
      "Everything in Recruiter Pro",
      "2,000 candidate analyses / month",
      "Up to 10 seats",
      "Shared screening history",
      "Priority support",
    ],
  },
];

function PricingPage() {
  const user = useSupabaseUser();
  const { entitlement } = useSubscription();
  const { openCheckout, loading } = usePaddleCheckout();
  const [audience, setAudience] = useState<Audience>("developer");
  const [cadence, setCadence] = useState<Cadence>("monthly");
  const [localized, setLocalized] = useState<Record<string, string>>({});

  const tiers = audience === "developer" ? DEVELOPER_TIERS : RECRUITER_TIERS;

  // Paddle localizes by IP and applies our regional overrides, so we show the
  // exact amount the visitor will be charged rather than the USD list price.
  useEffect(() => {
    const ids = [...DEVELOPER_TIERS, ...RECRUITER_TIERS].flatMap((t) =>
      [t.monthly.priceId, t.yearly.priceId].filter((v): v is string => Boolean(v)),
    );
    previewLocalizedPrices(ids)
      .then(setLocalized)
      .catch(() => setLocalized({}));
  }, []);

  async function handleCheckout(priceId: string, productId: string) {
    if (!user) {
      window.location.href = "/auth";
      return;
    }
    await openCheckout({
      priceId,
      quantity: 1,
      ...(user.email ? { customerEmail: user.email } : {}),
      customData: { userId: user.id },
      successUrl: `${window.location.origin}/checkout/success?plan=${productId}`,
    });
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <div className="text-center">
        <p className="font-mono text-xs tracking-widest text-success uppercase">› pricing</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          Know where you stand.
          <br />
          <span className="text-muted-foreground">Pay for the edge.</span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-sm text-muted-foreground">
          Prices adapt to your region automatically. Cancel anytime.
        </p>
      </div>

      <div className="mt-8 flex flex-col items-center gap-3">
        <div className="inline-flex rounded-full border border-border bg-card p-1 font-mono text-[11px] tracking-widest uppercase">
          {(["developer", "recruiter"] as Audience[]).map((a) => (
            <button
              key={a}
              onClick={() => setAudience(a)}
              className={`rounded-full px-4 py-1.5 transition-colors ${
                audience === a
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {a === "developer" ? "for developers" : "for recruiters"}
            </button>
          ))}
        </div>
        <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
          {(["monthly", "yearly"] as Cadence[]).map((c) => (
            <button
              key={c}
              onClick={() => setCadence(c)}
              className={`rounded-full px-3 py-1 transition-colors ${
                cadence === c ? "bg-accent text-foreground" : "hover:text-foreground"
              }`}
            >
              {c === "monthly" ? "Monthly" : "Annual"}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-3">
        {tiers.map((tier) => {
          const option = cadence === "yearly" ? tier.yearly : tier.monthly;
          const priceId = option.priceId;
          const displayed = (priceId && localized[priceId]) || option.price;
          const isCurrent = Boolean(entitlement && tier.plans.includes(entitlement.plan));

          return (
            <div
              key={tier.name}
              className={`relative flex flex-col rounded-xl border p-6 ${
                tier.accent
                  ? "border-primary/50 bg-primary/5 shadow-lg shadow-primary/10"
                  : "border-border bg-card"
              }`}
            >
              {tier.accent && (
                <span className="absolute -top-2.5 left-6 rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-semibold tracking-wide text-primary-foreground uppercase">
                  Most popular
                </span>
              )}
              <h3 className="text-lg font-semibold text-foreground">{tier.name}</h3>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-3xl font-bold tracking-tight text-foreground">
                  {displayed}
                </span>
                <span className="text-sm text-muted-foreground">
                  {priceId ? (cadence === "yearly" ? "/year" : "/month") : "forever"}
                </span>
              </div>
              {cadence === "yearly" && option.note && (
                <span className="mt-1 font-mono text-[10px] tracking-widest text-success uppercase">
                  {option.note}
                </span>
              )}
              <p className="mt-2 text-sm text-muted-foreground">{tier.blurb}</p>

              <ul className="mt-5 space-y-2.5 text-sm">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-foreground/90">
                    <Check className="mt-0.5 size-4 shrink-0 text-success" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-auto pt-6">
                {isCurrent ? (
                  <div className="rounded-lg border border-success/30 bg-success/10 px-4 py-2.5 text-center text-sm font-medium text-success">
                    Current plan
                  </div>
                ) : priceId && tier.productId ? (
                  <button
                    onClick={() => handleCheckout(priceId, tier.productId!)}
                    disabled={loading}
                    className={`w-full rounded-lg px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-50 ${
                      tier.accent
                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                        : "border border-border text-foreground hover:border-primary/50 hover:bg-accent"
                    }`}
                  >
                    {loading
                      ? "Opening checkout…"
                      : user
                        ? `Upgrade to ${tier.name}`
                        : "Sign in to upgrade"}
                  </button>
                ) : (
                  <Link
                    to="/"
                    className="block w-full rounded-lg border border-border px-4 py-2.5 text-center text-sm font-medium text-foreground transition-colors hover:border-primary/50 hover:bg-accent"
                  >
                    Start free
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-10 text-center text-xs text-muted-foreground">
        {audience === "developer"
          ? "Every plan includes unlimited access to cached and shared analyses."
          : "Recruiter plans include everything in Career Pro for your own profile."}{" "}
        {getPaddleEnvironment() === "sandbox" ? "Preview runs in test mode — no real charges." : ""}
      </p>
    </div>
  );
}
