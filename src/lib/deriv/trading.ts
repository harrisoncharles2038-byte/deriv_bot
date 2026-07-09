// Deriv trading client. Holds a single WebSocket authorized with the user's
// API token (Read + Trade scope). All requests are tagged with `req_id` so we
// can resolve their responses individually. Token never leaves the browser
// except in the Deriv WebSocket itself.

const DERIV_WS_URL = "wss://ws.derivws.com/websockets/v3?app_id=1089";

export interface DerivAccount {
  loginid: string;
  currency: string;
  is_virtual: 0 | 1;
  balance?: number;
}

export interface ProposalRequest {
  contract_type: string; // DIGITMATCH, DIGITDIFF, DIGITEVEN, DIGITODD, DIGITOVER, DIGITUNDER, CALL, PUT
  symbol: string;
  amount: number; // stake
  currency: string;
  duration: number; // ticks
  duration_unit: "t" | "s" | "m";
  barrier?: string; // for digit/over/under contracts
  basis?: "stake" | "payout";
}

export interface ProposalResponse {
  id: string;
  ask_price: number;
  payout: number;
  spot: number;
  display_value: string;
  longcode: string;
}

export interface BuyResponse {
  contract_id: number;
  longcode: string;
  payout: number;
  buy_price: number;
  start_time: number;
  transaction_id: number;
}

type Pending = {
  resolve: (v: unknown) => void;
  reject: (e: Error) => void;
};

export class DerivTrader {
  private ws: WebSocket | null = null;
  private token: string;
  private nextReqId = 1;
  private pending = new Map<number, Pending>();
  private connectPromise: Promise<void> | null = null;
  private balanceListeners = new Set<(b: number, currency: string) => void>();
  private accountListeners = new Set<(a: DerivAccount) => void>();
  private currentAccount: DerivAccount | null = null;

  constructor(token: string) {
    this.token = token;
  }

  private async ensureOpen(): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) return;
    if (this.connectPromise) return this.connectPromise;
    this.connectPromise = new Promise((resolve, reject) => {
      try {
        const ws = new WebSocket(DERIV_WS_URL);
        this.ws = ws;
        ws.onopen = () => resolve();
        ws.onerror = () => reject(new Error("websocket error"));
        ws.onclose = () => {
          this.ws = null;
          this.connectPromise = null;
          for (const p of this.pending.values()) p.reject(new Error("connection closed"));
          this.pending.clear();
        };
        ws.onmessage = (ev) => this.handleMessage(ev);
      } catch (e) {
        reject(e as Error);
      }
    });
    return this.connectPromise;
  }

  private handleMessage(ev: MessageEvent) {
    let data: any;
    try {
      data = JSON.parse(ev.data as string);
    } catch {
      return;
    }
    // Subscription pushes (balance updates) have echo_req but a stable req_id.
    if (data.msg_type === "balance" && data.balance) {
      for (const l of this.balanceListeners) l(Number(data.balance.balance), data.balance.currency);
    }
    if (data.msg_type === "proposal_open_contract") {
      for (const l of this.contractListeners) l(data);
    }
    const reqId: number | undefined = data.req_id;
    if (reqId == null) return;
    const p = this.pending.get(reqId);
    if (!p) return;
    // Contract subscription pushes reuse the same req_id; don't reject-on-error
    // the initial ack, just resolve once and let contractListeners handle updates.
    // For balance subscription we keep the listener but resolve once.
    if (data.error) {
      p.reject(new Error(data.error.message || "deriv error"));
      this.pending.delete(reqId);
      return;
    }
    p.resolve(data);
    this.pending.delete(reqId);
  }

  private send<T = any>(payload: Record<string, unknown>): Promise<T> {
    return new Promise(async (resolve, reject) => {
      try {
        await this.ensureOpen();
      } catch (e) {
        return reject(e as Error);
      }
      const req_id = this.nextReqId++;
      this.pending.set(req_id, { resolve: resolve as (v: unknown) => void, reject });
      const timer = setTimeout(() => {
        if (this.pending.has(req_id)) {
          this.pending.delete(req_id);
          reject(new Error("request timeout"));
        }
      }, 20000);
      const wrap = (v: unknown) => {
        clearTimeout(timer);
        resolve(v as T);
      };
      this.pending.set(req_id, { resolve: wrap as (v: unknown) => void, reject });
      this.ws!.send(JSON.stringify({ ...payload, req_id }));
    });
  }

  async authorize(): Promise<{ accounts: DerivAccount[]; loginid: string; currency: string }> {
    const res = await this.send<any>({ authorize: this.token });
    const a = res.authorize;
    const accounts: DerivAccount[] = (a.account_list ?? []).map((x: any) => ({
      loginid: x.loginid,
      currency: x.currency,
      is_virtual: x.is_virtual,
    }));
    this.currentAccount = {
      loginid: a.loginid,
      currency: a.currency,
      is_virtual: a.is_virtual,
      balance: Number(a.balance),
    };
    for (const l of this.accountListeners) l(this.currentAccount);
    return { accounts, loginid: a.loginid, currency: a.currency };
  }

  async switchAccount(loginid: string): Promise<void> {
    // Authorize-by-loginid requires admin token; fall back to re-authorize
    // selecting that loginid via the dedicated endpoint when available.
    await this.send({ authorize: this.token, add_to_login_history: 0 });
    // Then pick the desired loginid:
    const res = await this.send<any>({ authorize: this.token, loginid });
    const a = res.authorize;
    this.currentAccount = {
      loginid: a.loginid,
      currency: a.currency,
      is_virtual: a.is_virtual,
      balance: Number(a.balance),
    };
    for (const l of this.accountListeners) l(this.currentAccount);
  }

  async subscribeBalance(): Promise<void> {
    await this.send({ balance: 1, subscribe: 1 });
  }

  onBalance(cb: (balance: number, currency: string) => void): () => void {
    this.balanceListeners.add(cb);
    return () => this.balanceListeners.delete(cb);
  }

  onAccount(cb: (a: DerivAccount) => void): () => void {
    this.accountListeners.add(cb);
    if (this.currentAccount) cb(this.currentAccount);
    return () => this.accountListeners.delete(cb);
  }

  async proposal(req: ProposalRequest): Promise<ProposalResponse> {
    const r = await this.send<any>({
      proposal: 1,
      contract_type: req.contract_type,
      symbol: req.symbol,
      amount: req.amount,
      currency: req.currency,
      duration: req.duration,
      duration_unit: req.duration_unit,
      basis: req.basis ?? "stake",
      ...(req.barrier !== undefined ? { barrier: req.barrier } : {}),
    });
    return r.proposal as ProposalResponse;
  }

  async buy(proposalId: string, price: number): Promise<BuyResponse> {
    const r = await this.send<any>({ buy: proposalId, price });
    return r.buy as BuyResponse;
  }

  /**
   * Subscribe to a contract's lifecycle. Invokes `onUpdate` on each push
   * (including the final settlement where `is_sold=1`). Returns an unsubscribe
   * function.
   */
  subscribeContract(contractId: number, onUpdate: (c: any) => void): () => void {
    const req_id = this.nextReqId++;
    const handler = (data: any) => {
      if (data.req_id !== req_id) return;
      if (data.msg_type === "proposal_open_contract" && data.proposal_open_contract) {
        onUpdate(data.proposal_open_contract);
      }
    };
    this.contractListeners.add(handler);
    void this.ensureOpen().then(() => {
      this.ws?.send(JSON.stringify({ proposal_open_contract: 1, contract_id: contractId, subscribe: 1, req_id }));
    });
    return () => {
      this.contractListeners.delete(handler);
      try {
        this.ws?.send(JSON.stringify({ forget: req_id }));
      } catch { /* noop */ }
    };
  }

  private contractListeners = new Set<(data: any) => void>();

  close() {
    try {
      this.ws?.close();
    } catch {
      // noop
    }
    this.ws = null;
  }
}

/** Maps app contract names to Deriv API contract_type codes. */
export function contractTypeFor(kind: "MATCHES" | "DIFFERS" | "EVEN" | "ODD" | "OVER" | "UNDER" | "RISE" | "FALL"): string {
  switch (kind) {
    case "MATCHES": return "DIGITMATCH";
    case "DIFFERS": return "DIGITDIFF";
    case "EVEN": return "DIGITEVEN";
    case "ODD": return "DIGITODD";
    case "OVER": return "DIGITOVER";
    case "UNDER": return "DIGITUNDER";
    case "RISE": return "CALL";
    case "FALL": return "PUT";
  }
}