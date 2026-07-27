import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Activity, Wifi, WifiOff, Download } from "lucide-react";
import { DERIV_SYMBOLS, isOneSecondIndex } from "@/lib/deriv/symbols";
import { useDerivTicks } from "@/hooks/useDerivTicks";
import {
  evenOdd,
  riseFall,
  digitFrequency,
  matchesDiffers,
  overUnder,
  overallSignal,
  takeWindow,
} from "@/lib/deriv/analysis";
import { PriceChart } from "@/components/analyzer/PriceChart";
import { DigitHistogram } from "@/components/analyzer/DigitHistogram";
import { RecentDigits } from "@/components/analyzer/RecentDigits";
import { SignalCard } from "@/components/analyzer/SignalCard";
import { EvenOddPanel } from "@/components/analyzer/EvenOddPanel";
import { RiseFallPanel } from "@/components/analyzer/RiseFallPanel";
import { MatchesDiffersPanel } from "@/components/analyzer/MatchesDiffersPanel";
import { OverUnderPanel } from "@/components/analyzer/OverUnderPanel";
import { PredictionPanel } from "@/components/analyzer/PredictionPanel";
import { InsightsPanel } from "@/components/analyzer/InsightsPanel";
import { SymbolScannerPanel } from "@/components/analyzer/SymbolScannerPanel";
import { TradePickPanel } from "@/components/analyzer/TradePickPanel";
import { DerivAccountPanel } from "@/components/analyzer/DerivAccountPanel";
import { AutoBotPanel } from "@/components/analyzer/AutoBotPanel";
import { TradeHistoryPanel } from "@/components/analyzer/TradeHistoryPanel";
import { useDerivAccount } from "@/hooks/useDerivAccount";
import { buildPredictionLayer } from "@/lib/deriv/prediction";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Deriv Synthetic Indices Analyzer" },
      {
        name: "description",
        content:
          "Real-time statistical analysis and probability signals for Deriv synthetic indices: Even/Odd, Rise/Fall, Matches/Differs, Over/Under.",
      },
      { property: "og:title", content: "Deriv Synthetic Indices Analyzer" },
      {
        property: "og:description",
        content:
          "Live tick statistics and probabilistic signals for Deriv volatility indices. Analysis only — not financial advice.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: Index,
});

const WINDOWS = [10, 25, 50, 100, 500] as const;

function Index() {
  const [symbol, setSymbol] = useState<string>(DERIV_SYMBOLS[3].code);
  const [windowSize, setWindowSize] = useState<number>(100);
  const [targetDigit, setTargetDigit] = useState<number>(0);
  const [barrier, setBarrier] = useState<number>(5);
  const [activeView, setActiveView] = useState("auto-bot");

  const { ticks, status } = useDerivTicks(symbol);
  const account = useDerivAccount();

  // Scroll to the relevant content when active view changes
  const contentRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (["auto-bot", "history", "settings"].includes(activeView)) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      // Scroll the strategy panels into view so the user doesn't have to scroll past the global charts
      contentRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [activeView]);

  const windowed = useMemo(() => takeWindow(ticks, windowSize), [ticks, windowSize]);

  const evenOddR = useMemo(() => evenOdd(windowed), [windowed]);
  const riseFallR = useMemo(() => riseFall(windowed), [windowed]);
  const freq = useMemo(() => digitFrequency(windowed), [windowed]);
  const matchesR = useMemo(() => matchesDiffers(windowed, targetDigit), [windowed, targetDigit]);
  const overUnderR = useMemo(() => overUnder(windowed, barrier), [windowed, barrier]);
  const overall = useMemo(
    () =>
      overallSignal({
        evenOdd: evenOddR,
        riseFall: riseFallR,
        matchesDiffers: matchesR,
        overUnder: overUnderR,
      }),
    [evenOddR, riseFallR, matchesR, overUnderR],
  );

  const prediction = useMemo(
    () => buildPredictionLayer({ ticks: windowed, targetDigit, barrier }),
    [windowed, targetDigit, barrier],
  );

  const lastTick = ticks[ticks.length - 1];

  return (
    <SidebarProvider>
      <AppSidebar activeView={activeView} setActiveView={setActiveView} />
      <SidebarInset>
        <main className="min-h-screen bg-transparent text-foreground pb-12 selection:bg-primary/30">
          <div className="mx-auto w-full max-w-7xl space-y-6 px-4 pt-2 pb-8">
            <header className="sticky top-0 z-40 -mx-4 px-4 py-3 mb-6 flex flex-wrap items-center justify-between gap-4 glass-header rounded-b-xl shadow-sm border-b border-white/10 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <SidebarTrigger />
                <div className="hidden sm:block">
                  <h1 className="flex items-center gap-2 text-lg font-bold text-foreground/90">
                    <Activity className="h-4 w-4 text-primary" />
                    Analyzer
                  </h1>
                </div>
              </div>

              <div className="flex flex-1 flex-wrap items-center justify-end gap-3 lg:gap-6">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground hidden lg:inline">Symbol</span>
                  <Select value={symbol} onValueChange={setSymbol}>
                    <SelectTrigger className="h-8 w-[130px] sm:w-[160px] bg-background/50 border-white/10 text-xs sm:text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DERIV_SYMBOLS.map((s) => (
                        <SelectItem key={s.code} value={s.code}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground hidden lg:inline">Window</span>
                  <Select value={String(windowSize)} onValueChange={(v) => setWindowSize(Number(v))}>
                    <SelectTrigger className="h-8 w-[90px] sm:w-[100px] bg-background/50 border-white/10 text-xs sm:text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {WINDOWS.map((w) => (
                        <SelectItem key={w} value={String(w)}>
                          Last {w}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="hidden md:flex flex-col items-end">
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Quote</span>
                  <span className="font-mono text-sm font-bold text-primary drop-shadow-[0_0_8px_var(--color-primary)]">
                    {lastTick ? lastTick.quoteStr : "—"}
                  </span>
                </div>
                
                <StatusBadge status={status} />
              </div>
            </header>

            <div className={cn("animate-in fade-in zoom-in-95 duration-500", activeView === "settings" ? "block" : "hidden")}>
              <DerivAccountPanel account={account} />
            </div>

            <section className={cn("grid gap-6 lg:grid-cols-3", ["auto-bot", "history", "settings"].includes(activeView) ? "hidden" : "")}>
              <Card className="lg:col-span-2 glass-panel hover:border-primary/40 transition-all duration-300">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Price (last 150 ticks)</CardTitle>
                </CardHeader>
                <CardContent>
                  <PriceChart ticks={ticks} />
                </CardContent>
              </Card>
              <Card className="glass-panel hover:border-primary/40 transition-all duration-300">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Overall signal</CardTitle>
                </CardHeader>
                <CardContent>
                  <SignalCard signal={overall} />
                </CardContent>
              </Card>
            </section>

            <section className={cn("grid gap-6 lg:grid-cols-2", ["auto-bot", "history", "settings"].includes(activeView) ? "hidden" : "")}>
              <Card className="glass-panel hover:border-primary/40 transition-all duration-300">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Digit frequency (0–9)</CardTitle>
                </CardHeader>
                <CardContent>
                  <DigitHistogram freq={freq} />
                  <p className="mt-2 text-xs text-muted-foreground">
                    Green = most frequent, red = least frequent in the selected window.
                  </p>
                </CardContent>
              </Card>
              <Card className="glass-panel hover:border-primary/40 transition-all duration-300">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Recent last-digits</CardTitle>
                </CardHeader>
                <CardContent>
                  <RecentDigits ticks={ticks} />
                </CardContent>
              </Card>
            </section>

            <Card 
              ref={contentRef}
              className={cn("glass-panel hover:border-primary/40 transition-all duration-500 overflow-hidden scroll-mt-28", activeView === "settings" ? "hidden" : "block")}
            >
              <CardContent className="p-3 sm:p-4">
                <div className={cn("mt-2", activeView === "auto-bot" ? "block" : "hidden")}>
                  <AutoBotPanel />
                </div>
                <div className={cn("mt-2", activeView === "history" ? "block" : "hidden")}>
                  <TradeHistoryPanel />
                </div>
                <div className={cn("mt-2 space-y-4", activeView === "insights" ? "block" : "hidden")}>
                  <TradePickPanel
                    currentSymbol={symbol}
                    currentDigit={targetDigit}
                    onApply={(sym, digit) => {
                      setSymbol(sym);
                      setTargetDigit(digit);
                    }}
                    account={account}
                  />
                  <InsightsPanel
                    layer={prediction}
                    evenOdd={evenOddR}
                    matches={matchesR}
                    targetDigit={targetDigit}
                    onSelectDigit={setTargetDigit}
                  />
                </div>
                <div className={cn("mt-2", activeView === "predictions" ? "block" : "hidden")}>
                  <PredictionPanel layer={prediction} />
                </div>
                <div className={cn("mt-2", activeView === "scanner" ? "block" : "hidden")}>
                  <SymbolScannerPanel
                    targetDigit={targetDigit}
                    barrier={barrier}
                    currentSymbol={symbol}
                    onSelectSymbol={setSymbol}
                  />
                </div>
                <div className={cn("mt-2", activeView === "even-odd" ? "block" : "hidden")}>
                  <EvenOddPanel r={evenOddR} />
                </div>
                <div className={cn("mt-2", activeView === "rise-fall" ? "block" : "hidden")}>
                  <RiseFallPanel r={riseFallR} />
                </div>
                <div className={cn("mt-2", activeView === "matches-differs" ? "block" : "hidden")}>
                  <MatchesDiffersPanel
                    r={matchesR}
                    digit={targetDigit}
                    onDigitChange={setTargetDigit}
                  />
                </div>
                <div className={cn("mt-2", activeView === "over-under" ? "block" : "hidden")}>
                  <OverUnderPanel r={overUnderR} barrier={barrier} onBarrierChange={setBarrier} />
                </div>
              </CardContent>
            </Card>

            <footer className="pt-4 text-center text-xs text-muted-foreground">
              Data: Deriv public WebSocket API · Analysis only · Not affiliated with Deriv.com
            </footer>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const open = status === "open";
  return (
    <Badge
      variant="outline"
      className={cn(
        "flex items-center gap-1.5 border-0 px-2.5 py-1 text-xs",
        open
          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
          : "bg-amber-500/15 text-amber-700 dark:text-amber-300",
      )}
    >
      {open ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
      {status === "open"
        ? "Live"
        : status === "connecting"
          ? "Connecting…"
          : status === "closed"
            ? "Reconnecting…"
            : status === "error"
              ? "Error"
              : "Idle"}
    </Badge>
  );
}
