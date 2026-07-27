import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import type { EvenOddResult, MatchesDiffersResult } from "@/lib/deriv/analysis";
import type { Prediction, PredictionLayer } from "@/lib/deriv/prediction";
import { betaPosterior } from "@/lib/deriv/prediction";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface Props {
  layer: PredictionLayer;
  evenOdd: EvenOddResult;
  matches: MatchesDiffersResult;
  targetDigit: number;
  onSelectDigit?: (d: number) => void;
}

export function InsightsPanel({ layer, evenOdd, matches, targetDigit, onSelectDigit }: Props) {
  const [highConfidenceMode, setHighConfidenceMode] = useState<"matches" | "differs">("matches");

  if (layer.sampleSize < 20) {
    return (
      <div className="rounded-md border bg-muted/30 p-4 text-sm text-muted-foreground">
        Collecting ticks… need at least 20 samples to surface Even/Odd and Matches/Differs insights.
      </div>
    );
  }

  const eo = layer.predictions.find((p) => p.contract === "Even/Odd")!;
  const md = layer.predictions.find((p) => p.contract === "Matches/Differs")!;

  // Rank all 10 digits by combined (observed posterior mean + Markov one-step) probability.
  const colSums = Array.from({ length: 10 }, (_, d) =>
    layer.digitMarkov.counts.reduce((s, row) => s + row[d], 0),
  );
  const totalDigits = colSums.reduce((s, v) => s + v, 0);
  const ranking = colSums.map((c, d) => {
    const post = betaPosterior(c, totalDigits);
    const markov = layer.digitMarkov.nextDist[d];
    const combined = (post.mean + markov) / 2;
    return { digit: d, observed: post.mean, markov, combined, edge: combined - 0.1 };
  });
  const bestMatch = [...ranking].sort((a, b) => b.combined - a.combined)[0];
  const bestDiffer = [...ranking].sort((a, b) => a.combined - b.combined)[0];

  // High-confidence picks: digits whose MATCHES or DIFFERS probability clears 70%,
  // filtered by the user-selected mode.
  const HIGH = 0.7;
  const highConfidence = ranking
    .map((r) => {
      const matchProb = r.combined; // P(next digit == r.digit)
      const differProb = 1 - matchProb; // P(next digit != r.digit)
      if (highConfidenceMode === "matches" && matchProb >= HIGH)
        return { digit: r.digit, kind: "MATCHES" as const, prob: matchProb };
      if (highConfidenceMode === "differs" && differProb >= HIGH)
        return { digit: r.digit, kind: "DIFFERS" as const, prob: differProb };
      return null;
    })
    .filter((x): x is { digit: number; kind: "MATCHES" | "DIFFERS"; prob: number } => x !== null)
    .sort((a, b) => b.prob - a.prob);

  return (
    <div className="space-y-4">
      <div className="rounded-md border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            High-confidence digits ( &gt; 70% )
          </div>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "text-[10px] uppercase tracking-wide",
                highConfidenceMode === "matches" && "text-foreground",
              )}
            >
              Matches
            </span>
            <Switch
              id="high-confidence-mode"
              checked={highConfidenceMode === "differs"}
              onCheckedChange={(checked) => setHighConfidenceMode(checked ? "differs" : "matches")}
              aria-label="Toggle between Matches and Differs high-confidence digits"
            />
            <span
              className={cn(
                "text-[10px] uppercase tracking-wide",
                highConfidenceMode === "differs" && "text-foreground",
              )}
            >
              Differs
            </span>
          </div>
        </div>
        {highConfidence.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            No digit currently exceeds a 70%{" "}
            {highConfidenceMode === "matches" ? "MATCHES" : "DIFFERS"} probability in the selected
            window. Try a larger window or wait for a stronger skew to appear.
          </p>
        ) : (
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {highConfidence.map((h) => {
              const tone =
                h.kind === "MATCHES"
                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                  : "bg-rose-500/15 text-rose-700 dark:text-rose-300";
              return (
                <button
                  key={`${h.kind}-${h.digit}`}
                  onClick={onSelectDigit ? () => onSelectDigit(h.digit) : undefined}
                  disabled={!onSelectDigit}
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-md border bg-muted/20 p-3 text-left transition-colors",
                    onSelectDigit && "hover:bg-muted/40",
                    targetDigit === h.digit && "ring-1 ring-primary",
                  )}
                >
                  <div>
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      {h.kind} digit
                    </div>
                    <div className="mt-1 font-mono text-2xl font-bold tabular-nums">{h.digit}</div>
                  </div>
                  <Badge variant="outline" className={cn("border-0 text-sm", tone)}>
                    {(h.prob * 100).toFixed(1)}%
                  </Badge>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="rounded-md border bg-card p-4">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">
          Recommended digit to trade
        </div>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <DigitPick
            label="Best MATCHES digit"
            digit={bestMatch.digit}
            prob={bestMatch.combined}
            edge={bestMatch.edge}
            baseline={0.1}
            tone="up"
            active={targetDigit === bestMatch.digit}
            onClick={onSelectDigit ? () => onSelectDigit(bestMatch.digit) : undefined}
          />
          <DigitPick
            label="Best DIFFERS digit"
            digit={bestDiffer.digit}
            prob={bestDiffer.combined}
            edge={-bestDiffer.edge}
            baseline={0.1}
            tone="down"
            active={targetDigit === bestDiffer.digit}
            onClick={onSelectDigit ? () => onSelectDigit(bestDiffer.digit) : undefined}
          />
        </div>
        <div className="mt-3 grid grid-cols-10 gap-1">
          {ranking.map((r) => {
            const isHi = r.digit === bestMatch.digit;
            const isLo = r.digit === bestDiffer.digit;
            return (
              <button
                key={r.digit}
                onClick={onSelectDigit ? () => onSelectDigit(r.digit) : undefined}
                className={cn(
                  "rounded border p-1 text-center font-mono text-[11px] tabular-nums transition-colors",
                  isHi &&
                    "border-emerald-500/50 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
                  isLo && "border-rose-500/50 bg-rose-500/15 text-rose-700 dark:text-rose-300",
                  !isHi && !isLo && "bg-muted/30",
                  targetDigit === r.digit && "ring-1 ring-primary",
                )}
                title={`Digit ${r.digit}: ${(r.combined * 100).toFixed(1)}%`}
              >
                <div className="text-sm font-semibold">{r.digit}</div>
                <div className="text-[10px] text-muted-foreground">
                  {(r.combined * 100).toFixed(0)}%
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <InsightCard
        title="Even / Odd"
        prediction={eo}
        baseline={0.5}
        narrative={evenOddNarrative(evenOdd, eo)}
        extra={
          <Row
            label="Observed"
            value={`${evenOdd.evenPct.toFixed(1)}% E / ${evenOdd.oddPct.toFixed(1)}% O`}
          />
        }
      />
      <InsightCard
        title={`Matches / Differs (digit ${targetDigit})`}
        prediction={md}
        baseline={0.1}
        narrative={matchesNarrative(matches, md, targetDigit)}
        extra={
          <>
            <Row label="Observed match rate" value={`${matches.matchPct.toFixed(1)}%`} />
            <Row
              label="Hottest digit"
              value={`${matches.hottest.digit} (${matches.hottest.count})`}
            />
            <Row
              label="Coldest digit"
              value={`${matches.coldest.digit} (${matches.coldest.count})`}
            />
          </>
        }
      />
    </div>
  );
}

function DigitPick({
  label,
  digit,
  prob,
  edge,
  baseline,
  tone,
  active,
  onClick,
}: {
  label: string;
  digit: number;
  prob: number;
  edge: number;
  baseline: number;
  tone: "up" | "down";
  active?: boolean;
  onClick?: () => void;
}) {
  const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
  const toneClass =
    tone === "up"
      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
      : "bg-rose-500/15 text-rose-700 dark:text-rose-300";
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        "flex items-center justify-between gap-3 rounded-md border bg-muted/20 p-3 text-left transition-colors",
        onClick && "hover:bg-muted/40",
        active && "ring-1 ring-primary",
      )}
    >
      <div>
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="mt-1 font-mono text-2xl font-bold tabular-nums">{digit}</div>
        <div className="text-[11px] text-muted-foreground">
          {pct(prob)} vs {pct(baseline)} baseline
        </div>
      </div>
      <Badge variant="outline" className={cn("border-0", toneClass)}>
        {edge >= 0 ? "+" : ""}
        {(edge * 100).toFixed(1)} pts
      </Badge>
    </button>
  );
}

function InsightCard({
  title,
  prediction,
  baseline,
  narrative,
  extra,
}: {
  title: string;
  prediction: Prediction;
  baseline: number;
  narrative: { headline: string; tone: "strong" | "moderate" | "weak"; detail: string };
  extra?: React.ReactNode;
}) {
  const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
  const tone =
    narrative.tone === "strong"
      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
      : narrative.tone === "moderate"
        ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
        : "bg-muted text-muted-foreground";

  return (
    <div className="rounded-md border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">{title}</div>
          <div className="mt-1 text-base font-semibold">{narrative.headline}</div>
        </div>
        <Badge variant="outline" className={cn("border-0", tone)}>
          {prediction.direction}
        </Badge>
      </div>

      <p className="mt-2 text-sm text-muted-foreground">{narrative.detail}</p>

      <div className="mt-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Combined probability (baseline {pct(baseline)})</span>
          <span className="font-mono tabular-nums text-foreground">
            {pct(prediction.combinedProb)}
          </span>
        </div>
        <Progress value={prediction.combinedProb * 100} className="mt-1 h-2" />
        <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground tabular-nums">
          <span>
            95% CI {pct(prediction.combinedCI[0])} – {pct(prediction.combinedCI[1])}
          </span>
          <span>edge {pct(prediction.edge)}</span>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
        <Mini label="Bayes" value={pct(prediction.bayes.mean)} />
        <Mini label="Markov" value={pct(prediction.markovProb)} />
        <Mini label="Monte Carlo" value={pct(prediction.monteCarlo.p)} />
      </div>

      {extra && <div className="mt-3 space-y-1 border-t pt-3 text-sm">{extra}</div>}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono tabular-nums">{value}</span>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border bg-muted/30 p-1.5 text-center">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="font-mono text-xs font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function evenOddNarrative(r: EvenOddResult, p: Prediction) {
  const edgePct = p.edge * 100;
  const tone: "strong" | "moderate" | "weak" =
    edgePct >= 8 ? "strong" : edgePct >= 3 ? "moderate" : "weak";
  const streakNote =
    r.streak.length >= 4
      ? ` Current run: ${r.streak.length} consecutive ${r.streak.kind.toUpperCase()} — streaks can extend or break.`
      : "";
  const headline =
    tone === "weak"
      ? "No meaningful edge right now"
      : `${p.direction} leaning by ${edgePct.toFixed(1)} pts above 50%`;
  const detail =
    tone === "weak"
      ? `Even and Odd are tracking near their 50/50 baseline (observed ${r.evenPct.toFixed(1)}% Even).${streakNote}`
      : `Models agree on ${p.direction}: posterior ${(p.bayes.mean * 100).toFixed(1)}%, Markov ${(p.markovProb * 100).toFixed(1)}%, MC ${(p.monteCarlo.p * 100).toFixed(1)}%.${streakNote}`;
  return { headline, tone, detail };
}

function matchesNarrative(r: MatchesDiffersResult, p: Prediction, target: number) {
  const edgePct = p.edge * 100;
  const tone: "strong" | "moderate" | "weak" =
    edgePct >= 5 ? "strong" : edgePct >= 2 ? "moderate" : "weak";
  const hotCold =
    r.hottest.digit === target
      ? ` Digit ${target} is the hottest in the window.`
      : r.coldest.digit === target
        ? ` Digit ${target} is the coldest in the window.`
        : "";
  const headline =
    tone === "weak"
      ? `Digit ${target} sits near its 10% baseline`
      : `${p.direction} on digit ${target} (${edgePct.toFixed(1)} pts off 10%)`;
  const detail =
    tone === "weak"
      ? `Match probability ${(p.monteCarlo.p * 100).toFixed(1)}% is too close to 10% to call an edge.${hotCold}`
      : `Posterior ${(p.bayes.mean * 100).toFixed(1)}%, Markov ${(p.markovProb * 100).toFixed(1)}%, MC ${(p.monteCarlo.p * 100).toFixed(1)}%.${hotCold}`;
  return { headline, tone, detail };
}
