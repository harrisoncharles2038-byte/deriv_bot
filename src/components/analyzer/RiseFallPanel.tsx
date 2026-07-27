import type { RiseFallResult } from "@/lib/deriv/analysis";

export function RiseFallPanel({ r }: { r: RiseFallResult }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Stat label="Rises" value={r.rises} pct={r.risePct} color="bg-emerald-500" />
      <Stat label="Falls" value={r.falls} pct={r.fallPct} color="bg-rose-500" />
      <div className="rounded-md border bg-card p-3 text-sm sm:col-span-2">
        <Row label="Direction" value={r.direction} />
        <Row
          label="Consecutive"
          value={`${r.consecutive.length}× ${r.consecutive.kind.toUpperCase()}`}
        />
        <Row label="SMA 5" value={r.sma5?.toFixed(4) ?? "—"} />
        <Row label="SMA 10" value={r.sma10?.toFixed(4) ?? "—"} />
        <Row label="SMA 20" value={r.sma20?.toFixed(4) ?? "—"} />
        <Row label="Confidence" value={`${r.confidence}%`} />
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  pct,
  color,
}: {
  label: string;
  value: number;
  pct: number;
  color: string;
}) {
  return (
    <div className="rounded-md border bg-card p-3">
      <div className="flex items-baseline justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="text-lg font-semibold tabular-nums">{pct.toFixed(1)}%</span>
      </div>
      <div className="my-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="text-xs text-muted-foreground tabular-nums">{value} moves</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono tabular-nums">{value}</span>
    </div>
  );
}
