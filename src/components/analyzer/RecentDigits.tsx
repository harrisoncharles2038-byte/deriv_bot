import type { Tick } from "@/lib/deriv/ws";
import { cn } from "@/lib/utils";

export function RecentDigits({ ticks }: { ticks: Tick[] }) {
  const recent = ticks.slice(-50);
  return (
    <div className="flex flex-wrap gap-1">
      {recent.map((t, i) => {
        const even = t.lastDigit % 2 === 0;
        return (
          <span
            key={`${t.epoch}-${i}`}
            className={cn(
              "inline-flex h-7 w-7 items-center justify-center rounded text-xs font-medium tabular-nums",
              even
                ? "bg-blue-500/15 text-blue-700 dark:text-blue-300"
                : "bg-orange-500/15 text-orange-700 dark:text-orange-300",
              i === recent.length - 1 && "ring-2 ring-foreground/40",
            )}
            title={`${t.quoteStr} @ ${new Date(t.epoch * 1000).toLocaleTimeString()}`}
          >
            {t.lastDigit}
          </span>
        );
      })}
      {recent.length === 0 && (
        <span className="text-xs text-muted-foreground">Waiting for ticks…</span>
      )}
    </div>
  );
}
