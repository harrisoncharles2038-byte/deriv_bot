import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { History, TrendingUp, AlertCircle, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { globalTradeStore, type TradeRecord } from "@/lib/deriv/tradeStore";
import { useDerivAccount } from "@/hooks/useDerivAccount";
import { cn } from "@/lib/utils";

export function TradeHistoryPanel() {
  const account = useDerivAccount();
  const currency = account.active?.currency ?? "USD";
  const [trades, setTrades] = useState<TradeRecord[]>([]);

  useEffect(() => {
    setTrades([...globalTradeStore.getTrades()]);
    const unsub = globalTradeStore.subscribe(() => {
      setTrades([...globalTradeStore.getTrades()]);
    });
    return unsub;
  }, []);

  const totalTrades = trades.length;
  const wonTrades = trades.filter((t) => t.status === "won").length;
  const lostTrades = trades.filter((t) => t.status === "lost").length;
  const winRate = totalTrades > 0 ? (wonTrades / (wonTrades + lostTrades)) * 100 : 0;
  
  const totalProfit = trades.reduce((acc, t) => acc + (t.profit || 0), 0);

  return (
    <Card className="glass-panel overflow-hidden border-primary/20">
      <CardHeader className="bg-primary/5 pb-4 border-b border-white/5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <History className="h-5 w-5 text-primary" />
            Live Trade History
          </CardTitle>
          <div className="flex gap-4">
            <div className="text-right">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Session P&L</div>
              <div className={cn("text-xl font-bold font-mono tracking-tight", totalProfit > 0 ? "text-emerald-500" : totalProfit < 0 ? "text-rose-500" : "")}>
                {totalProfit >= 0 ? "+" : ""}{totalProfit.toFixed(2)} {currency}
              </div>
            </div>
            <div className="text-right border-l border-white/10 pl-4">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Win Rate</div>
              <div className="text-xl font-bold font-mono tracking-tight text-primary">
                {totalTrades > 0 ? winRate.toFixed(1) + "%" : "0.0%"}
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        {trades.length === 0 ? (
          <div className="p-8 text-center flex flex-col items-center justify-center text-muted-foreground h-64">
            <AlertCircle className="h-8 w-8 mb-2 opacity-50" />
            <p>No trades executed in this session.</p>
            <p className="text-xs opacity-75 mt-1">Activate the Auto-Bot or place a manual trade to see history.</p>
          </div>
        ) : (
          <div className="max-h-[500px] overflow-auto">
            <Table>
              <TableHeader className="bg-black/20 sticky top-0 backdrop-blur-md">
                <TableRow className="border-white/5 hover:bg-transparent">
                  <TableHead className="w-[100px] text-[10px] uppercase tracking-wider">Time</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider">Symbol</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider">Strategy</TableHead>
                  <TableHead className="text-right text-[10px] uppercase tracking-wider">Stake</TableHead>
                  <TableHead className="text-right text-[10px] uppercase tracking-wider">Profit</TableHead>
                  <TableHead className="text-right text-[10px] uppercase tracking-wider">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trades.map((trade) => (
                  <TableRow key={trade.id} className="border-white/5 hover:bg-white/5 transition-colors">
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {new Date(trade.timestamp).toLocaleTimeString([], { hour12: false })}
                    </TableCell>
                    <TableCell className="font-mono text-xs font-semibold">{trade.symbol}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px] uppercase rounded-full">
                        {trade.kind}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {trade.stake.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      {trade.status === "open" ? (
                        <span className="text-xs text-muted-foreground font-mono">...</span>
                      ) : (
                        <div className={cn("flex items-center justify-end gap-1 font-mono text-xs font-bold", trade.profit > 0 ? "text-emerald-400" : "text-rose-400")}>
                          {trade.profit > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                          {trade.profit > 0 ? "+" : ""}{trade.profit.toFixed(2)}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {trade.status === "open" ? (
                        <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[10px] uppercase">Open</Badge>
                      ) : trade.status === "won" ? (
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px] uppercase">Won</Badge>
                      ) : (
                        <Badge variant="outline" className="bg-rose-500/10 text-rose-400 border-rose-500/20 text-[10px] uppercase">Lost</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
