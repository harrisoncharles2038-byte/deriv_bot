import { LineChart, Line, ResponsiveContainer, YAxis, Tooltip } from "recharts";
import type { Tick } from "@/lib/deriv/ws";

export function PriceChart({ ticks }: { ticks: Tick[] }) {
  const data = ticks.slice(-150).map((t, i) => ({ i, quote: t.quote }));
  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <YAxis
            domain={["dataMin", "dataMax"]}
            hide={false}
            width={60}
            tick={{ fontSize: 10 }}
            tickFormatter={(v) => Number(v).toFixed(2)}
          />
          <Tooltip
            contentStyle={{ fontSize: 12 }}
            formatter={(v: number) => v.toFixed(4)}
            labelFormatter={() => ""}
          />
          <Line
            type="monotone"
            dataKey="quote"
            stroke="hsl(220 90% 56%)"
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}