import { useCallback, useEffect, useRef, useState } from "react";
import { DERIV_SYMBOLS } from "@/lib/deriv/symbols";
import type { Tick } from "@/lib/deriv/ws";
import { buildPredictionLayer, betaPosterior } from "@/lib/deriv/prediction";

const DERIV_WS_URL = "wss://ws.derivws.com/websockets/v3?app_id=1089";

export interface SymbolScan {
  code: string;
  name: string;
  sampleSize: number;
  bestContract: string;
  bestDirection: string;
  bestProb: number;
  bestEdge: number;
  ciLow: number;
  ciHigh: number;
  uncertainty: number;
  // Per-contract edges for the heatmap.
  edges: { contract: string; direction: string; prob: number; edge: number }[];
  // Matches/Differs pick for this symbol — best digit + probability.
  matchesDigit: number;
  matchesProb: number;
  matchesEdge: number;
  differsDigit: number;
  differsProb: number;
  differsEdge: number;
}

export type ScannerStatus = "idle" | "scanning" | "done" | "error";

function fetchHistory(symbol: string, count = 250): Promise<Tick[]> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return reject(new Error("no window"));
    const ws = new WebSocket(DERIV_WS_URL);
    const timer = setTimeout(() => {
      try {
        ws.close();
      } catch {
        // noop
      }
      reject(new Error("timeout"));
    }, 15000);
    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          ticks_history: symbol,
          adjust_start_time: 1,
          count,
          end: "latest",
          style: "ticks",
        }),
      );
    };
    ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data as string);
        if (data.error) {
          clearTimeout(timer);
          ws.close();
          return reject(new Error(data.error.message ?? "deriv error"));
        }
        if (data.msg_type === "history" && data.history) {
          const pipSize: number = data.pip_size ?? 2;
          const prices: string[] = data.history.prices;
          const times: number[] = data.history.times;
          const ticks: Tick[] = prices.map((p, i) => {
            const num = Number(p);
            const formatted = num.toFixed(pipSize);
            return {
              epoch: times[i],
              quote: num,
              quoteStr: formatted,
              lastDigit: Number(formatted[formatted.length - 1]),
              pipSize,
            };
          });
          clearTimeout(timer);
          ws.close();
          resolve(ticks);
        }
      } catch (e) {
        clearTimeout(timer);
        ws.close();
        reject(e as Error);
      }
    };
    ws.onerror = () => {
      clearTimeout(timer);
      reject(new Error("ws error"));
    };
  });
}

function scanTicks(
  code: string,
  name: string,
  ticks: Tick[],
  targetDigit: number,
  barrier: number,
): SymbolScan {
  const layer = buildPredictionLayer({ ticks, targetDigit, barrier });
  const edges = layer.predictions.map((p) => ({
    contract: p.contract,
    direction: p.direction,
    prob: p.combinedProb,
    edge: p.edge,
  }));
  const best = [...layer.predictions].sort((a, b) => b.edge - a.edge)[0];
  // Per-digit ranking for Matches/Differs.
  const colSums = Array.from({ length: 10 }, (_, d) =>
    layer.digitMarkov.counts.reduce((s, row) => s + row[d], 0),
  );
  const totalDigits = colSums.reduce((s, v) => s + v, 0);
  const ranking = colSums.map((c, d) => {
    const post = betaPosterior(c, totalDigits);
    const markov = layer.digitMarkov.nextDist[d];
    const combined = (post.mean + markov) / 2;
    return { digit: d, combined };
  });
  const hi = [...ranking].sort((a, b) => b.combined - a.combined)[0];
  const lo = [...ranking].sort((a, b) => a.combined - b.combined)[0];
  return {
    code,
    name,
    sampleSize: layer.sampleSize,
    bestContract: best.contract,
    bestDirection: best.direction,
    bestProb: best.combinedProb,
    bestEdge: best.edge,
    ciLow: best.combinedCI[0],
    ciHigh: best.combinedCI[1],
    uncertainty: best.uncertainty,
    edges,
    matchesDigit: hi.digit,
    matchesProb: hi.combined,
    matchesEdge: hi.combined - 0.1,
    differsDigit: lo.digit,
    differsProb: lo.combined,
    differsEdge: 0.1 - lo.combined,
  };
}

export function useSymbolScanner(targetDigit: number, barrier: number) {
  const [results, setResults] = useState<SymbolScan[]>([]);
  const [status, setStatus] = useState<ScannerStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [scannedAt, setScannedAt] = useState<number | null>(null);
  const runId = useRef(0);

  const scan = useCallback(async () => {
    const id = ++runId.current;
    setStatus("scanning");
    setProgress(0);
    setResults([]);
    const out: SymbolScan[] = [];
    let done = 0;
    await Promise.all(
      DERIV_SYMBOLS.map(async (s) => {
        try {
          const ticks = await fetchHistory(s.code, 250);
          if (id !== runId.current) return;
          out.push(scanTicks(s.code, s.name, ticks, targetDigit, barrier));
        } catch {
          // skip failed symbol
        } finally {
          done += 1;
          if (id === runId.current) setProgress(done / DERIV_SYMBOLS.length);
        }
      }),
    );
    if (id !== runId.current) return;
    out.sort((a, b) => b.bestEdge - a.bestEdge);
    setResults(out);
    setStatus(out.length ? "done" : "error");
    setScannedAt(Date.now());
  }, [targetDigit, barrier]);

  useEffect(() => {
    void scan();
    // intentionally empty deps — re-run only via the returned scan() callback
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { results, status, progress, scannedAt, scan };
}
