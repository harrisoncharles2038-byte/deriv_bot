import { useCallback, useEffect, useRef, useState } from "react";
import { DerivTrader, type DerivAccount } from "@/lib/deriv/trading";

const TOKEN_KEY = "deriv.apiToken";
const SETTINGS_KEY = "deriv.tradeSettings";

export interface TradeSettings {
  stake: number;
  currency: string;
  duration: number;
  durationUnit: "t" | "s" | "m";
  preferDemo: boolean;
  confirmBeforeBuy: boolean;
}

const DEFAULT_SETTINGS: TradeSettings = {
  stake: 1,
  currency: "USD",
  duration: 5,
  durationUnit: "t",
  preferDemo: true,
  confirmBeforeBuy: true,
};

export type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error";

export function useDerivAccount() {
  const traderRef = useRef<DerivTrader | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [error, setError] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<DerivAccount[]>([]);
  const [active, setActive] = useState<DerivAccount | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [settings, setSettings] = useState<TradeSettings>(DEFAULT_SETTINGS);

  // Load persisted state on mount.
  useEffect(() => {
    try {
      const t = localStorage.getItem(TOKEN_KEY);
      if (t) setTokenState(t);
      const s = localStorage.getItem(SETTINGS_KEY);
      if (s) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(s) });
    } catch {
      // ignore
    }
  }, []);

  // Persist settings.
  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      // ignore
    }
  }, [settings]);

  const connect = useCallback(async (rawToken: string, preferDemoOverride?: boolean) => {
    const t = rawToken.trim();
    if (!t) return;
    setStatus("connecting");
    setError(null);
    try {
      traderRef.current?.close();
      const trader = new DerivTrader(t);
      traderRef.current = trader;
      const { accounts: acc } = await trader.authorize();
      setAccounts(acc);
      const preferDemo = preferDemoOverride ?? settings.preferDemo;
      const demo = acc.find((a) => a.is_virtual === 1);
      const real = acc.find((a) => a.is_virtual === 0);
      const target = preferDemo ? demo ?? real : real ?? demo;
      if (target) {
        try {
          await trader.switchAccount(target.loginid);
        } catch {
          // ignore — first authorize may already be on the right account
        }
      }
      trader.onAccount((a) => {
        setActive(a);
        if (typeof a.balance === "number") setBalance(a.balance);
        setSettings((prev) => (a.currency && prev.currency !== a.currency ? { ...prev, currency: a.currency } : prev));
      });
      trader.onBalance((b) => setBalance(b));
      await trader.subscribeBalance();
      localStorage.setItem(TOKEN_KEY, t);
      setTokenState(t);
      setStatus("connected");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      setStatus("error");
    }
  }, [settings.preferDemo]);

  const disconnect = useCallback(() => {
    traderRef.current?.close();
    traderRef.current = null;
    localStorage.removeItem(TOKEN_KEY);
    setTokenState(null);
    setAccounts([]);
    setActive(null);
    setBalance(null);
    setStatus("disconnected");
  }, []);

  const switchAccount = useCallback(async (loginid: string) => {
    if (!traderRef.current) return;
    try {
      await traderRef.current.switchAccount(loginid);
      await traderRef.current.subscribeBalance();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  // Auto-reconnect if a token is persisted.
  useEffect(() => {
    if (token && status === "disconnected") {
      void connect(token);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return {
    trader: traderRef,
    status,
    error,
    accounts,
    active,
    balance,
    settings,
    setSettings,
    connect,
    disconnect,
    switchAccount,
  };
}