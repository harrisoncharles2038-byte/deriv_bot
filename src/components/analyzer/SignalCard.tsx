import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { OverallSignal } from "@/lib/deriv/analysis";
import { cn } from "@/lib/utils";

export function SignalCard({ signal }: { signal: OverallSignal }) {
  const actionColor =
    signal.action === "ENTER"
      ? "bg-emerald-500 text-white"
      : signal.action === "WAIT"
        ? "bg-amber-500 text-white"
        : "bg-rose-500 text-white";
  const riskColor =
    signal.risk === "LOW"
      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
      : signal.risk === "MEDIUM"
        ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
        : "bg-rose-500/15 text-rose-700 dark:text-rose-300";

  return (
    <div className="flex h-full flex-col gap-4">
      <div>
        <div className="text-xs uppercase tracking-wide text-muted-foreground">
          Recommended action
        </div>
        <div className="mt-2 flex items-center gap-3">
          <span className={cn("inline-flex rounded-md px-3 py-1.5 text-lg font-bold", actionColor)}>
            {signal.action}
          </span>
          <Badge variant="outline" className={cn("border-0 font-medium", riskColor)}>
            Risk: {signal.risk}
          </Badge>
        </div>
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
          <span>Confidence</span>
          <span className="font-mono tabular-nums text-foreground">{signal.score}/100</span>
        </div>
        <Progress value={signal.score} className="h-2" />
      </div>

      <div className="rounded-md border border-border/60 bg-muted/30 p-3 text-sm">
        {signal.best ? (
          <>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              Strongest signal
            </div>
            <div className="mt-1 font-medium">{signal.best.kind}</div>
            <div className="text-muted-foreground">
              {signal.best.signal} · {signal.best.confidence}% confidence
            </div>
          </>
        ) : (
          <div className="text-muted-foreground">
            No statistically significant edge in the current window. Hold off.
          </div>
        )}
      </div>
    </div>
  );
}
