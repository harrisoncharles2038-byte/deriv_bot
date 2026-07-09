
## Goal

Build a single-page web app that connects to Deriv's public WebSocket, streams ticks for a chosen synthetic index, and renders real-time statistical analysis plus signals for Even/Odd, Rise/Fall, Matches/Differs, and Over/Under. Analysis-only — no order placement. Clear "probabilistic, not financial advice" disclaimer throughout.

## Scope (core analyzer)

In:
- Live tick stream via Deriv WS (`wss://ws.derivws.com/websockets/v3?app_id=1089`, public — no token required for ticks)
- Symbol picker: R_10, R_25, R_50, R_75, R_100, 1HZ10V, 1HZ25V, 1HZ50V, 1HZ75V, 1HZ100V
- Tick buffer with windows: 10 / 25 / 50 / 100 / 500
- Even/Odd: counts, %, current streak, signal
- Rise/Fall: consecutive up/down, SMA(5/10/20), trend tag (UP/DOWN/SIDEWAYS), confidence
- Matches/Differs: last-digit frequency (0–9), most/least frequent digit, match/differ % vs selected digit
- Over/Under: distribution vs selected barrier (0–9), over/under %
- Signal dashboard: per-contract signal + overall confidence 0–100, risk level Low/Med/High
- Visualizations: live price line chart, digit-frequency histogram, recent-digits strip
- Optional Deriv API token input (stored client-side only for now, no trading wired up yet — placeholder for later)

Out (deferred to follow-ups, called out in UI as "coming soon"):
- Markov / Bayesian / Monte Carlo / entropy / ML prediction layer
- Risk management module (stake sizing, drawdown)
- AI natural-language commentary
- Trade placement

## Tech approach

- TanStack Start, existing stack. No backend needed for core — Deriv WS is called directly from the browser.
- New route: `src/routes/index.tsx` becomes the analyzer (replace placeholder). SEO head updated.
- `src/lib/deriv/ws.ts` — thin WebSocket client (connect, subscribe ticks, unsubscribe, auto-reconnect with backoff).
- `src/hooks/useDerivTicks.ts` — React hook returning `{ ticks, status, switchSymbol }`, keeps a rolling buffer (max 500).
- `src/lib/deriv/analysis.ts` — pure functions:
  - `evenOdd(ticks, window)`
  - `riseFall(ticks, window)` with SMA helpers
  - `digitFrequency(ticks, window)` → array length 10
  - `matchesDiffers(ticks, digit, window)`
  - `overUnder(ticks, barrier, window)`
  - `overallSignal(...)` → `{ score, risk, action }`
  - Last digit derived from the tick quote string respecting `pip_size` to avoid float artifacts.
- UI built with existing shadcn components: `Card`, `Tabs`, `Select`, `Slider`, `Badge`, `Progress`, `Tooltip`. Charts via `recharts` (already part of shadcn `chart` setup).
- Visual layout (single page):

```text
┌─────────────────────────────────────────────────────────┐
│ Header: Symbol select • Window select • Connection dot   │
├──────────────┬──────────────────────────────────────────┤
│ Price chart  │ Overall signal card                       │
│              │  - Action: ENTER / WAIT / AVOID           │
│              │  - Confidence bar                         │
│              │  - Risk badge                             │
├──────────────┼──────────────────────────────────────────┤
│ Digit histogram (0–9)  │ Recent digits strip (last 50)   │
├──────────────┴──────────────────────────────────────────┤
│ Tabs: Even/Odd • Rise/Fall • Matches/Differs • Over/Under│
│  Each tab: counts, %, signal, supporting evidence       │
├─────────────────────────────────────────────────────────┤
│ Disclaimer footer (always visible)                       │
└─────────────────────────────────────────────────────────┘
```

- Disclaimer banner pinned at top and footer: outputs are probabilistic estimates, past behavior does not guarantee future results, not financial advice.

## Files to add/change

- Edit `src/routes/index.tsx` — replace placeholder with analyzer page + SEO head (title "Deriv Synthetic Indices Analyzer", description, og tags).
- Add `src/lib/deriv/ws.ts`
- Add `src/lib/deriv/analysis.ts`
- Add `src/lib/deriv/symbols.ts` (constant list of supported symbols + display names)
- Add `src/hooks/useDerivTicks.ts`
- Add `src/components/analyzer/` — `SignalCard.tsx`, `PriceChart.tsx`, `DigitHistogram.tsx`, `RecentDigits.tsx`, `EvenOddPanel.tsx`, `RiseFallPanel.tsx`, `MatchesDiffersPanel.tsx`, `OverUnderPanel.tsx`, `Disclaimer.tsx`
- No new npm packages required (recharts already available via shadcn ui chart). If chart import resolution fails at build, add `recharts` with `bun add`.

## Non-goals / explicit deferrals

- No Lovable Cloud, no Supabase, no server functions for this build.
- No real trading — token field is a UI placeholder, value never sent anywhere.
- Heavy statistics (Markov, Monte Carlo) and ML prediction shipped in a follow-up to keep this build focused.
