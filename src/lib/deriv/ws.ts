export interface Tick {
  epoch: number;
  quote: number;
  quoteStr: string;
  lastDigit: number;
  pipSize: number;
}

export type WsStatus = "idle" | "connecting" | "open" | "closed" | "error";

const DERIV_WS_URL = "wss://ws.derivws.com/websockets/v3?app_id=1089";

export interface DerivClientOptions {
  onTick: (tick: Tick, symbol: string) => void;
  onStatus: (status: WsStatus) => void;
  onHistory?: (ticks: Tick[], symbol: string) => void;
}

export class DerivClient {
  private ws: WebSocket | null = null;
  private symbol: string | null = null;
  private pipSize = 2;
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private manualClose = false;

  constructor(private opts: DerivClientOptions) {}

  subscribe(symbol: string) {
    this.symbol = symbol;
    this.manualClose = false;
    this.connect();
  }

  private connect() {
    if (typeof window === "undefined") return;
    this.cleanupSocket();
    this.opts.onStatus("connecting");
    const ws = new WebSocket(DERIV_WS_URL);
    this.ws = ws;

    ws.onopen = () => {
      this.reconnectAttempt = 0;
      this.opts.onStatus("open");
      if (this.symbol) {
        ws.send(
          JSON.stringify({
            ticks_history: this.symbol,
            adjust_start_time: 1,
            count: 500,
            end: "latest",
            style: "ticks",
            subscribe: 1,
          }),
        );
      }
    };

    ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data as string);
        if (data.error) {
          console.error("Deriv error:", data.error);
          return;
        }
        if (data.msg_type === "history" && data.history) {
          const prices: string[] = data.history.prices;
          const times: number[] = data.history.times;
          this.pipSize = data.pip_size ?? this.pipSize;
          const ticks: Tick[] = prices.map((p, i) => this.toTick(p, times[i]));
          this.opts.onHistory?.(ticks, this.symbol!);
        } else if (data.msg_type === "tick" && data.tick) {
          const t = data.tick;
          this.pipSize = t.pip_size ?? this.pipSize;
          const tick = this.toTick(String(t.quote), t.epoch);
          this.opts.onTick(tick, this.symbol!);
        }
      } catch (e) {
        console.error("Parse error", e);
      }
    };

    ws.onerror = () => this.opts.onStatus("error");
    ws.onclose = () => {
      this.opts.onStatus("closed");
      if (!this.manualClose) this.scheduleReconnect();
    };
  }

  private toTick(quoteStr: string, epoch: number): Tick {
    // Ensure trailing decimals match pip_size for accurate last-digit extraction.
    const num = Number(quoteStr);
    const formatted = num.toFixed(this.pipSize);
    const lastDigit = Number(formatted[formatted.length - 1]);
    return {
      epoch,
      quote: num,
      quoteStr: formatted,
      lastDigit,
      pipSize: this.pipSize,
    };
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    const delay = Math.min(1000 * 2 ** this.reconnectAttempt, 15000);
    this.reconnectAttempt += 1;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  private cleanupSocket() {
    if (this.ws) {
      try {
        this.ws.onopen = null;
        this.ws.onmessage = null;
        this.ws.onerror = null;
        this.ws.onclose = null;
        if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
          this.ws.close();
        }
      } catch {
        // noop
      }
      this.ws = null;
    }
  }

  close() {
    this.manualClose = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.cleanupSocket();
  }
}
