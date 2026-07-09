import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useSymbolScanner } from "@/hooks/useSymbolScanner";
import { isOneSecondIndex } from "@/lib/deriv/symbols";
import { cn } from "@/lib/utils";
import { RefreshCw } from "lucide-react";

interface Props {
  targetDigit: number;
  barrier: number;
  currentSymbol: string;
  onSelectSymbol: (code: string) => void;
}

export function SymbolScannerPanel({ targetDigit, barrier, currentSymbol, onSelectSymbol }: Props) {
  const { results, status, progress, scannedAt, scan } = useSymbolScanner(targetDigit, barrier);
  const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
  const top = results[0];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-sm font-semibold">Volatility Index Scanner</div>
          <div className="text-xs text-muted-foreground">
            Compares all 10 volatility indices (250 ticks each) and ranks them by maximum prediction edge.
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={() => void scan()} disabled={status === "scanning"}>
          <RefreshCw className={cn("mr-1.5 h-3.5 w-3.5", status === "scanning" && "animate-spin")} />
          {status === "scanning" ? "Scanning…" : "Rescan"}
        </Button>
      </div>

      {status === "scanning" && (
        <div>
          <Progress value={progress * 100} className="h-2" />
          <div className="mt-1 text-[11px] text-muted-foreground">
            {Math.round(progress * 100)}% — fetching history for each symbol.
          </div>
        </div>
      )}

      {top && (
        <div className="rounded-md border bg-card p-4">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
            Recommended volatility index
          </div>
          <div className="mt-1 flex flex-wrap items-baseline justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="text-lg font-bold">{top.name}</div>
              <Badge variant="outline" className="border-0 bg-muted text-[10px] text-muted-foreground">
                {isOneSecondIndex(top.code) ? "1s" : "std"}
              </Badge>
            </div>
            <Badge variant="outline" className="border-0 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
              edge {pct(top.bestEdge)}
            </Badge>
          </div>
          <div className="mt-1 text-sm">
            <span className="text-muted-foreground">Best contract: </span>
            <span className="font-medium">
              {top.bestContract} → {top.bestDirection}
            </span>{" "}
            <span className="font-mono tabular-nums text-muted-foreground">
              ({pct(top.bestProb)}, 95% CI {pct(top.ciLow)}–{pct(top.ciHigh)})
            </span>
          </div>
          {top.code !== currentSymbol && (
            <Button size="sm" className="mt-3" onClick={() => onSelectSymbol(top.code)}>
              Switch to {top.name}
            </Button>
          )}
        </div>
      )}

      {results.length > 0 && (
        <div className="overflow-hidden rounded-md border">
          <table className="w-full text-xs">
            <thead className="bg-muted/40 text-[10px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-2 py-1.5 text-left">Symbol</th>
                <th className="px-2 py-1.5 text-left">Best</th>
                <th className="px-2 py-1.5 text-right">Prob</th>
                <th className="px-2 py-1.5 text-right">Edge</th>
                <th className="px-2 py-1.5 text-right">CI width</th>
                <th className="px-2 py-1.5"></th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => {
                const tone =
                  r.bestEdge >= 0.08
                    ? "text-emerald-700 dark:text-emerald-300"
                    : r.bestEdge >= 0.03
                      ? "text-amber-700 dark:text-amber-300"
                      : "text-muted-foreground";
                return (
                  <tr
                    key={r.code}
                    className={cn(
                      "border-t",
                      r.code === currentSymbol && "bg-primary/5",
                    )}
                  >
                    <td className="px-2 py-1.5">
                      <div className="flex items-center gap-1.5">
                        <span>{r.name}</span>
                        <Badge variant="outline" className="border-0 bg-muted px-1.5 text-[10px] text-muted-foreground">
                          {isOneSecondIndex(r.code) ? "1s" : "std"}
                        </Badge>
                      </div>
                    </td>
                    <td className="px-2 py-1.5">
                      <span className="font-medium">{r.bestContract}</span>{" "}
                      <span className="text-muted-foreground">{r.bestDirection}</span>
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono tabular-nums">{pct(r.bestProb)}</td>
                    <td className={cn("px-2 py-1.5 text-right font-mono tabular-nums font-semibold", tone)}>
                      {pct(r.bestEdge)}
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono tabular-nums text-muted-foreground">
                      {pct(r.uncertainty)}
                    </td>
                    <td className="px-2 py-1.5 text-right">
                      {r.code !== currentSymbol ? (
                        <button
                          onClick={() => onSelectSymbol(r.code)}
                          className="text-primary hover:underline"
                        >
                          select
                        </button>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">current</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {scannedAt && status === "done" && (
        <div className="text-[11px] text-muted-foreground">
          Last scan {new Date(scannedAt).toLocaleTimeString()}. Edges are snapshots — markets change tick to tick.
        </div>
      )}
    </div>
  );
}