import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

  const { ticks, status } = useDerivTicks(symbol);
  const account = useDerivAccount();

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
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-6xl space-y-4 px-4 py-6">
        <header className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="flex items-center gap-2 text-xl font-bold sm:text-2xl">
                <Activity className="h-5 w-5 text-primary" />
                Deriv Synthetic Indices Analyzer
              </h1>
              <p className="text-xs text-muted-foreground sm:text-sm">
                Live tick statistics for Even/Odd, Rise/Fall, Matches/Differs, and Over/Under.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <a
                href="/api/export/zip"
                download="project-export.zip"
                className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium text-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <Download className="h-3.5 w-3.5" />
                Export ZIP
              </a>
              <StatusBadge status={status} />
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-3">
            <Field label="Symbol">
              <Select value={symbol} onValueChange={setSymbol}>
                <SelectTrigger className="h-9 w-[220px]">
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
              <Badge variant="outline" className="mt-1.5 w-fit border-0 bg-muted text-[10px] text-muted-foreground">
                {isOneSecondIndex(symbol) ? "1-second ticks" : "Standard ticks"}
              </Badge>
            </Field>

            <Field label="Window">
              <Select value={String(windowSize)} onValueChange={(v) => setWindowSize(Number(v))}>
                <SelectTrigger className="h-9 w-[120px]">
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
            </Field>

            <div className="ml-auto text-right">
              <div className="text-xs text-muted-foreground">Latest quote</div>
              <div className="font-mono text-lg font-semibold tabular-nums">
                {lastTick ? lastTick.quoteStr : "—"}
              </div>
            </div>
          </div>
        </header>

        <DerivAccountPanel account={account} />

        <section className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Price (last 150 ticks)</CardTitle>
            </CardHeader>
            <CardContent>
              <PriceChart ticks={ticks} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Overall signal</CardTitle>
            </CardHeader>
            <CardContent>
              <SignalCard signal={overall} />
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <Card>
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
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Recent last-digits</CardTitle>
            </CardHeader>
            <CardContent>
              <RecentDigits ticks={ticks} />
            </CardContent>
          </Card>
        </section>

        <Card>
          <CardContent className="p-3 sm:p-4">
            <Tabs defaultValue="insights">
              <TabsList className="flex w-full flex-wrap justify-start">
                <TabsTrigger value="insights">Insights</TabsTrigger>
                <TabsTrigger value="predictions">Predictions</TabsTrigger>
                <TabsTrigger value="scanner">Scanner</TabsTrigger>
                <TabsTrigger value="even-odd">Even/Odd</TabsTrigger>
                <TabsTrigger value="rise-fall">Rise/Fall</TabsTrigger>
                <TabsTrigger value="matches-differs">Matches/Differs</TabsTrigger>
                <TabsTrigger value="over-under">Over/Under</TabsTrigger>
              </TabsList>
              <TabsContent value="insights" className="mt-4">
                <div className="space-y-4">
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
              </TabsContent>
              <TabsContent value="predictions" className="mt-4">
                <PredictionPanel layer={prediction} />
              </TabsContent>
              <TabsContent value="scanner" className="mt-4">
                <SymbolScannerPanel
                  targetDigit={targetDigit}
                  barrier={barrier}
                  currentSymbol={symbol}
                  onSelectSymbol={setSymbol}
                />
              </TabsContent>
              <TabsContent value="even-odd" className="mt-4">
                <EvenOddPanel r={evenOddR} />
              </TabsContent>
              <TabsContent value="rise-fall" className="mt-4">
                <RiseFallPanel r={riseFallR} />
              </TabsContent>
              <TabsContent value="matches-differs" className="mt-4">
                <MatchesDiffersPanel r={matchesR} digit={targetDigit} onDigitChange={setTargetDigit} />
              </TabsContent>
              <TabsContent value="over-under" className="mt-4">
                <OverUnderPanel r={overUnderR} barrier={barrier} onBarrierChange={setBarrier} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <footer className="pt-4 text-center text-xs text-muted-foreground">
          Data: Deriv public WebSocket API · Analysis only · Not affiliated with Deriv.com
        </footer>
      </div>
    </main>
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
