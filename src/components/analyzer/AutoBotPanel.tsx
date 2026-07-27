import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Bot, Play, Square, Loader2 } from "lucide-react";
import { DERIV_SYMBOLS } from "@/lib/deriv/symbols";
import { useDerivAccount } from "@/hooks/useDerivAccount";
import { useAutoTrader } from "@/hooks/useAutoTrader";
import { cn } from "@/lib/utils";

export function AutoBotPanel() {
  const account = useDerivAccount();
  const [symbol, setSymbol] = useState(DERIV_SYMBOLS[0].code);
  const [kind, setKind] = useState<"MATCHES" | "DIFFERS" | "EVEN" | "ODD" | "OVER" | "UNDER" | "RISE" | "FALL">("RISE");
  const [digit, setDigit] = useState<number>(0);
  const [stake, setStake] = useState<number>(1);
  const [threshold, setThreshold] = useState<number>(55);
  const [windowSize, setWindowSize] = useState<number>(50);
  const [takeProfit, setTakeProfit] = useState<number>(10);
  const [stopLoss, setStopLoss] = useState<number>(20);
  const [recoverAfter, setRecoverAfter] = useState<2 | 3 | 4 | 5>(2);
  const [active, setActive] = useState(false);

  const isConnected = account.status === "connected" && !!account.active;
  
  // The threshold needs to be passed as a fraction. If user sets 55%, we pass 0.55
  const auto = useAutoTrader(
    {
      enabled: active && isConnected,
      symbol,
      kind,
      digit: ["MATCHES", "DIFFERS", "OVER", "UNDER"].includes(kind) ? digit : undefined,
      stake: Number.isFinite(stake) && stake > 0 ? stake : 1,
      threshold: Math.max(1, Math.min(99, threshold)) / 100,
      window: Math.max(10, Math.floor(windowSize)),
      recoverAfter,
      takeProfit: Math.max(0, takeProfit),
      stopLoss: Math.max(0, stopLoss),
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    account ?? ({} as any)
  );

  // Automatically turn off if stopped by TP/SL
  if (active && auto.stopped) {
    setActive(false);
  }

  const requiresDigit = ["MATCHES", "DIFFERS", "OVER", "UNDER"].includes(kind);

  return (
    <Card className="glass-panel overflow-hidden border-primary/20">
      <CardHeader className="bg-primary/5 pb-4 border-b border-white/5">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bot className="h-5 w-5 text-primary" />
            Fully Automated Trading Bot
          </CardTitle>
          <Badge variant={active ? "default" : "secondary"} className={cn("transition-all", active ? "bg-emerald-500 hover:bg-emerald-600 animate-pulse" : "")}>
            {active ? "RUNNING" : "STOPPED"}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="p-4 sm:p-6 grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Strategy Type</label>
              <Select value={kind} onValueChange={(v: any) => setKind(v)} disabled={active}>
                <SelectTrigger className="h-9 bg-background/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RISE">Rise</SelectItem>
                  <SelectItem value="FALL">Fall</SelectItem>
                  <SelectItem value="EVEN">Even</SelectItem>
                  <SelectItem value="ODD">Odd</SelectItem>
                  <SelectItem value="MATCHES">Matches</SelectItem>
                  <SelectItem value="DIFFERS">Differs</SelectItem>
                  <SelectItem value="OVER">Over</SelectItem>
                  <SelectItem value="UNDER">Under</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Symbol</label>
              <Select value={symbol} onValueChange={setSymbol} disabled={active}>
                <SelectTrigger className="h-9 bg-background/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DERIV_SYMBOLS.map((s) => (
                    <SelectItem key={s.code} value={s.code}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Trigger Threshold (%)</label>
              <Input type="number" min={1} max={99} value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} disabled={active} className="h-9 bg-background/50 font-mono" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Over Window (Ticks)</label>
              <Input type="number" min={10} value={windowSize} onChange={(e) => setWindowSize(Number(e.target.value))} disabled={active} className="h-9 bg-background/50 font-mono" />
            </div>
          </div>

          {requiresDigit && (
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Target Digit / Barrier (0-9)</label>
              <div className="grid grid-cols-5 sm:grid-cols-10 gap-1">
                {Array.from({ length: 10 }, (_, d) => (
                  <button
                    key={d}
                    type="button"
                    disabled={active}
                    onClick={() => setDigit(d)}
                    className={cn(
                      "h-8 rounded font-mono text-sm tabular-nums transition-colors",
                      digit === d ? "bg-primary text-primary-foreground" : "bg-muted/50 hover:bg-muted"
                    )}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-white/5 pt-4">
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Stake</label>
              <Input type="number" min={0.35} step={0.5} value={stake} onChange={(e) => setStake(Number(e.target.value))} disabled={active} className="h-9 bg-background/50 font-mono" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Take Profit</label>
              <Input type="number" min={0} value={takeProfit} onChange={(e) => setTakeProfit(Number(e.target.value))} disabled={active} className="h-9 bg-background/50 font-mono" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Stop Loss</label>
              <Input type="number" min={0} value={stopLoss} onChange={(e) => setStopLoss(Number(e.target.value))} disabled={active} className="h-9 bg-background/50 font-mono" />
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Martingale Recovery (Double after)</label>
            <Select value={String(recoverAfter)} onValueChange={(v) => setRecoverAfter(Number(v) as any)} disabled={active}>
              <SelectTrigger className="h-8 w-32 bg-background/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2">2 losses</SelectItem>
                <SelectItem value="3">3 losses</SelectItem>
                <SelectItem value="4">4 losses</SelectItem>
                <SelectItem value="5">5 losses</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-col gap-4 border-t lg:border-t-0 lg:border-l border-white/5 pt-6 lg:pt-0 lg:pl-6">
          <div className="flex-1 rounded-lg border border-white/5 bg-black/20 p-4 space-y-4">
            <div className="flex justify-between items-end">
              <div className="text-[11px] text-muted-foreground uppercase tracking-wide">Live P&L</div>
              <div className={cn("text-3xl font-bold font-mono tracking-tight", auto.pnl > 0 ? "text-emerald-500" : auto.pnl < 0 ? "text-rose-500" : "text-foreground")}>
                {auto.pnl >= 0 ? "+" : ""}{auto.pnl.toFixed(2)}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-sm font-mono">
              <div className="bg-background/40 p-2 rounded-md">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Wins</div>
                <div className="text-emerald-400">{auto.wins}</div>
              </div>
              <div className="bg-background/40 p-2 rounded-md">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Losses</div>
                <div className="text-rose-400">{auto.losses}</div>
              </div>
            </div>

            <div className="bg-background/40 p-3 rounded-md text-xs font-mono space-y-1">
              <div className="flex justify-between text-muted-foreground">
                <span>Current Strategy Prob:</span>
                <span className="text-primary">{auto.freq != null ? (auto.freq * 100).toFixed(1) + "%" : "..."}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Execution Gate:</span>
                <span>{threshold}%</span>
              </div>
            </div>

            <div className="text-xs text-center text-muted-foreground mt-auto pt-4 min-h-[40px]">
              {auto.lastMsg || "Ready to start..."}
            </div>
          </div>

          <Button 
            size="lg" 
            onClick={() => setActive(!active)} 
            disabled={!isConnected}
            className={cn(
              "w-full h-14 font-bold text-lg tracking-wide transition-all shadow-lg",
              active ? "bg-rose-600 hover:bg-rose-700 text-white" : "bg-emerald-600 hover:bg-emerald-700 text-white"
            )}
          >
            {!isConnected ? (
              <>Connect Deriv Account First</>
            ) : active ? (
              <>
                <Square className="mr-2 h-5 w-5 fill-current" />
                STOP TRADING
              </>
            ) : (
              <>
                <Play className="mr-2 h-5 w-5 fill-current" />
                START BOT
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
