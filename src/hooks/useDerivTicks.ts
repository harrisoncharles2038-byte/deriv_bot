import { useEffect, useRef, useState } from "react";
import { DerivClient, type Tick, type WsStatus } from "@/lib/deriv/ws";

const MAX_BUFFER = 500;

export function useDerivTicks(symbol: string) {
  const [ticks, setTicks] = useState<Tick[]>([]);
  const [status, setStatus] = useState<WsStatus>("idle");
  const clientRef = useRef<DerivClient | null>(null);

  useEffect(() => {
    setTicks([]);
    if (!symbol) {
      setStatus("idle");
      return;
    }
    const client = new DerivClient({
      onStatus: setStatus,
      onHistory: (history) => {
        setTicks(history.slice(-MAX_BUFFER));
      },
      onTick: (tick) => {
        setTicks((prev) => {
          const next =
            prev.length >= MAX_BUFFER ? prev.slice(prev.length - MAX_BUFFER + 1) : prev.slice();
          next.push(tick);
          return next;
        });
      },
    });
    clientRef.current = client;
    client.subscribe(symbol);
    return () => {
      client.close();
      clientRef.current = null;
    };
  }, [symbol]);

  return { ticks, status };
}
