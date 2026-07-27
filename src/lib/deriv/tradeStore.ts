export interface TradeRecord {
  id: number;
  contract_id: number;
  symbol: string;
  kind: string; // "MATCHES", "RISE", etc.
  stake: number;
  payout: number;
  profit: number;
  status: "open" | "won" | "lost";
  timestamp: number;
}

class TradeStore {
  private trades: TradeRecord[] = [];
  private listeners = new Set<() => void>();
  private nextId = 1;

  getTrades() {
    return this.trades;
  }

  addTrade(trade: Omit<TradeRecord, "id" | "timestamp">) {
    const record: TradeRecord = {
      ...trade,
      id: this.nextId++,
      timestamp: Date.now(),
    };
    this.trades = [record, ...this.trades];
    this.notify();
    return record.id;
  }

  updateTrade(contract_id: number, updates: Partial<TradeRecord>) {
    this.trades = this.trades.map((t) => (t.contract_id === contract_id ? { ...t, ...updates } : t));
    this.notify();
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    for (const l of this.listeners) {
      l();
    }
  }
}

export const globalTradeStore = new TradeStore();
