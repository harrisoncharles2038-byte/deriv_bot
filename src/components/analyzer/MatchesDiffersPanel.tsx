import type { MatchesDiffersResult } from "@/lib/deriv/analysis";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function MatchesDiffersPanel({
  r,
  digit,
  onDigitChange,
}: {
  r: MatchesDiffersResult;
  digit: number;
  onDigitChange: (d: number) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm text-muted-foreground">Target digit</label>
        <Select value={String(digit)} onValueChange={(v) => onDigitChange(Number(v))}>
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
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Stat label={`Matches (${digit})`} value={r.matches} pct={r.matchPct} color="bg-emerald-500" />
        <Stat label="Differs" value={r.differs} pct={r.differPct} color="bg-indigo-500" />
      </div>

      <div className="rounded-md border bg-card p-3 text-sm">
        <Row label="Hottest digit" value={`${r.hottest.digit} (${r.hottest.count})`} />
        <Row label="Coldest digit" value={`${r.coldest.digit} (${r.coldest.count})`} />
        <Row label="Signal" value={r.signal} mono />
        <Row label="Confidence" value={`${r.confidence}%`} mono />
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

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-muted-foreground">{label}</span>
      <span className={mono ? "font-mono font-semibold" : "font-mono tabular-nums"}>{value}</span>
    </div>
  );
}