import type { Tick } from "./ws";

// ---------- Shared helpers ----------

function lastDigits(ticks: Tick[]): number[] {
  return ticks.map((t) => t.lastDigit);
}

function rises(ticks: Tick[]): number[] {
  // 1 = rise, 0 = fall, skip flats
  const out: number[] = [];
  for (let i = 1; i < ticks.length; i++) {
    const d = ticks[i].quote - ticks[i - 1].quote;
    if (d > 0) out.push(1);
    else if (d < 0) out.push(0);
  }
  return out;
}

// ---------- Markov chain ----------

export interface DigitMarkov {
  matrix: number[][]; // 10x10 row-stochastic
  counts: number[][]; // raw transition counts
  nextDist: number[]; // predicted distribution for next digit given current state
  currentState: number;
  samples: number;
}

export function buildDigitMarkov(ticks: Tick[]): DigitMarkov {
  const counts = Array.from({ length: 10 }, () => new Array(10).fill(0));
  const digits = lastDigits(ticks);
  for (let i = 1; i < digits.length; i++) {
    counts[digits[i - 1]][digits[i]]++;
  }
  // Laplace smoothing so unseen transitions still get tiny mass.
  const alpha = 0.5;
  const matrix = counts.map((row) => {
    const total = row.reduce((s, v) => s + v, 0) + alpha * 10;
    return row.map((v) => (v + alpha) / total);
  });
  const currentState = digits.length ? digits[digits.length - 1] : 0;
  const nextDist = matrix[currentState] ?? new Array(10).fill(0.1);
  return { matrix, counts, nextDist, currentState, samples: Math.max(0, digits.length - 1) };
}

export interface RiseFallMarkov {
  matrix: number[][]; // 2x2 — rows = [fall, rise]
  nextRiseProb: number;
  currentState: 0 | 1 | null;
  samples: number;
}

export function buildRiseFallMarkov(ticks: Tick[]): RiseFallMarkov {
  const seq = rises(ticks);
  const counts = [
    [0, 0],
    [0, 0],
  ];
  for (let i = 1; i < seq.length; i++) counts[seq[i - 1]][seq[i]]++;
  const alpha = 0.5;
  const matrix = counts.map((row) => {
    const total = row.reduce((s, v) => s + v, 0) + alpha * 2;
    return row.map((v) => (v + alpha) / total);
  });
  const currentState = seq.length ? (seq[seq.length - 1] as 0 | 1) : null;
  const nextRiseProb = currentState == null ? 0.5 : matrix[currentState][1];
  return { matrix, nextRiseProb, currentState, samples: Math.max(0, seq.length - 1) };
}

// ---------- Bayesian (Beta-Binomial) ----------

export interface BetaPosterior {
  alpha: number;
  beta: number;
  mean: number;
  ciLow: number; // 95% credible interval, Wilson-style normal approx
  ciHigh: number;
  uncertainty: number; // ciHigh - ciLow, width
}

/**
 * Beta(α, β) posterior with a weak uniform prior Beta(1, 1).
 * successes = events of interest, total = trials.
 */
export function betaPosterior(successes: number, total: number): BetaPosterior {
  const alpha = successes + 1;
  const beta = total - successes + 1;
  const mean = alpha / (alpha + beta);
  // Normal approximation to Beta for the CI — fast and good enough for n>=20.
  const variance = (alpha * beta) / ((alpha + beta) ** 2 * (alpha + beta + 1));
  const sd = Math.sqrt(variance);
  const z = 1.96;
  const ciLow = Math.max(0, mean - z * sd);
  const ciHigh = Math.min(1, mean + z * sd);
  return { alpha, beta, mean, ciLow, ciHigh, uncertainty: ciHigh - ciLow };
}

// ---------- Monte Carlo ----------

function sampleFromDist(dist: number[], rand: () => number): number {
  const r = rand();
  let acc = 0;
  for (let i = 0; i < dist.length; i++) {
    acc += dist[i];
    if (r < acc) return i;
  }
  return dist.length - 1;
}

// Mulberry32 PRNG for reproducible runs.
function mulberry32(seed: number) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface MonteCarloResult {
  runs: number;
  horizon: number;
  evenProb: ProbWithCI;
  oddProb: ProbWithCI;
  riseProb: ProbWithCI;
  fallProb: ProbWithCI;
  matchProb: ProbWithCI; // probability next tick matches selected digit
  overProb: ProbWithCI;
  underProb: ProbWithCI;
}

export interface ProbWithCI {
  p: number;
  ciLow: number;
  ciHigh: number;
  uncertainty: number;
}

function wilsonCI(successes: number, total: number): ProbWithCI {
  if (total === 0) return { p: 0, ciLow: 0, ciHigh: 1, uncertainty: 1 };
  const p = successes / total;
  const z = 1.96;
  const denom = 1 + (z * z) / total;
  const center = (p + (z * z) / (2 * total)) / denom;
  const margin = (z * Math.sqrt((p * (1 - p)) / total + (z * z) / (4 * total * total))) / denom;
  const ciLow = Math.max(0, center - margin);
  const ciHigh = Math.min(1, center + margin);
  return { p, ciLow, ciHigh, uncertainty: ciHigh - ciLow };
}

export interface MonteCarloOptions {
  ticks: Tick[];
  digitMarkov: DigitMarkov;
  riseFallMarkov: RiseFallMarkov;
  targetDigit: number;
  barrier: number;
  runs?: number;
  horizon?: number;
  seed?: number;
}

export function monteCarlo(opts: MonteCarloOptions): MonteCarloResult {
  const runs = opts.runs ?? 2000;
  const horizon = opts.horizon ?? 1;
  const rand = mulberry32(opts.seed ?? 0xc0ffee);

  let even = 0;
  let rise = 0;
  let match = 0;
  let over = 0;
  let under = 0;
  let total = 0;

  for (let r = 0; r < runs; r++) {
    let state = opts.digitMarkov.currentState;
    let rfState = opts.riseFallMarkov.currentState;
    for (let h = 0; h < horizon; h++) {
      const nextDigit = sampleFromDist(opts.digitMarkov.matrix[state], rand);
      state = nextDigit;
      // Rise/fall path independent of digit chain.
      const pRise =
        rfState == null ? 0.5 : opts.riseFallMarkov.matrix[rfState][1];
      const isRise = rand() < pRise;
      rfState = isRise ? 1 : 0;

      if (h === horizon - 1) {
        if (nextDigit % 2 === 0) even++;
        if (isRise) rise++;
        if (nextDigit === opts.targetDigit) match++;
        if (nextDigit > opts.barrier) over++;
        else if (nextDigit < opts.barrier) under++;
        total++;
      }
    }
  }

  const evenCI = wilsonCI(even, total);
  const riseCI = wilsonCI(rise, total);
  return {
    runs,
    horizon,
    evenProb: evenCI,
    oddProb: { p: 1 - evenCI.p, ciLow: 1 - evenCI.ciHigh, ciHigh: 1 - evenCI.ciLow, uncertainty: evenCI.uncertainty },
    riseProb: riseCI,
    fallProb: { p: 1 - riseCI.p, ciLow: 1 - riseCI.ciHigh, ciHigh: 1 - riseCI.ciLow, uncertainty: riseCI.uncertainty },
    matchProb: wilsonCI(match, total),
    overProb: wilsonCI(over, total),
    underProb: wilsonCI(under, total),
  };
}

// ---------- Combined prediction layer ----------

export interface Prediction {
  label: string;
  contract: "Even/Odd" | "Rise/Fall" | "Matches/Differs" | "Over/Under";
  direction: string;
  // Posterior mean (Bayesian) — primary estimate.
  bayes: BetaPosterior;
  // Markov-based one-step probability for the bullish side of the contract.
  markovProb: number;
  // Monte Carlo probability + CI.
  monteCarlo: ProbWithCI;
  // Combined probability (average of three sources).
  combinedProb: number;
  combinedCI: [number, number];
  uncertainty: number;
  // Verdict relative to 50% (or 10% baseline for Matches).
  edge: number; // positive = bullish for `direction`
}

export interface PredictionInputs {
  ticks: Tick[];
  targetDigit: number;
  barrier: number;
  runs?: number;
  horizon?: number;
}

export interface PredictionLayer {
  digitMarkov: DigitMarkov;
  riseFallMarkov: RiseFallMarkov;
  monteCarlo: MonteCarloResult;
  predictions: Prediction[];
  sampleSize: number;
}

function combine(bayesMean: number, markovProb: number, mcCI: ProbWithCI): {
  combinedProb: number;
  combinedCI: [number, number];
  uncertainty: number;
} {
  const combinedProb = (bayesMean + markovProb + mcCI.p) / 3;
  // Combined CI = intersection of Bayes-derived band and MC band (use MC band — it already accounts for sample size).
  const combinedCI: [number, number] = [mcCI.ciLow, mcCI.ciHigh];
  return { combinedProb, combinedCI, uncertainty: mcCI.uncertainty };
}

export function buildPredictionLayer(inputs: PredictionInputs): PredictionLayer {
  const { ticks, targetDigit, barrier } = inputs;
  const digitMarkov = buildDigitMarkov(ticks);
  const riseFallMarkov = buildRiseFallMarkov(ticks);
  const monteCarloResult = monteCarlo({
    ticks,
    digitMarkov,
    riseFallMarkov,
    targetDigit,
    barrier,
    runs: inputs.runs ?? 2000,
    horizon: inputs.horizon ?? 1,
  });

  // ---- Even/Odd ----
  const digits = lastDigits(ticks);
  const evenCount = digits.filter((d) => d % 2 === 0).length;
  const bayesEven = betaPosterior(evenCount, digits.length);
  const markovEven = digitMarkov.nextDist.reduce(
    (s, p, d) => (d % 2 === 0 ? s + p : s),
    0,
  );
  const evenCombined = combine(bayesEven.mean, markovEven, monteCarloResult.evenProb);
  const evenPrediction: Prediction = {
    label: "Next tick Even vs Odd",
    contract: "Even/Odd",
    direction: evenCombined.combinedProb >= 0.5 ? "EVEN" : "ODD",
    bayes: bayesEven,
    markovProb: markovEven,
    monteCarlo: monteCarloResult.evenProb,
    combinedProb: evenCombined.combinedProb >= 0.5 ? evenCombined.combinedProb : 1 - evenCombined.combinedProb,
    combinedCI:
      evenCombined.combinedProb >= 0.5
        ? evenCombined.combinedCI
        : [1 - evenCombined.combinedCI[1], 1 - evenCombined.combinedCI[0]],
    uncertainty: evenCombined.uncertainty,
    edge: Math.abs(evenCombined.combinedProb - 0.5),
  };

  // ---- Rise/Fall ----
  const riseSeq = rises(ticks);
  const riseCount = riseSeq.filter((v) => v === 1).length;
  const bayesRise = betaPosterior(riseCount, riseSeq.length);
  const markovRise = riseFallMarkov.nextRiseProb;
  const riseCombined = combine(bayesRise.mean, markovRise, monteCarloResult.riseProb);
  const risePrediction: Prediction = {
    label: "Next tick Rise vs Fall",
    contract: "Rise/Fall",
    direction: riseCombined.combinedProb >= 0.5 ? "RISE" : "FALL",
    bayes: bayesRise,
    markovProb: markovRise,
    monteCarlo: monteCarloResult.riseProb,
    combinedProb: riseCombined.combinedProb >= 0.5 ? riseCombined.combinedProb : 1 - riseCombined.combinedProb,
    combinedCI:
      riseCombined.combinedProb >= 0.5
        ? riseCombined.combinedCI
        : [1 - riseCombined.combinedCI[1], 1 - riseCombined.combinedCI[0]],
    uncertainty: riseCombined.uncertainty,
    edge: Math.abs(riseCombined.combinedProb - 0.5),
  };

  // ---- Matches/Differs (baseline 0.1) ----
  const matchCount = digits.filter((d) => d === targetDigit).length;
  const bayesMatch = betaPosterior(matchCount, digits.length);
  const markovMatch = digitMarkov.nextDist[targetDigit] ?? 0.1;
  const mcMatch = monteCarloResult.matchProb;
  const matchCombinedProb = (bayesMatch.mean + markovMatch + mcMatch.p) / 3;
  const matchPrediction: Prediction = {
    label: `Next tick last-digit = ${targetDigit}`,
    contract: "Matches/Differs",
    direction: matchCombinedProb >= 0.1 ? "MATCHES" : "DIFFERS",
    bayes: bayesMatch,
    markovProb: markovMatch,
    monteCarlo: mcMatch,
    combinedProb: matchCombinedProb >= 0.1 ? matchCombinedProb : 1 - matchCombinedProb,
    combinedCI: matchCombinedProb >= 0.1 ? [mcMatch.ciLow, mcMatch.ciHigh] : [1 - mcMatch.ciHigh, 1 - mcMatch.ciLow],
    uncertainty: mcMatch.uncertainty,
    edge: Math.abs(matchCombinedProb - 0.1),
  };

  // ---- Over/Under ----
  const overCount = digits.filter((d) => d > barrier).length;
  const underCount = digits.filter((d) => d < barrier).length;
  const bayesOver = betaPosterior(overCount, overCount + underCount);
  const markovOver = digitMarkov.nextDist.reduce((s, p, d) => (d > barrier ? s + p : s), 0);
  const markovUnder = digitMarkov.nextDist.reduce((s, p, d) => (d < barrier ? s + p : s), 0);
  const markovOverNorm = markovOver + markovUnder > 0 ? markovOver / (markovOver + markovUnder) : 0.5;
  const mcOverNorm =
    monteCarloResult.overProb.p + monteCarloResult.underProb.p > 0
      ? monteCarloResult.overProb.p / (monteCarloResult.overProb.p + monteCarloResult.underProb.p)
      : 0.5;
  const ouCombined = combine(bayesOver.mean, markovOverNorm, {
    p: mcOverNorm,
    ciLow: monteCarloResult.overProb.ciLow,
    ciHigh: monteCarloResult.overProb.ciHigh,
    uncertainty: monteCarloResult.overProb.uncertainty,
  });
  const ouPrediction: Prediction = {
    label: `Next tick vs barrier ${barrier}`,
    contract: "Over/Under",
    direction: ouCombined.combinedProb >= 0.5 ? "OVER" : "UNDER",
    bayes: bayesOver,
    markovProb: markovOverNorm,
    monteCarlo: monteCarloResult.overProb,
    combinedProb: ouCombined.combinedProb >= 0.5 ? ouCombined.combinedProb : 1 - ouCombined.combinedProb,
    combinedCI:
      ouCombined.combinedProb >= 0.5
        ? ouCombined.combinedCI
        : [1 - ouCombined.combinedCI[1], 1 - ouCombined.combinedCI[0]],
    uncertainty: ouCombined.uncertainty,
    edge: Math.abs(ouCombined.combinedProb - 0.5),
  };

  return {
    digitMarkov,
    riseFallMarkov,
    monteCarlo: monteCarloResult,
    predictions: [evenPrediction, risePrediction, matchPrediction, ouPrediction],
    sampleSize: ticks.length,
  };
}