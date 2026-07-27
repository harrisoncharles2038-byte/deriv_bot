import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { Prediction, PredictionLayer } from "@/lib/deriv/prediction";
import { cn } from "@/lib/utils";

export function PredictionPanel({ layer }: { layer: PredictionLayer }) {
  if (layer.sampleSize < 20) {
    return (
      <div className="rounded-md border bg-muted/30 p-4 text-sm text-muted-foreground">
        Collecting ticks… need at least 20 samples to produce stable Markov / Bayesian / Monte Carlo
        estimates.
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {layer.predictions.map((p) => (
          <PredictionCard key={p.contract} p={p} />
        ))}
      </div>
    </div>
  );
}

function PredictionCard({ p }: { p: Prediction }) {
  const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
  const strong = p.edge >= 0.08;
  const moderate = !strong && p.edge >= 0.03;
  const tone = strong
    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
    : moderate
      ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
      : "bg-muted text-muted-foreground";
  return (
    <div className="rounded-md border bg-card p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">{p.contract}</div>
          <div className="mt-0.5 text-sm font-medium">{p.label}</div>
        </div>
        <Badge variant="outline" className={cn("border-0", tone)}>
          {p.direction}
        </Badge>
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Combined probability</span>
          <span className="font-mono tabular-nums text-foreground">{pct(p.combinedProb)}</span>
        </div>
        <Progress value={p.combinedProb * 100} className="mt-1 h-2" />
        <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground tabular-nums">
          <span>
            95% CI {pct(p.combinedCI[0])} – {pct(p.combinedCI[1])}
          </span>
          <span>± {pct(p.uncertainty / 2)}</span>
        </div>
      </div>

      <dl className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
        <Stat
          label="Bayes"
          value={pct(p.bayes.mean)}
          sub={`n=${p.bayes.alpha + p.bayes.beta - 2}`}
        />
        <Stat label="Markov" value={pct(p.markovProb)} sub="1-step" />
        <Stat
          label="Monte Carlo"
          value={pct(p.monteCarlo.p)}
          sub={`±${pct(p.monteCarlo.uncertainty / 2)}`}
        />
      </dl>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded border bg-muted/30 p-1.5 text-center">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="font-mono text-xs font-semibold tabular-nums">{value}</div>
      <div className="text-[10px] text-muted-foreground tabular-nums">{sub}</div>
    </div>
  );
}
