import type { OverUnderResult } from "@/lib/deriv/analysis";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function OverUnderPanel({
  r,
  barrier,
  onBarrierChange,
}: {
  r: OverUnderResult;
  barrier: number;
  onBarrierChange: (b: number) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm text-muted-foreground">Barrier</label>
        <Select value={String(barrier)} onValueChange={(v) => onBarrierChange(Number(v))}>
          <SelectTrigger className="h-8 w-20">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: 10 }, (_, i) => (
              <SelectItem key={i} value={String(i)}>
                {i}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">
          Over = digit &gt; {barrier}; Under = digit &lt; {barrier}
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label={`Over ${barrier}`} value={r.over} pct={r.overPct} color="bg-emerald-500" />
        <Stat label={`Under ${barrier}`} value={r.under} pct={r.underPct} color="bg-rose-500" />
        <Stat
          label={`Equal ${barrier}`}
          value={r.equal}
          pct={r.total ? (r.equal / r.total) * 100 : 0}
          color="bg-slate-400"
        />
      </div>

      <div className="rounded-md border bg-card p-3 text-sm">
        <Row label="Signal" value={r.signal} mono />
        <Row label="Confidence" value={`${r.confidence}%`} mono />
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
      <div className="text-xs text-muted-foreground tabular-nums">{value} ticks</div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-muted-foreground">{label}</span>
      <span className={mono ? "font-mono font-semibold" : "font-mono tabular-nums"}>{value}</span>
    </div>
  );
}
