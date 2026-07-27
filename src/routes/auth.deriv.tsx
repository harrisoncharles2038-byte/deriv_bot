import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { parseOAuthCallback, pickOAuthToken } from "@/lib/deriv/oauth";

export const Route = createFileRoute("/auth/deriv")({
  head: () => ({
    meta: [{ title: "Connecting Deriv…" }],
  }),
  component: DerivOAuthCallback,
});

function DerivOAuthCallback() {
  const navigate = useNavigate();
  const [msg, setMsg] = useState("Connecting your Deriv account…");

  useEffect(() => {
    try {
      const accts = parseOAuthCallback(window.location.search, window.location.hash);
      if (accts.length === 0) {
        setMsg("No account tokens found in the redirect URL. Returning home…");
        const t = setTimeout(() => navigate({ to: "/" }), 1500);
        return () => clearTimeout(t);
      }
      let preferDemo = true;
      try {
        const raw = localStorage.getItem("deriv.tradeSettings");
        if (raw) preferDemo = !!JSON.parse(raw).preferDemo;
      } catch {
        // ignore
      }
      const chosen = pickOAuthToken(accts, preferDemo);
      if (chosen) {
        localStorage.setItem("deriv.apiToken", chosen.token);
        localStorage.setItem("deriv.oauthAccounts", JSON.stringify(accts));
      }
      setMsg("Connected. Redirecting…");
      const t = setTimeout(() => navigate({ to: "/" }), 400);
      return () => clearTimeout(t);
    } catch (e) {
      setMsg("Failed to parse OAuth response: " + (e instanceof Error ? e.message : String(e)));
    }
  }, [navigate]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="rounded-lg border bg-card p-6 text-center">
        <h1 className="text-base font-semibold">Deriv OAuth</h1>
        <p className="mt-2 text-sm text-muted-foreground">{msg}</p>
      </div>
    </main>
  );
}
