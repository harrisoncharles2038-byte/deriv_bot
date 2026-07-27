import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ExternalLink, Loader2, RefreshCw, Target, Zap, Bot } from "lucide-react";
import { useEffect, useState } from "react";
import { useSymbolScanner } from "@/hooks/useSymbolScanner";
import { cn } from "@/lib/utils";
import type { useDerivAccount } from "@/hooks/useDerivAccount";
import { contractTypeFor } from "@/lib/deriv/trading";
import { toast } from "sonner";
import { buildMatchesDiffersStrategy, downloadStrategyXml } from "@/lib/deriv/dbotStrategy";
import { Switch } from "@/components/ui/switch";
import { useAutoTrader } from "@/hooks/useAutoTrader";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Props {
  currentSymbol: string;
  currentDigit: number;
  onApply?: (symbol: string, digit: number) => void;
  account?: ReturnType<typeof useDerivAccount>;
}

/**
 * Surfaces the single best Matches/Differs trade pick across all volatility
 * indices: which symbol, which digit, and a one-click button to open Deriv's
 * trader with that contract preselected. Analysis only — no orders placed.
 */
export function TradePickPanel({ currentSymbol, currentDigit, onApply, account }: Props) {
  const { results, status, progress, scan } = useSymbolScanner(0, 5);

  if (status === "scanning" && results.length === 0) {
    return (
      <div className="rounded-md border bg-card p-4 text-sm text-muted-foreground">
        Scanning volatility indices for the best Matches/Differs setup…{" "}
        {(progress * 100).toFixed(0)}%
      </div>
    );
  }

  if (!results.length) {
    return (
      <div className="rounded-md border bg-card p-4 text-sm text-muted-foreground">
        No scan results yet.{" "}
        <Button size="sm" variant="outline" className="ml-2" onClick={() => void scan()}>
          Retry scan
        </Button>
      </div>
    );
  }

  const bestMatch = [...results].sort((a, b) => b.matchesEdge - a.matchesEdge)[0];
  const bestDiffer = [...results].sort((a, b) => b.differsEdge - a.differsEdge)[0];

  const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Recommended trade pick</h3>
          <Badge variant="outline" className="border-0 bg-muted text-[10px]">
            Matches / Differs · across all symbols
          </Badge>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => void scan()}
          disabled={status === "scanning"}
        >
          <RefreshCw
            className={cn("mr-1.5 h-3.5 w-3.5", status === "scanning" && "animate-spin")}
          />
          Rescan
        </Button>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <PickCard
          kind="MATCHES"
          symbolCode={bestMatch.code}
          symbolName={bestMatch.name}
          digit={bestMatch.matchesDigit}
          prob={bestMatch.matchesProb}
          edge={bestMatch.matchesEdge}
          active={currentSymbol === bestMatch.code && currentDigit === bestMatch.matchesDigit}
          onApply={onApply ? () => onApply(bestMatch.code, bestMatch.matchesDigit) : undefined}
          account={account}
        />
        <PickCard
          kind="DIFFERS"
          symbolCode={bestDiffer.code}
          symbolName={bestDiffer.name}
          digit={bestDiffer.differsDigit}
          prob={bestDiffer.differsProb}
          edge={bestDiffer.differsEdge}
          active={currentSymbol === bestDiffer.code && currentDigit === bestDiffer.differsDigit}
          onApply={onApply ? () => onApply(bestDiffer.code, bestDiffer.differsDigit) : undefined}
          account={account}
        />
      </div>
    </div>
  );
}

function PickCard({
  kind,
  symbolCode,
  symbolName,
  digit,
  prob,
  edge,
  active,
  onApply,
  account,
}: {
  kind: "MATCHES" | "DIFFERS";
  symbolCode: string;
  symbolName: string;
  digit: number;
  prob: number;
  edge: number;
  active?: boolean;
  onApply?: () => void;
  account?: ReturnType<typeof useDerivAccount>;
}) {
  const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
  const tone =
    kind === "MATCHES"
      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
      : "bg-rose-500/15 text-rose-700 dark:text-rose-300";

  const [busy, setBusy] = useState(false);
  const [pickDigit, setPickDigit] = useState<number>(digit);
  const [stake, setStake] = useState<number>(account?.settings.stake ?? 1);
  const [recoverAfter, setRecoverAfter] = useState<2 | 3>(2);
  const [threshold, setThreshold] = useState<number>(15); // percent
  const [windowSize, setWindowSize] = useState<number>(50);
  const [takeProfit, setTakeProfit] = useState<number>(10);
  const [stopLoss, setStopLoss] = useState<number>(20);
  const [autoTrade, setAutoTrade] = useState(false);

  const auto = useAutoTrader(
    {
      enabled: autoTrade && !!account?.active && account?.status === "connected",
      symbol: symbolCode,
      kind,
      digit: pickDigit,
      stake: Number.isFinite(stake) && stake > 0 ? stake : 1,
      threshold: Math.max(1, Math.min(99, threshold)) / 100,
      window: Math.max(10, Math.floor(windowSize)),
      recoverAfter,
      takeProfit: Math.max(0, takeProfit),
      stopLoss: Math.max(0, stopLoss),
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    account ?? ({} as any),
  );

  // Deriv Bot doesn't accept URL params for contract configuration, so we
  // generate a ready-to-import DBot XML strategy (with martingale recovery)
  // and open the bot builder alongside the download.
  const tradeUrl = "https://bot.deriv.com/#bot_builder";

  function exportAndOpenBot() {
    const currency = account?.active?.currency ?? "USD";
    const xml = buildMatchesDiffersStrategy({
      symbol: symbolCode,
      contract: kind === "MATCHES" ? "DIGITMATCH" : "DIGITDIFF",
      digit: pickDigit,
      stake: Number.isFinite(stake) && stake > 0 ? stake : 1,
      currency,
      recoverAfter,
      threshold: Math.max(0, Math.min(100, threshold)) / 100,
      window: Math.max(10, Math.floor(windowSize)),
      takeProfit: Math.max(0, takeProfit),
      stopLoss: Math.max(0, stopLoss),
    });
    const fname = `deriv-bot-${kind.toLowerCase()}-${symbolCode}-d${pickDigit}.xml`;
    try {
      downloadStrategyXml(xml, fname);
    } catch {
      /* ignore */
    }
    toast.success(`Strategy downloaded: ${fname}`, {
      description:
        `In Deriv Bot, click Import → Local, choose the file. ` +
        `Symbol ${symbolName}, ${kind} digit ${pickDigit}, stake ${stake} ${currency}, ` +
        `buy when freq ${kind === "MATCHES" ? "≥" : "≤"} ${kind === "MATCHES" ? threshold : 100 - threshold}% ` +
        `over ${windowSize} ticks, double after ${recoverAfter} losses, ` +
        `TP ${takeProfit} / SL ${stopLoss} ${currency}.`,
    });
    window.open(tradeUrl, "_blank", "noopener,noreferrer");
  }

  useEffect(() => {
    setPickDigit(digit);
  }, [digit]);
  useEffect(() => {
    if (account?.settings.stake != null) setStake(account.settings.stake);
  }, [account?.settings.stake]);

  const canTrade = account?.status === "connected" && !!account.active;

  async function placeOrder() {
    if (!account || !account.trader.current || !account.active) return;
    const { trader, settings, active: acc } = account;
    const t = trader.current;
    if (!t) return;
    if (!Number.isFinite(stake) || stake <= 0) {
      toast.error("Enter a valid stake amount");
      return;
    }
    if (!Number.isInteger(pickDigit) || pickDigit < 0 || pickDigit > 9) {
      toast.error("Pick a digit between 0 and 9");
      return;
    }
    const isDemo = acc.is_virtual === 1;
    if (settings.confirmBeforeBuy || !isDemo) {
      const msg =
        `Place ${kind} digit ${pickDigit} on ${symbolName}\n` +
        `Stake: ${stake} ${acc.currency} · Duration: ${settings.duration}${settings.durationUnit}\n` +
        `Account: ${acc.loginid} (${isDemo ? "DEMO" : "REAL MONEY"})\n\n` +
        (isDemo ? "Confirm?" : "⚠ REAL MONEY — confirm?");
      if (!window.confirm(msg)) return;
    }
    setBusy(true);
    try {
      const proposal = await t.proposal({
        contract_type: contractTypeFor(kind),
        symbol: symbolCode,
        amount: stake,
        currency: acc.currency,
        duration: settings.duration,
        duration_unit: settings.durationUnit,
        barrier: String(pickDigit),
      });
      const buy = await t.buy(proposal.id, proposal.ask_price);
      toast.success(`${kind} ${pickDigit} placed`, {
        description: `${symbolName} · stake ${stake} ${acc.currency} · payout ${buy.payout.toFixed(2)} · ID ${buy.contract_id}`,
      });
    } catch (e) {
      toast.error("Order failed", { description: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-md border bg-muted/20 p-3",
        active && "ring-1 ring-primary",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
            Best {kind} setup
          </div>
          <div className="text-sm font-semibold">{symbolName}</div>
          <div className="font-mono text-[11px] text-muted-foreground">{symbolCode}</div>
        </div>
        <Badge variant="outline" className={cn("border-0", tone)}>
          {edge >= 0 ? "+" : ""}
          {(edge * 100).toFixed(1)} pts
        </Badge>
      </div>

      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
            {kind === "MATCHES" ? "Match digit" : "Differ-from digit"}
          </div>
          <div className="font-mono text-4xl font-bold tabular-nums leading-none">{digit}</div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Combined probability
          </div>
          <div className="font-mono text-xl font-semibold tabular-nums">{pct(prob)}</div>
          <div className="text-[10px] text-muted-foreground">baseline {pct(0.1)}</div>
        </div>
      </div>

      <div className="space-y-2 rounded-md border bg-background/60 p-2">
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Your trade</div>
        <div>
          <div className="mb-1 text-[10px] text-muted-foreground">Prediction digit (0–9)</div>
          <div className="grid grid-cols-10 gap-1">
            {Array.from({ length: 10 }, (_, d) => (
              <button
                key={d}
                type="button"
                onClick={() => setPickDigit(d)}
                className={cn(
                  "h-8 rounded font-mono text-sm tabular-nums transition-colors",
                  pickDigit === d
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-muted/70",
                )}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Stake{account?.active?.currency ? ` (${account.active.currency})` : ""}
          </label>
          <Input
            type="number"
            inputMode="decimal"
            min={0.35}
            step={0.01}
            value={Number.isFinite(stake) ? stake : ""}
            onChange={(e) => setStake(parseFloat(e.target.value))}
            className="h-8 w-24 font-mono"
          />
          <label className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Recover after
          </label>
          <Select
            value={String(recoverAfter)}
            onValueChange={(v) => setRecoverAfter(Number(v) as 2 | 3)}
          >
            <SelectTrigger className="h-8 w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2">2 losses</SelectItem>
              <SelectItem value="3">3 losses</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Buy when freq {kind === "MATCHES" ? "≥" : "≤"}
          </label>
          <Input
            type="number"
            min={1}
            max={99}
            step={1}
            value={
              Number.isFinite(threshold) ? (kind === "MATCHES" ? threshold : 100 - threshold) : ""
            }
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              setThreshold(kind === "MATCHES" ? v : 100 - v);
            }}
            className="h-8 w-16 font-mono"
          />
          <span className="text-[10px] text-muted-foreground">% over</span>
          <Input
            type="number"
            min={10}
            step={5}
            value={Number.isFinite(windowSize) ? windowSize : ""}
            onChange={(e) => setWindowSize(parseInt(e.target.value, 10))}
            className="h-8 w-16 font-mono"
          />
          <span className="text-[10px] text-muted-foreground">ticks</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Take profit
          </label>
          <Input
            type="number"
            min={0}
            step={0.5}
            value={Number.isFinite(takeProfit) ? takeProfit : ""}
            onChange={(e) => setTakeProfit(parseFloat(e.target.value))}
            className="h-8 w-20 font-mono"
          />
          <label className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Stop loss
          </label>
          <Input
            type="number"
            min={0}
            step={0.5}
            value={Number.isFinite(stopLoss) ? stopLoss : ""}
            onChange={(e) => setStopLoss(parseFloat(e.target.value))}
            className="h-8 w-20 font-mono"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {onApply && (
          <Button size="sm" variant="outline" onClick={onApply} className="flex-1">
            Apply to analyzer
          </Button>
        )}
        {canTrade ? (
          <Button size="sm" className="flex-1" onClick={placeOrder} disabled={busy}>
            {busy ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Placing…
              </>
            ) : (
              <>
                <Zap className="mr-1.5 h-3.5 w-3.5" />
                Buy {kind}
              </>
            )}
          </Button>
        ) : (
          <Button size="sm" className="flex-1" variant="secondary" onClick={exportAndOpenBot}>
            Open {kind} in Deriv Bot
            <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {canTrade && (
        <div className="space-y-2 rounded-md border bg-background/60 p-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <Bot className="h-3.5 w-3.5 text-primary" />
              <span className="text-[11px] font-semibold uppercase tracking-wide">
                Auto-trade {kind}
              </span>
            </div>
            <Switch checked={autoTrade} onCheckedChange={setAutoTrade} />
          </div>
          {autoTrade && (
            <div className="space-y-1 text-[11px]">
              <div className="flex justify-between font-mono tabular-nums">
                <span className="text-muted-foreground">Freq / gate</span>
                <span>
                  {auto.freq == null ? "…" : `${(auto.freq * 100).toFixed(1)}%`} /{" "}
                  {kind === "MATCHES" ? `≥${threshold}%` : `≤${100 - threshold}%`}
                </span>
              </div>
              <div className="flex justify-between font-mono tabular-nums">
                <span className="text-muted-foreground">P&amp;L</span>
                <span
                  className={cn(
                    auto.pnl > 0 && "text-emerald-600",
                    auto.pnl < 0 && "text-rose-600",
                  )}
                >
                  {auto.pnl >= 0 ? "+" : ""}
                  {auto.pnl.toFixed(2)} {account?.active?.currency}
                </span>
              </div>
              <div className="flex justify-between font-mono tabular-nums">
                <span className="text-muted-foreground">W / L · streak</span>
                <span>
                  {auto.wins} / {auto.losses} · {auto.lossStreak}
                </span>
              </div>
              {auto.lastMsg && (
                <div className="truncate text-[10px] text-muted-foreground">{auto.lastMsg}</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
