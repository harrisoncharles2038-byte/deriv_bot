import type { Tick } from "./ws";

export function takeWindow(ticks: Tick[], n: number): Tick[] {
  return ticks.length <= n ? ticks : ticks.slice(ticks.length - n);
}

export interface EvenOddResult {
  even: number;
  odd: number;
  total: number;
  evenPct: number;
  oddPct: number;
  streak: { kind: "even" | "odd" | "none"; length: number };
  signal: "BUY EVEN" | "BUY ODD" | "NO TRADE";
  confidence: number;
}

export function evenOdd(ticks: Tick[]): EvenOddResult {
  const total = ticks.length;
  if (total === 0) {
    return {
      even: 0,
      odd: 0,
      total,
      evenPct: 0,
      oddPct: 0,
      streak: { kind: "none", length: 0 },
      signal: "NO TRADE",
      confidence: 0,
    };
  }
  let even = 0;
  for (const t of ticks) if (t.lastDigit % 2 === 0) even++;
  const odd = total - even;
  const evenPct = (even / total) * 100;
  const oddPct = (odd / total) * 100;

  // current streak
  const lastKind: "even" | "odd" = ticks[ticks.length - 1].lastDigit % 2 === 0 ? "even" : "odd";
  let streakLen = 0;
  for (let i = ticks.length - 1; i >= 0; i--) {
    const k = ticks[i].lastDigit % 2 === 0 ? "even" : "odd";
    if (k === lastKind) streakLen++;
    else break;
  }

  const dominance = Math.abs(evenPct - oddPct); // 0..100
  const confidence = Math.min(100, Math.round(dominance * 1.5));
  let signal: EvenOddResult["signal"] = "NO TRADE";
  if (confidence >= 35) signal = evenPct > oddPct ? "BUY EVEN" : "BUY ODD";

  return {
    even,
    odd,
    total,
    evenPct,
    oddPct,
    streak: { kind: lastKind, length: streakLen },
    signal,
    confidence,
  };
}

export function sma(ticks: Tick[], period: number): number | null {
  if (ticks.length < period) return null;
  const slice = ticks.slice(ticks.length - period);
  return slice.reduce((s, t) => s + t.quote, 0) / period;
}

export interface RiseFallResult {
  rises: number;
  falls: number;
  total: number;
  risePct: number;
  fallPct: number;
  consecutive: { kind: "rise" | "fall" | "flat"; length: number };
  sma5: number | null;
  sma10: number | null;
  sma20: number | null;
  direction: "UP" | "DOWN" | "SIDEWAYS";
  confidence: number;
}

export function riseFall(ticks: Tick[]): RiseFallResult {
  const total = ticks.length;
  let rises = 0;
  let falls = 0;
  for (let i = 1; i < ticks.length; i++) {
    if (ticks[i].quote > ticks[i - 1].quote) rises++;
    else if (ticks[i].quote < ticks[i - 1].quote) falls++;
  }
  const moves = rises + falls || 1;
  const risePct = (rises / moves) * 100;
  const fallPct = (falls / moves) * 100;

  // consecutive run
  let consKind: "rise" | "fall" | "flat" = "flat";
  let consLen = 0;
  for (let i = ticks.length - 1; i > 0; i--) {
    const diff = ticks[i].quote - ticks[i - 1].quote;
    const kind: "rise" | "fall" | "flat" = diff > 0 ? "rise" : diff < 0 ? "fall" : "flat";
    if (consLen === 0) {
      consKind = kind;
      if (kind !== "flat") consLen = 1;
      else break;
    } else if (kind === consKind) {
      consLen++;
    } else {
      break;
    }
  }

  const sma5 = sma(ticks, 5);
  const sma10 = sma(ticks, 10);
  const sma20 = sma(ticks, 20);

  let direction: RiseFallResult["direction"] = "SIDEWAYS";
  if (sma5 != null && sma20 != null) {
    const diffPct = ((sma5 - sma20) / sma20) * 100;
    if (diffPct > 0.02) direction = "UP";
    else if (diffPct < -0.02) direction = "DOWN";
  }

  const dominance = Math.abs(risePct - fallPct);
  const confidence = Math.min(100, Math.round(dominance * 1.5));

  return {
    rises,
    falls,
    total,
    risePct,
    fallPct,
    consecutive: { kind: consKind, length: consLen },
    sma5,
    sma10,
    sma20,
    direction,
    confidence,
  };
}

export function digitFrequency(ticks: Tick[]): number[] {
  const freq = new Array(10).fill(0);
  for (const t of ticks) freq[t.lastDigit]++;
  return freq;
}

export interface MatchesDiffersResult {
  digit: number;
  matches: number;
  differs: number;
  total: number;
  matchPct: number;
  differPct: number;
  hottest: { digit: number; count: number };
  coldest: { digit: number; count: number };
  signal: "BUY MATCHES" | "BUY DIFFERS" | "NO TRADE";
  confidence: number;
}

export function matchesDiffers(ticks: Tick[], digit: number): MatchesDiffersResult {
  const total = ticks.length;
  const freq = digitFrequency(ticks);
  const matches = freq[digit] ?? 0;
  const differs = total - matches;
  const matchPct = total ? (matches / total) * 100 : 0;
  const differPct = total ? (differs / total) * 100 : 0;
  let hottest = { digit: 0, count: -Infinity };
  let coldest = { digit: 0, count: Infinity };
  for (let d = 0; d < 10; d++) {
    if (freq[d] > hottest.count) hottest = { digit: d, count: freq[d] };
    if (freq[d] < coldest.count) coldest = { digit: d, count: freq[d] };
  }
  // Base rate for a single digit is 10%. Deviation from 10% drives signal.
  const dev = matchPct - 10;
  const confidence = Math.min(100, Math.round(Math.abs(dev) * 4));
  let signal: MatchesDiffersResult["signal"] = "NO TRADE";
  if (confidence >= 40) signal = dev > 0 ? "BUY MATCHES" : "BUY DIFFERS";
  return {
    digit,
    matches,
    differs,
    total,
    matchPct,
    differPct,
    hottest,
    coldest,
    signal,
    confidence,
  };
}

export interface OverUnderResult {
  barrier: number;
  over: number;
  under: number;
  equal: number;
  total: number;
  overPct: number;
  underPct: number;
  signal: "BUY OVER" | "BUY UNDER" | "NO TRADE";
  confidence: number;
}

export function overUnder(ticks: Tick[], barrier: number): OverUnderResult {
  let over = 0;
  let under = 0;
  let equal = 0;
  for (const t of ticks) {
    if (t.lastDigit > barrier) over++;
    else if (t.lastDigit < barrier) under++;
    else equal++;
  }
  const total = ticks.length;
  const overPct = total ? (over / total) * 100 : 0;
  const underPct = total ? (under / total) * 100 : 0;
  const dominance = Math.abs(overPct - underPct);
  const confidence = Math.min(100, Math.round(dominance * 1.5));
  let signal: OverUnderResult["signal"] = "NO TRADE";
  if (confidence >= 35) signal = overPct > underPct ? "BUY OVER" : "BUY UNDER";
  return { barrier, over, under, equal, total, overPct, underPct, signal, confidence };
}

export interface OverallSignal {
  score: number;
  risk: "LOW" | "MEDIUM" | "HIGH";
  action: "ENTER" | "WAIT" | "AVOID";
  best: { kind: string; signal: string; confidence: number } | null;
}

export function overallSignal(parts: {
  evenOdd: EvenOddResult;
  riseFall: RiseFallResult;
  matchesDiffers: MatchesDiffersResult;
  overUnder: OverUnderResult;
}): OverallSignal {
  const candidates = [
    { kind: "Even/Odd", signal: parts.evenOdd.signal, confidence: parts.evenOdd.confidence },
    {
      kind: "Rise/Fall",
      signal: parts.riseFall.direction === "UP" ? "BUY RISE" : parts.riseFall.direction === "DOWN" ? "BUY FALL" : "NO TRADE",
      confidence: parts.riseFall.confidence,
    },
    {
      kind: "Matches/Differs",
      signal: parts.matchesDiffers.signal,
      confidence: parts.matchesDiffers.confidence,
    },
    { kind: "Over/Under", signal: parts.overUnder.signal, confidence: parts.overUnder.confidence },
  ].filter((c) => c.signal !== "NO TRADE");

  const best = candidates.sort((a, b) => b.confidence - a.confidence)[0] ?? null;
  const score = best?.confidence ?? 0;
  const risk: OverallSignal["risk"] = score >= 70 ? "LOW" : score >= 45 ? "MEDIUM" : "HIGH";
  const action: OverallSignal["action"] = score >= 65 ? "ENTER" : score >= 40 ? "WAIT" : "AVOID";
  return { score, risk, action, best };
}