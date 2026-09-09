import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CAREER_GOALS, type CareerGoal } from "@/lib/mock/types";
import { GitCompareArrows, Upload, User, Target } from "lucide-react";

export const Route = createFileRoute("/compare/")({
  validateSearch: (search: Record<string, unknown>) => ({
    ...(typeof search["target"] === "string" ? { target: search["target"] } : {}),
  }),
  head: () => ({
    meta: [
      { title: "Compare With Me — DevMirror" },
      { name: "description", content: "Compare your GitHub profile against a target developer and get a goal-aware skill gap analysis." },
      { property: "og:title", content: "Compare With Me — DevMirror" },
      { property: "og:description", content: "Side-by-side developer comparison with goal-aware gap analysis." },
    ],
  }),
  component: CompareSetup,
});

const normalize = (v: string) =>
  v.trim().replace(/^https?:\/\/(www\.)?github\.com\//i, "").replace(/\/+$/, "").split("/")[0] ?? "";

function CompareSetup() {
  const navigate = useNavigate({ from: "/compare/" });
  const { target: initialTarget } = Route.useSearch();
  const [you, setYou] = useState("you");
  const [target, setTarget] = useState(initialTarget ?? "arjun-builds");
  const [goal, setGoal] = useState<CareerGoal>("ai-engineer");
  const [resume, setResume] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    const y = normalize(you);
    const t = normalize(target);
    if (!y || !t) {
      setError("Enter both GitHub usernames.");
      return;
    }
    navigate({
      to: "/compare/results",
      search: { you: y, target: t, goal },
    });
  };

  return (
    <main className="mx-auto max-w-2xl px-4 py-16">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">Compare With Me</h1>
        <p className="mt-2 text-muted-foreground">
          Put your profile side-by-side with a developer who's where you want to be.
        </p>
      </div>

      <Card className="mt-10 gap-0 p-6">
        <div className="grid gap-6 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
          <div className="space-y-2">
            <Label htmlFor="you" className="flex items-center gap-1.5">
              <User className="size-3.5" /> Your GitHub
            </Label>
            <Input id="you" value={you} onChange={(e) => setYou(e.target.value)} placeholder="your-username" className="font-mono text-sm" />
          </div>
          <div className="hidden pb-2 text-muted-foreground sm:block">VS</div>
          <div className="space-y-2">
            <Label htmlFor="target" className="flex items-center gap-1.5">
              <Target className="size-3.5" /> Target GitHub
            </Label>
            <Input id="target" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="target-username" className="font-mono text-sm" />
          </div>
        </div>

        <div className="mt-6 space-y-2">
          <Label>Career goal</Label>
          <Select value={goal} onValueChange={(v) => setGoal(v as CareerGoal)}>
            <SelectTrigger>
              <SelectValue placeholder="Select your career goal" />
            </SelectTrigger>
            <SelectContent>
              {CAREER_GOALS.map((g) => (
                <SelectItem key={g.value} value={g.value}>
                  {g.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Gaps are weighted by relevance to this goal — you won't be told to learn everything the target knows.
          </p>
        </div>

        <div className="mt-6 space-y-2">
          <Label htmlFor="resume">Resume (optional)</Label>
          <label
            htmlFor="resume"
            className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-input p-6 text-sm text-muted-foreground transition-colors hover:border-ring hover:text-foreground"
          >
            <Upload className="size-4" />
            {resume ?? "Upload PDF or DOCX"}
          </label>
          <input
            id="resume"
            type="file"
            accept=".pdf,.docx"
            className="hidden"
            onChange={(e) => setResume(e.target.files?.[0]?.name ?? null)}
          />
          <p className="text-xs text-muted-foreground">
            Resume claims are cross-checked against GitHub evidence — never treated as verified on their own.
          </p>
        </div>

        {error && <p className="mt-4 text-sm text-danger">{error}</p>}

        <Button className="mt-8 w-full" size="lg" onClick={submit}>
          <GitCompareArrows className="size-4" /> Analyze Comparison
        </Button>
      </Card>
    </main>
  );
}
