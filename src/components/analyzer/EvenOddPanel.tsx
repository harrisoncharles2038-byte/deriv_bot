import type { EvenOddResult } from "@/lib/deriv/analysis";

export function EvenOddPanel({ r }: { r: EvenOddResult }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Stat label="Even" value={r.even} pct={r.evenPct} color="bg-blue-500" />
      <Stat label="Odd" value={r.odd} pct={r.oddPct} color="bg-orange-500" />
      <div className="rounded-md border bg-card p-3 text-sm sm:col-span-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-muted-foreground">Current streak</span>
          <span className="font-medium">
            {r.streak.length}× {r.streak.kind.toUpperCase()}
          </span>
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <span className="text-muted-foreground">Signal</span>
          <span className="font-mono text-sm font-semibold">{r.signal}</span>
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <span className="text-muted-foreground">Confidence</span>
          <span className="tabular-nums">{r.confidence}%</span>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, pct, color }: { label: string; value: number; pct: number; color: string }) {
  return (
    <div className="rounded-md border bg-card p-3">
      <div className="flex items-baseline justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="text-lg font-semibold tabular-nums">{pct.toFixed(1)}%</span>
      </div>
      <div className="my-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="text-xs text-muted-foreground tabular-nums">{value} ticks</div>
    </div>
  );
}