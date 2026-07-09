import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ExternalLink, KeyRound, LogOut, ShieldCheck, Wallet } from "lucide-react";
import type { useDerivAccount } from "@/hooks/useDerivAccount";
import { cn } from "@/lib/utils";
import { buildOAuthUrl, getOAuthRedirectUrl } from "@/lib/deriv/oauth";

type Account = ReturnType<typeof useDerivAccount>;

export function DerivAccountPanel({ account }: { account: Account }) {
  const { status, error, accounts, active, balance, settings, setSettings, connect, disconnect, switchAccount } = account;
  const [token, setToken] = useState("");

  if (status !== "connected") {
    return (
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Connect your Deriv account</h3>
          <Badge variant="outline" className="border-0 bg-muted text-[10px]">OAuth or API token</Badge>
        </div>
        <Button
          className="w-full"
          onClick={() => { window.location.href = buildOAuthUrl(); }}
        >
          Connect with Deriv (OAuth)
        </Button>
        <p className="text-[11px] text-muted-foreground">
          Make sure this app's redirect URL is set to{" "}
          <code className="font-mono">{getOAuthRedirectUrl()}</code> in your Deriv app dashboard.
        </p>
        <div className="flex items-center gap-2 py-1 text-[10px] uppercase tracking-wide text-muted-foreground">
          <div className="h-px flex-1 bg-border" /> or paste a token <div className="h-px flex-1 bg-border" />
        </div>
        <p className="text-xs text-muted-foreground">
          Paste an API token with <b>Read</b> + <b>Trade</b> scope (Admin if you want to switch accounts). Get one at{" "}
          <a href="https://app.deriv.com/account/api-token" target="_blank" rel="noreferrer" className="text-primary underline inline-flex items-center gap-0.5">
            app.deriv.com/account/api-token <ExternalLink className="h-3 w-3" />
          </a>
          . The token is stored only in your browser.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            type="password"
            autoComplete="off"
            placeholder="Deriv API token"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="font-mono"
          />
          <Button onClick={() => void connect(token)} disabled={!token || status === "connecting"}>
            {status === "connecting" ? "Connecting…" : "Connect"}
          </Button>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-md border bg-muted/30 p-2">
          <Label htmlFor="prefer-demo" className="text-xs">Prefer demo (virtual) account</Label>
          <Switch
            id="prefer-demo"
            checked={settings.preferDemo}
            onCheckedChange={(v) => setSettings({ ...settings, preferDemo: v })}
          />
        </div>
        {error && <div className="text-xs text-rose-600 dark:text-rose-400">Error: {error}</div>}
      </div>
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
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          <h3 className="text-sm font-semibold">Deriv connected</h3>
          <Badge variant="outline" className={cn("border-0 text-[10px]", isDemo ? "bg-amber-500/15 text-amber-700 dark:text-amber-300" : "bg-rose-500/15 text-rose-700 dark:text-rose-300")}>
            {isDemo ? "DEMO" : "REAL MONEY"}
          </Badge>
        </div>
        <Button size="sm" variant="ghost" onClick={disconnect}>
          <LogOut className="mr-1.5 h-3.5 w-3.5" />
          Disconnect
        </Button>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-md border bg-muted/20 p-2">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Account mode
        </div>
        <div className="inline-flex rounded-md border bg-background p-0.5">
          <button
            type="button"
            disabled={!demoAcct}
            onClick={() => onToggleMode("demo")}
            className={cn(
              "px-3 py-1 text-xs font-medium rounded-sm transition-colors",
              isDemo ? "bg-amber-500/20 text-amber-700 dark:text-amber-300" : "text-muted-foreground hover:text-foreground",
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
              "px-3 py-1 text-xs font-medium rounded-sm transition-colors",
              !isDemo ? "bg-rose-500/20 text-rose-700 dark:text-rose-300" : "text-muted-foreground hover:text-foreground",
              !realAcct && "opacity-40 cursor-not-allowed",
            )}
            title={!realAcct ? "No real account linked to this token" : undefined}
          >
            Live
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-md border bg-muted/20 p-2">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Account</div>
          {accounts.length > 1 ? (
            <Select value={active?.loginid} onValueChange={(v) => void switchAccount(v)}>
              <SelectTrigger className="h-8 mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.loginid} value={a.loginid}>
                    {a.loginid} ({a.is_virtual ? "demo" : "real"} · {a.currency})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="font-mono text-sm">{active?.loginid}</div>
          )}
        </div>
        <div className="rounded-md border bg-muted/20 p-2">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Balance</div>
          <div className="flex items-center gap-1.5 font-mono text-base font-semibold tabular-nums">
            <Wallet className="h-3.5 w-3.5 text-muted-foreground" />
            {balance != null ? balance.toFixed(2) : "—"} {active?.currency}
          </div>
        </div>
        <div className="rounded-md border bg-muted/20 p-2">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Currency</div>
          <div className="font-mono text-sm">{active?.currency ?? "—"}</div>
        </div>
      </div>

      <div className="rounded-md border bg-muted/10 p-3">
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Trade settings
        </div>
        <div className="grid gap-3 sm:grid-cols-4">
          <div>
            <Label className="text-[10px]">Stake</Label>
            <Input
              type="number"
              min={0.35}
              step={0.1}
              value={settings.stake}
              onChange={(e) => setSettings({ ...settings, stake: Math.max(0.35, Number(e.target.value) || 0) })}
              className="h-8 font-mono"
            />
          </div>
          <div>
            <Label className="text-[10px]">Duration</Label>
            <Input
              type="number"
              min={1}
              step={1}
              value={settings.duration}
              onChange={(e) => setSettings({ ...settings, duration: Math.max(1, Number(e.target.value) || 1) })}
              className="h-8 font-mono"
            />
          </div>
          <div>
            <Label className="text-[10px]">Unit</Label>
            <Select value={settings.durationUnit} onValueChange={(v) => setSettings({ ...settings, durationUnit: v as "t" | "s" | "m" })}>
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="t">ticks</SelectItem>
                <SelectItem value="s">seconds</SelectItem>
                <SelectItem value="m">minutes</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-[10px]">Confirm before buy</Label>
            <div className="flex h-8 items-center">
              <Switch
                checked={settings.confirmBeforeBuy}
                onCheckedChange={(v) => setSettings({ ...settings, confirmBeforeBuy: v })}
              />
            </div>
          </div>
        </div>
        {!isDemo && (
          <p className="mt-2 text-[11px] text-rose-600 dark:text-rose-400">
            ⚠ REAL-MONEY account selected. Each buy click places a live order.
          </p>
        )}
      </div>
    </div>
  );
}