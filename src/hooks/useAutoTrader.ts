import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useDerivTicks } from "@/hooks/useDerivTicks";
import type { useDerivAccount } from "@/hooks/useDerivAccount";
import { contractTypeFor } from "@/lib/deriv/trading";

export interface AutoTraderConfig {
  enabled: boolean;
  symbol: string;
  kind: "MATCHES" | "DIFFERS";
  digit: number;
  stake: number;
  threshold: number;   // 0..1, freq of digit over window
  window: number;      // ticks
  recoverAfter: 2 | 3; // martingale trigger
  takeProfit: number;  // absolute currency
  stopLoss: number;    // absolute currency (positive number)
}

export function useAutoTrader(cfg: AutoTraderConfig, account: ReturnType<typeof useDerivAccount>) {
  const { ticks } = useDerivTicks(cfg.enabled ? cfg.symbol : "");
  const [pnl, setPnl] = useState(0);
  const [wins, setWins] = useState(0);
  const [losses, setLosses] = useState(0);
  const [lossStreak, setLossStreak] = useState(0);
  const [lastMsg, setLastMsg] = useState<string>("");
  const inTradeRef = useRef(false);
  const stoppedRef = useRef(false);
  const pnlRef = useRef(0);
  const streakRef = useRef(0);
  const cfgRef = useRef(cfg);
  cfgRef.current = cfg;

  // Reset session when toggled on.
  useEffect(() => {
    if (cfg.enabled) {
      stoppedRef.current = false;
      pnlRef.current = 0;
      streakRef.current = 0;
      setPnl(0); setWins(0); setLosses(0); setLossStreak(0);
      setLastMsg("Auto-trader armed. Watching ticks…");
    } else {
      setLastMsg("");
    }
  }, [cfg.enabled, cfg.symbol, cfg.kind, cfg.digit]);

  const freq = useMemo(() => {
    if (ticks.length < cfg.window) return null;
    const slice = ticks.slice(-cfg.window);
    const hits = slice.filter((t) => t.lastDigit === cfg.digit).length;
    return hits / slice.length;
  }, [ticks, cfg.window, cfg.digit]);

  useEffect(() => {
    if (!cfg.enabled || stoppedRef.current) return;
    if (freq == null) return;
    if (inTradeRef.current) return;
    if (account.status !== "connected" || !account.trader.current || !account.active) return;

    const gate = cfg.kind === "MATCHES" ? freq >= cfg.threshold : freq <= (1 - cfg.threshold);
    if (!gate) return;

    const trader = account.trader.current;
    const acc = account.active;
    const currentStake = cfg.stake * Math.pow(2, streakRef.current >= cfg.recoverAfter ? streakRef.current : 0);
    inTradeRef.current = true;
    setLastMsg(`Signal: freq ${(freq * 100).toFixed(1)}% → buying ${cfg.kind} ${cfg.digit} @ ${currentStake.toFixed(2)}`);

    (async () => {
      let unsub: (() => void) | null = null;
      try {
        const p = await trader.proposal({
          contract_type: contractTypeFor(cfg.kind),
          symbol: cfg.symbol,
          amount: currentStake,
          currency: acc.currency,
          duration: account.settings.duration,
          duration_unit: account.settings.durationUnit,
          barrier: String(cfg.digit),
        });
        const buy = await trader.buy(p.id, p.ask_price);
        setLastMsg(`Bought #${buy.contract_id}, waiting for settlement…`);
        unsub = trader.subscribeContract(buy.contract_id, (c) => {
          if (c.is_sold === 1 || c.status === "sold" || c.status === "won" || c.status === "lost") {
            const profit = Number(c.profit ?? (c.sell_price ?? 0) - buy.buy_price);
            pnlRef.current += profit;
            setPnl(pnlRef.current);
            const won = profit > 0;
            if (won) { setWins((w) => w + 1); streakRef.current = 0; setLossStreak(0); }
            else { setLosses((l) => l + 1); streakRef.current += 1; setLossStreak(streakRef.current); }
            const tp = cfgRef.current.takeProfit;
            const sl = cfgRef.current.stopLoss;
            if (tp > 0 && pnlRef.current >= tp) {
              stoppedRef.current = true;
              toast.success(`Take-profit hit: +${pnlRef.current.toFixed(2)} ${acc.currency}`);
              setLastMsg(`Stopped: TP reached (+${pnlRef.current.toFixed(2)})`);
            } else if (sl > 0 && pnlRef.current <= -sl) {
              stoppedRef.current = true;
              toast.error(`Stop-loss hit: ${pnlRef.current.toFixed(2)} ${acc.currency}`);
              setLastMsg(`Stopped: SL reached (${pnlRef.current.toFixed(2)})`);
            } else {
              setLastMsg(`${won ? "WIN" : "LOSS"} ${profit.toFixed(2)} · P&L ${pnlRef.current.toFixed(2)}`);
            }
            unsub?.();
            inTradeRef.current = false;
          }
        });
      } catch (e) {
        inTradeRef.current = false;
        const msg = e instanceof Error ? e.message : String(e);
        setLastMsg(`Order failed: ${msg}`);
        toast.error("Auto-trade order failed", { description: msg });
      }
    })();
  }, [freq, cfg.enabled, cfg.kind, cfg.digit, cfg.symbol, cfg.stake, cfg.threshold, cfg.recoverAfter, account]);

  return { pnl, wins, losses, lossStreak, lastMsg, freq, stopped: stoppedRef.current };
}