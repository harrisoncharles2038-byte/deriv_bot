import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ExternalLink, KeyRound, LogOut, ShieldCheck, Wallet, Activity, Settings2 } from "lucide-react";
import type { useDerivAccount } from "@/hooks/useDerivAccount";
import { cn } from "@/lib/utils";
import { buildOAuthUrl, getOAuthRedirectUrl } from "@/lib/deriv/oauth";

type Account = ReturnType<typeof useDerivAccount>;

export function DerivAccountPanel({ account }: { account: Account }) {
  const {
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
  } = account;
  const [token, setToken] = useState("");

  if (status !== "connected") {
    return (
      <Card className="glass-panel overflow-hidden border-primary/20 max-w-2xl mx-auto shadow-2xl relative">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-50 pointer-events-none" />
        <CardHeader className="text-center pb-8 pt-10">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4 ring-1 ring-primary/30 shadow-[0_0_15px_var(--color-primary)]">
            <KeyRound className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Connect your Account</CardTitle>
          <CardDescription className="text-sm mt-2 max-w-[80%] mx-auto">
            Link your Deriv account via OAuth or a secure API token to enable live automated trading and real-time portfolio tracking.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 pt-0 space-y-8 relative z-10">
          <div className="space-y-4">
            <Button
              size="lg"
              className="w-full text-md font-bold tracking-wide h-14 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary text-primary-foreground shadow-lg transition-all"
              onClick={() => {
                window.location.href = buildOAuthUrl();
              }}
            >
              Connect with Deriv (OAuth)
            </Button>
            <p className="text-xs text-center text-muted-foreground/80">
              Ensure redirect URL is <code className="font-mono text-primary/80 bg-primary/10 px-1 py-0.5 rounded">{getOAuthRedirectUrl()}</code> in Deriv Hub.
            </p>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-[#0c0c0c] px-4 text-muted-foreground font-semibold tracking-widest">
                Or Use API Token
              </span>
            </div>
          </div>

          <div className="space-y-4 p-5 rounded-xl border border-white/5 bg-black/20 backdrop-blur-sm">
            <p className="text-[11px] text-muted-foreground text-center">
              Requires an API token with <b className="text-foreground">Read</b> + <b className="text-foreground">Trade</b> scope. Admin scope is required to switch accounts seamlessly. 
              <br/>
              <a
                href="https://app.deriv.com/account/api-token"
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:text-primary/80 underline inline-flex items-center gap-1 mt-2 transition-colors"
              >
                Generate Token on Deriv <ExternalLink className="h-3 w-3" />
              </a>
            </p>
            <div className="flex flex-col gap-3 sm:flex-row pt-2">
              <Input
                type="password"
                autoComplete="off"
                placeholder="Paste API token here..."
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="font-mono h-12 bg-background/50 border-white/10 text-center sm:text-left focus-visible:ring-primary/50"
              />
              <Button 
                size="lg" 
                onClick={() => void connect(token)} 
                disabled={!token || status === "connecting"}
                className="h-12 px-8 min-w-[120px]"
              >
                {status === "connecting" ? "..." : "Connect"}
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-white/5 bg-black/10 p-4">
            <div className="space-y-0.5">
              <Label htmlFor="prefer-demo" className="text-sm font-medium">
                Prefer Virtual Account
              </Label>
              <p className="text-[10px] text-muted-foreground">Default to a demo account when connecting.</p>
            </div>
            <Switch
              id="prefer-demo"
              checked={settings.preferDemo}
              onCheckedChange={(v) => setSettings({ ...settings, preferDemo: v })}
            />
          </div>

          {error && (
            <div className="p-3 text-sm text-rose-500 bg-rose-500/10 border border-rose-500/20 rounded-lg text-center animate-in fade-in slide-in-from-top-2">
              {error}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  const isDemo = active?.is_virtual === 1;
  const demoAcct = accounts.find((a) => a.is_virtual === 1);
  const realAcct = accounts.find((a) => a.is_virtual === 0);
  const onToggleMode = (mode: "demo" | "real") => {
    const target = mode === "demo" ? demoAcct : realAcct;
    if (target && target.loginid !== active?.loginid) void switchAccount(target.loginid);
  };

  return (
    <Card className="glass-panel overflow-hidden border-primary/20 shadow-2xl relative">
      <div className={cn("absolute top-0 left-0 w-full h-1 opacity-50", isDemo ? "bg-amber-500" : "bg-emerald-500")} />
      
      <CardHeader className="pb-4 border-b border-white/5 bg-white/[0.02]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={cn("p-2 rounded-full", isDemo ? "bg-amber-500/10" : "bg-emerald-500/10")}>
              <ShieldCheck className={cn("h-5 w-5", isDemo ? "text-amber-500" : "text-emerald-500")} />
            </div>
            <div>
              <CardTitle className="text-lg">Account Connected</CardTitle>
              <div className="text-xs text-muted-foreground mt-0.5 font-mono">
                {active?.loginid}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="inline-flex rounded-lg border border-white/10 bg-black/20 p-1">
              <button
                type="button"
                disabled={!demoAcct}
                onClick={() => onToggleMode("demo")}
                className={cn(
                  "px-4 py-1.5 text-xs font-bold rounded-md transition-all uppercase tracking-wide",
                  isDemo
                    ? "bg-amber-500/20 text-amber-500 shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                  !demoAcct && "opacity-40 cursor-not-allowed",
                )}
              >
                Demo
              </button>
              <button
                type="button"
                disabled={!realAcct}
                onClick={() => onToggleMode("real")}
                className={cn(
                  "px-4 py-1.5 text-xs font-bold rounded-md transition-all uppercase tracking-wide",
                  !isDemo
                    ? "bg-emerald-500/20 text-emerald-500 shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                  !realAcct && "opacity-40 cursor-not-allowed",
                )}
                title={!realAcct ? "No real account linked to this token" : undefined}
              >
                Live
              </button>
            </div>
            
            <Button size="sm" variant="outline" onClick={disconnect} className="border-white/10 hover:bg-white/5">
              <LogOut className="mr-1.5 h-3.5 w-3.5 opacity-70" />
              Disconnect
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6 grid gap-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="rounded-xl border border-white/5 bg-black/20 p-4 space-y-1 relative overflow-hidden group">
            <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <Wallet className="w-16 h-16" />
            </div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Balance</div>
            <div className="flex items-end gap-2">
              <div className={cn("text-3xl font-bold font-mono tracking-tight", isDemo ? "text-amber-400" : "text-emerald-400")}>
                {balance != null ? balance.toFixed(2) : "—"}
              </div>
              <div className="text-sm font-semibold text-muted-foreground mb-1">{active?.currency}</div>
            </div>
          </div>

          <div className="rounded-xl border border-white/5 bg-black/20 p-4 space-y-2">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Active Account Profile</div>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className={cn("border-0 uppercase tracking-widest text-[10px]", isDemo ? "bg-amber-500/10 text-amber-500" : "bg-emerald-500/10 text-emerald-500")}>
                {isDemo ? "Virtual" : "Real Money"}
              </Badge>
              <Badge variant="outline" className="border-0 bg-primary/10 text-primary uppercase tracking-widest text-[10px]">
                {active?.currency} Base
              </Badge>
            </div>
            {accounts.length > 1 && (
              <Select value={active?.loginid} onValueChange={(v) => void switchAccount(v)}>
                <SelectTrigger className="h-8 mt-2 bg-background/50 border-white/10 text-xs font-mono">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.loginid} value={a.loginid} className="text-xs font-mono">
                      {a.loginid} ({a.is_virtual ? "demo" : "real"} · {a.currency})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="rounded-xl border border-white/5 bg-black/20 p-4 space-y-2 lg:col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-3">
              <Settings2 className="h-3.5 w-3.5" /> Global Trade Defaults
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Default Stake</Label>
                <Input
                  type="number"
                  min={0.35}
                  step={0.1}
                  value={settings.stake}
                  onChange={(e) =>
                    setSettings({ ...settings, stake: Math.max(0.35, Number(e.target.value) || 0) })
                  }
                  className="h-8 font-mono bg-background/50 border-white/10 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Confirm Buy</Label>
                <div className="h-8 flex items-center bg-background/50 border border-white/10 rounded-md px-3 justify-between">
                  <Switch
                    checked={settings.confirmBeforeBuy}
                    onCheckedChange={(v) => setSettings({ ...settings, confirmBeforeBuy: v })}
                    className="scale-75 origin-left"
                  />
                  <span className="text-[10px] text-muted-foreground">{settings.confirmBeforeBuy ? "ON" : "OFF"}</span>
                </div>
              </div>
              <div className="space-y-1 col-span-2 flex gap-2">
                <div className="flex-1">
                  <Label className="text-[10px] text-muted-foreground">Duration</Label>
                  <Input
                    type="number"
                    min={1}
                    step={1}
                    value={settings.duration}
                    onChange={(e) =>
                      setSettings({ ...settings, duration: Math.max(1, Number(e.target.value) || 1) })
                    }
                    className="h-8 font-mono bg-background/50 border-white/10 text-sm"
                  />
                </div>
                <div className="flex-1">
                  <Label className="text-[10px] text-muted-foreground">Unit</Label>
                  <Select
                    value={settings.durationUnit}
                    onValueChange={(v) =>
                      setSettings({ ...settings, durationUnit: v as "t" | "s" | "m" })
                    }
                  >
                    <SelectTrigger className="h-8 bg-background/50 border-white/10 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="t">Ticks</SelectItem>
                      <SelectItem value="s">Seconds</SelectItem>
                      <SelectItem value="m">Minutes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {!isDemo && (
          <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 p-3 flex items-center justify-center gap-2 text-rose-500 animate-pulse">
            <Activity className="h-4 w-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Live Real-Money Account Active. Orders execute with actual funds.</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
